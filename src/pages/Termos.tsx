import { Link } from 'react-router-dom';
import { BILLING } from '@/config/billing';

export default function Termos() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl p-6 lg:p-10">
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Voltar ao sistema
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Termos de Uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">1. Sobre o serviço</h2>
            <p className="text-muted-foreground">
              O MercadoPDV é um sistema de ponto de venda e controle de estoque oferecido pela
              {' '}{BILLING.legalName}. Ao criar uma conta, você concorda com estes termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Conta e responsabilidades</h2>
            <p className="text-muted-foreground">
              Você é responsável pelos dados cadastrados, pela guarda das suas credenciais e pelo uso
              feito pelos funcionários que convidar. Cada empresa possui dados isolados e acessíveis
              apenas pelos usuários vinculados a ela.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. Assinatura e pagamento</h2>
            <p className="text-muted-foreground">
              O acesso inclui período de teste de {BILLING.trialDays} dias. Após o teste, o uso depende de
              assinatura mensal paga via PIX. O pagamento é confirmado manualmente pela equipe após o
              envio do comprovante. A falta de pagamento pode suspender o acesso ao sistema, sem
              exclusão imediata dos dados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Documento fiscal</h2>
            <p className="text-muted-foreground">
              Os comprovantes emitidos pelo sistema são recibos não fiscais, destinados ao controle
              interno. A emissão de documentos fiscais (NFC-e, SAT ou equivalente) é de
              responsabilidade do estabelecimento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Disponibilidade</h2>
            <p className="text-muted-foreground">
              O sistema funciona também em modo offline, sincronizando quando a conexão retorna. Podem
              ocorrer interrupções por manutenção ou por falhas de serviços de terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. Encerramento</h2>
            <p className="text-muted-foreground">
              Você pode encerrar a conta a qualquer momento pelas configurações do sistema. Podemos
              suspender contas que violem estes termos ou a legislação aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">7. Contato</h2>
            <p className="text-muted-foreground">
              Dúvidas sobre estes termos: {BILLING.supportEmail}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
