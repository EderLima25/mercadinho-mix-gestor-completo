import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OfflineAuth } from '@/utils/offlineAuth';
import { getCompanyId, setCachedCompanyId, getCachedCompanyId } from '@/utils/tenant';
import { logAudit } from '@/utils/audit';

interface SignInResult {
  error: Error | null;
  mfaRequired?: boolean;
  factorId?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isOfflineMode: boolean;
  companyId: string | null;
  companyName: string | null;
  mfaFactorId: string | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string, fullName: string, companyName: string, inviteToken?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  createOfflineUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(getCachedCompanyId());
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const { toast } = useToast();
  const offlineAuth = OfflineAuth.getInstance();

  const syncSession = async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      setSession(null);
      setUser(null);
      setMfaFactorId(null);
      setLoading(false);
      return;
    }

    const { data: assurance, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }

    if (assurance.nextLevel === 'aal2' && assurance.currentLevel === 'aal1') {
      const { data } = await supabase.auth.mfa.listFactors();
      const factor = data?.totp.find((item) => item.status === 'verified');
      setSession(nextSession);
      setMfaFactorId(factor?.id ?? null);
      setUser(null);
      setLoading(false);
      return;
    }

    setMfaFactorId(null);
    setSession(nextSession);
    setUser(nextSession.user);
    offlineAuth.saveSession(nextSession.user);
    setLoading(false);
  };

  useEffect(() => {
    const initAuth = async () => {
      if (navigator.onLine) {
        // Online: use Supabase auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, nextSession) => {
            setIsOfflineMode(false);
            if (event === 'SIGNED_OUT') {
              void syncSession(null);
              return;
            }
            // Chamadas de autenticação fora do retorno do evento evitam bloqueio interno.
            if (nextSession) {
              setTimeout(() => { void syncSession(nextSession); }, 0);
            } else {
              void syncSession(null);
            }
          }
        );

        // Check for existing session
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        await syncSession(existingSession);

        return () => subscription.unsubscribe();
      } else {
        // Offline: check for saved session
        const savedUser = offlineAuth.getSession();
        if (savedUser) {
          setUser(savedUser as User);
          setIsOfflineMode(true);
          toast({
            title: 'Modo Offline',
            description: 'Usando sessão salva localmente.',
          });
        }
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Load the tenant (company) of the signed-in user
  useEffect(() => {
    let active = true;
    const loadCompany = async () => {
      if (!user) {
        setCompanyId(null);
        setCompanyName(null);
        return;
      }
      try {
        const id = await getCompanyId();
        if (!active) return;
        setCompanyId(id);
        const { data } = await supabase
          .from('companies')
          .select('name')
          .eq('id', id)
          .maybeSingle();
        if (active) setCompanyName(data?.name ?? null);
      } catch {
        // offline or profile not ready yet
      }
    };
    loadCompany();
    return () => { active = false; };
  }, [user]);

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = async () => {
      if (isOfflineMode && user) {
        // Try to restore online session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          setUser(session.user);
          setIsOfflineMode(false);
          toast({
            title: 'Reconectado!',
            description: 'Sessão online restaurada.',
          });
        }
      }
    };

    const handleOffline = () => {
      if (user) {
        setIsOfflineMode(true);
        toast({
          title: 'Modo Offline',
          description: 'Continuando com sessão local.',
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOfflineMode, user]);

  const signIn = async (email: string, password: string) => {
    if (navigator.onLine) {
      // Online login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: 'Erro ao entrar',
          description: error.message === 'Invalid login credentials' 
            ? 'Email ou senha incorretos' 
            : error.message,
          variant: 'destructive',
        });
        return { error };
      }
      
      const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) {
        toast({ title: 'Não foi possível verificar a segurança da conta', variant: 'destructive' });
        return { error: assuranceError };
      }

      if (assurance.nextLevel === 'aal2' && assurance.currentLevel === 'aal1') {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        const factor = factors?.totp.find((item) => item.status === 'verified');
        if (factorsError || !factor) {
          const mfaError = factorsError ?? new Error('Aplicativo autenticador não encontrado');
          toast({ title: 'Não foi possível carregar a verificação em 2 etapas', variant: 'destructive' });
          return { error: mfaError };
        }
        setSession(data.session);
        setMfaFactorId(factor.id);
        setUser(null);
        return { error: null, mfaRequired: true, factorId: factor.id };
      }

      await syncSession(data.session);
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      return { error: null, mfaRequired: false };
    } else {
      // Offline login
      const offlineUser = offlineAuth.verifyOfflineCredentials(email, password);
      if (offlineUser) {
        setUser(offlineUser as User);
        setIsOfflineMode(true);
        offlineAuth.saveSession(offlineUser);
        
        toast({
          title: 'Bem-vindo! (Offline)',
          description: 'Login offline realizado com sucesso.',
        });
        return { error: null };
      } else {
        const error = new Error('Credenciais offline não encontradas ou incorretas');
        toast({
          title: 'Erro ao entrar (Offline)',
          description: 'Credenciais não encontradas. Conecte-se à internet para fazer login pela primeira vez.',
          variant: 'destructive',
        });
        return { error };
      }
    }
  };

  const signUp = async (email: string, password: string, fullName: string, companyName: string, inviteToken?: string) => {
    if (!navigator.onLine) {
      const error = new Error('Cadastro requer conexão com internet');
      toast({
        title: 'Sem conexão',
        description: 'É necessário estar online para criar uma conta.',
        variant: 'destructive',
      });
      return { error };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          company_name: companyName,
          invite_token: inviteToken ?? '',
        },
      },
    });

    if (error) {
      let message = error.message;
      if (error.message.includes('already registered')) {
        message = 'Este email já está cadastrado';
      }
      toast({
        title: 'Erro ao cadastrar',
        description: message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({
      title: 'Conta criada!',
      description: 'Você já pode fazer login.',
    });
    return { error: null };
  };

  const signOut = async () => {
    if (navigator.onLine && session && user) {
      await logAudit('auth.logout', { description: 'Saiu do sistema' });
      await supabase.auth.signOut();
    }
    
    // Clear offline session
    offlineAuth.clearSession();
    setCachedCompanyId(null);
    setCompanyId(null);
    setCompanyName(null);
    setMfaFactorId(null);
    setUser(null);
    setSession(null);
    setIsOfflineMode(false);
    
    toast({
      title: 'Até logo!',
      description: 'Você saiu do sistema.',
    });
  };

  const createOfflineUser = () => {
    const demoUser = offlineAuth.createOfflineUser();
    toast({
      title: 'Usuário offline criado!',
      description: 'Use: admin@mercadinho.com / admin123',
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isOfflineMode,
      companyId,
      companyName,
      mfaFactorId,
      signIn, 
      signUp, 
      signOut,
      createOfflineUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
