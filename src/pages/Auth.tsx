import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Mail, Lock, User, LogIn, UserPlus, Building2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { logAudit, loginBlockSeconds, recordLoginAttempt } from '@/utils/audit';
import { useToast } from '@/hooks/use-toast';
import { AppRole, ROLE_LABEL } from '@/hooks/usePermissions';

const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(128, 'Senha muito longa'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(120, 'Nome muito longo'),
  companyName: z.string().trim().min(2, 'Informe o nome da empresa').max(120, 'Nome da empresa muito longo'),
});

const inviteSignupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(120, 'Nome muito longo'),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [localMfaFactorId, setLocalMfaFactorId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, user, session, mfaFactorId, createOfflineUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('convite');
  const [invite, setInvite] = useState<{ company_name: string; email: string; role: string; valid: boolean } | null>(null);
  const activeMfaFactorId = localMfaFactorId ?? mfaFactorId;

  useEffect(() => {
    if (!inviteToken) return;
    setIsLogin(false);
    (async () => {
      const { data } = await supabase.rpc('get_invite_info' as any, { _token: inviteToken });
      const info = Array.isArray(data) ? data[0] : data;
      if (info) {
        setInvite(info as any);
        if ((info as any).email) setEmail((info as any).email);
      }
    })();
  }, [inviteToken]);

  useEffect(() => {
    if (activeMfaFactorId && session?.user.email) setEmail(session.user.email);
  }, [activeMfaFactorId, session]);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const verifyMfa = async () => {
    if (!activeMfaFactorId) return;
    if (!/^\d{6}$/.test(mfaCode)) {
      setErrors({ mfaCode: 'Digite o código de 6 dígitos.' });
      return;
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: activeMfaFactorId,
      code: mfaCode,
    });
    if (error) {
      await recordLoginAttempt(email, false);
      setErrors({ mfaCode: 'Código inválido ou expirado. Confira o aplicativo e tente novamente.' });
      setMfaCode('');
      return;
    }

    await logAudit('auth.login', { description: 'Entrou no sistema com verificação em 2 etapas' });
    setMfaCode('');
    setLocalMfaFactorId(null);
    toast({ title: 'Verificação concluída!', description: 'Login realizado com segurança.' });
  };

  const cancelMfa = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLocalMfaFactorId(null);
    setMfaCode('');
    setPassword('');
    setErrors({});
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (activeMfaFactorId) {
        await verifyMfa();
        return;
      }

      if (isLogin) {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          return;
        }

        const normalizedEmail = result.data.email.toLowerCase();
        const blockedSeconds = await loginBlockSeconds(normalizedEmail);
        if (blockedSeconds > 0) {
          setErrors({
            password: `Muitas tentativas incorretas. Aguarde ${Math.ceil(blockedSeconds / 60)} minuto(s) e tente novamente.`,
          });
          return;
        }

        const signInResult = await signIn(normalizedEmail, result.data.password);
        if (signInResult.error) {
          await recordLoginAttempt(normalizedEmail, false);
          return;
        }

        await recordLoginAttempt(normalizedEmail, true);
        if (signInResult.mfaRequired && signInResult.factorId) {
          setLocalMfaFactorId(signInResult.factorId);
          setPassword('');
          setMfaCode('');
          return;
        }

        await logAudit('auth.login', { description: 'Entrou no sistema' });
      } else {
        const result = invite?.valid
          ? inviteSignupSchema.safeParse({ email, password, fullName })
          : signupSchema.safeParse({ email, password, fullName, companyName });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          return;
        }

        const signupData = result.data as { email: string; password: string; fullName: string; companyName?: string };
        const { error } = await signUp(
          signupData.email.toLowerCase(),
          signupData.password,
          signupData.fullName,
          signupData.companyName ?? '',
          invite?.valid ? inviteToken ?? undefined : undefined,
        );
        if (!error) {
          setIsLogin(true);
          setPassword('');
          setFullName('');
          setCompanyName('');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden bg-white shadow-glow mb-4">
              <img src="/logo-mercadopdv.png" alt="MercadoPDV" className="h-full w-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold">MercadoPDV</h1>
            <p className="text-center text-muted-foreground">
              {activeMfaFactorId
                ? 'Confirme sua identidade para concluir a entrada'
                : isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
              {!navigator.onLine && <span className="block text-xs text-yellow-600 mt-1">🔸 Modo Offline</span>}
            </p>
          </div>

          {invite && !activeMfaFactorId && (
            <div className={`mb-4 rounded-lg border p-3 text-sm ${invite.valid ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
              {invite.valid ? (
                <>
                  Você foi convidado para <strong>{invite.company_name}</strong> como{' '}
                  <strong>{ROLE_LABEL[invite.role as AppRole] ?? invite.role}</strong>. Crie sua senha para entrar.
                </>
              ) : (
                <>Este convite é inválido ou expirou. Peça um novo link ao administrador.</>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {activeMfaFactorId ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-primary/5 p-4 text-sm">
                  <p className="font-medium">Verificação em 2 etapas</p>
                  <p className="mt-1 text-muted-foreground">
                    Abra o aplicativo autenticador cadastrado para <strong>{email}</strong> e informe o código atual.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-mfa-code">Código de 6 dígitos</Label>
                  <Input
                    id="login-mfa-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.5em]"
                    autoFocus
                  />
                  {errors.mfaCode && <p role="alert" className="text-sm text-destructive">{errors.mfaCode}</p>}
                </div>
              </div>
            ) : (
              <>
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        autoComplete="name"
                        maxLength={120}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome"
                        className="pl-10"
                      />
                    </div>
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>
                )}

                {!isLogin && !invite?.valid && (
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="companyName"
                        type="text"
                        autoComplete="organization"
                        maxLength={120}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Nome do seu mercado"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Sua empresa terá dados totalmente separados de outras empresas.</p>
                    {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      maxLength={255}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-10"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                    />
                  </div>
                  {errors.password && <p role="alert" className="text-sm text-destructive">{errors.password}</p>}
                </div>
              </>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading || (activeMfaFactorId !== null && mfaCode.length !== 6)}>
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
              ) : activeMfaFactorId ? (
                <><ShieldCheck className="mr-2 h-5 w-5" />Confirmar código</>
              ) : isLogin ? (
                <><LogIn className="mr-2 h-5 w-5" />Entrar</>
              ) : (
                <><UserPlus className="mr-2 h-5 w-5" />Criar Conta</>
              )}
            </Button>
          </form>

          {activeMfaFactorId ? (
            <div className="mt-6 text-center">
              <button type="button" onClick={cancelMfa} disabled={loading} className="text-sm text-muted-foreground hover:text-primary">
                Usar outra conta
              </button>
            </div>
          ) : (
            <>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Ao criar uma conta você aceita os <Link to="/termos" className="underline hover:text-primary">Termos de Uso</Link> e a{' '}
                <Link to="/privacidade" className="underline hover:text-primary">Política de Privacidade</Link>.
              </p>
              <div className="mt-6 text-center space-y-3">
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setErrors({}); }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isLogin ? (
                    <>Não tem conta? <span className="font-medium text-primary">Cadastre-se</span></>
                  ) : (
                    <>Já tem conta? <span className="font-medium text-primary">Entrar</span></>
                  )}
                </button>

                {!navigator.onLine && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Modo Offline</p>
                    <button type="button" onClick={createOfflineUser} className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md hover:bg-yellow-200">
                      Criar Usuário Demo Offline
                    </button>
                    <p className="text-xs text-muted-foreground mt-1">admin@mercadinho.com / admin123</p>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
