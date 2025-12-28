import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OfflineAuth } from '@/utils/offlineAuth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isOfflineMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  createOfflineUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const { toast } = useToast();
  const offlineAuth = OfflineAuth.getInstance();

  useEffect(() => {
    const initAuth = async () => {
      if (navigator.onLine) {
        // Online: use Supabase auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsOfflineMode(false);
            
            // Save credentials for offline use when user logs in
            if (event === 'SIGNED_IN' && session?.user) {
              offlineAuth.saveSession(session.user);
            }
            
            setLoading(false);
          }
        );

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

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
      const { error } = await supabase.auth.signInWithPassword({
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
      
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      return { error: null };
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

  const signUp = async (email: string, password: string, fullName: string) => {
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
    if (navigator.onLine && session) {
      await supabase.auth.signOut();
    }
    
    // Clear offline session
    offlineAuth.clearSession();
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
