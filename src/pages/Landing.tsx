import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ShoppingCart,
  Package,
  BarChart3,
  DollarSign,
  CloudOff,
  Printer,
  QrCode,
  Users,
  Check,
} from 'lucide-react';
import { BILLING, formatBRL } from '@/config/billing';

const features = [
  { icon: ShoppingCart, title: 'PDV rápido', text: 'Venda por código de barras, com pagamento combinado em dinheiro, cartão e PIX.' },
  { icon: Package, title: 'Estoque sob controle', text: 'Cadastro de produtos, fornecedores e alerta de estoque baixo.' },
  { icon: DollarSign, title: 'Caixa completo', text: 'Abertura, sangria, suprimento e fechamento com conferência por forma de pagamento.' },
  { icon: CloudOff, title: 'Funciona sem internet', text: 'As vendas continuam offline e sincronizam sozinhas quando a conexão volta.' },
  { icon: QrCode, title: 'PIX no balcão', text: 'QR Code gerado na hora para o cliente pagar pelo celular.' },
  { icon: Printer, title: 'Cupom impresso', text: 'Impressão em impressora térmica ou envio do recibo em PDF.' },
  { icon: BarChart3, title: 'Relatórios', text: 'Vendas por dia, produtos mais vendidos e resultado do período.' },
  { icon: Users, title: 'Sua equipe', text: 'Convide operadores e gerentes com permissões separadas.' },
];

const steps = [
  'Crie sua conta com o nome do seu comércio',
  'Cadastre ou importe seus produtos de uma planilha',
  'Abra o caixa e comece a vender',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src="/logo-mercadopdv.png" alt="MercadoPDV" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-lg font-bold">MercadoPDV</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/auth?modo=cadastro">Testar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-16 text-center lg:py-24">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight lg:text-5xl">
            O sistema de vendas e estoque do seu mercadinho
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Frente de caixa, controle de estoque, caixa e relatórios em um só lugar.
            Funciona no computador, no tablet e no celular — mesmo sem internet.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/auth?modo=cadastro">Começar teste de {BILLING.trialDays} dias</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Sem cartão de crédito para testar. Depois, {formatBRL(BILLING.monthlyPrice)} por mês.
          </p>
        </section>

        <section className="border-y bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-bold">Tudo que o balcão precisa</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title}>
                    <CardContent className="space-y-3 p-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.text}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <h2 className="text-center text-3xl font-bold">Comece em 3 passos</h2>
          <ol className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step} className="rounded-xl border p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="mt-4 text-sm">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t bg-muted/30 py-16">
          <div className="container mx-auto max-w-xl px-4">
            <Card>
              <CardContent className="space-y-5 p-8 text-center">
                <h2 className="text-2xl font-bold">{BILLING.planName}</h2>
                <p className="text-4xl font-bold">
                  {formatBRL(BILLING.monthlyPrice)}
                  <span className="text-base font-normal text-muted-foreground">/mês</span>
                </p>
                <ul className="space-y-2 text-left text-sm">
                  {[
                    'Produtos, vendas e usuários sem limite',
                    'Modo offline com sincronização automática',
                    `${BILLING.trialDays} dias de teste grátis`,
                    'Pagamento por PIX, sem fidelidade',
                    'Suporte por e-mail',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" size="lg" asChild>
                  <Link to="/auth?modo=cadastro">Criar minha conta</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {BILLING.legalName}</span>
          <div className="flex gap-4">
            <Link to="/termos" className="hover:text-foreground">Termos de Uso</Link>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <a href={`mailto:${BILLING.supportEmail}`} className="hover:text-foreground">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
