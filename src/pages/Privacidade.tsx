import { Link } from 'react-router-dom';
import { BILLING } from '@/config/billing';

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl p-6 lg:p-10">
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Voltar ao sistema
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">1. Quem trata seus dados</h2>
            <p className="text-muted-foreground">
              A {BILLING.legalName} trata os dados pessoais coletados no MercadoPDV, conforme a Lei
              Geral de Proteção de Dados (Lei 13.709/2018). Contato: {BILLING.supportEmail}.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Dados coletados</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Cadastro: nome, email e nome da empresa.</li>
              <li>Operação: produtos, estoque, fornecedores, vendas e movimentações de caixa.</li>
              <li>Cobrança: comprovantes e identificadores de pagamento PIX informados por você.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. Finalidade</h2>
            <p className="text-muted-foreground">
              Usamos os dados para autenticar o acesso, operar o ponto de venda, gerar relatórios,
              controlar a assinatura e prestar suporte. Não vendemos dados nem os usamos para
              publicidade de terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Compartilhamento</h2>
            <p className="text-muted-foreground">
              Os dados ficam armazenados em provedores de infraestrutura em nuvem contratados para
              hospedagem do banco de dados e da autenticação, usados apenas para operar o serviço, além
              das hipóteses de obrigação legal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Isolamento e segurança</h2>
            <p className="text-muted-foreground">
              Cada empresa acessa somente os próprios dados, com regras de acesso aplicadas no banco de
              dados e permissões por cargo (administrador, gerente e operador). Senhas são armazenadas
              de forma criptografada pelo serviço de autenticação.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. Seus direitos</h2>
            <p className="text-muted-foreground">
              Você pode acessar, corrigir, exportar e excluir seus dados. A exportação em arquivo e a
              exclusão da conta estão disponíveis em Configurações, dentro do sistema, ou por
              solicitação em {BILLING.supportEmail}.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">7. Retenção</h2>
            <p className="text-muted-foreground">
              Os dados são mantidos enquanto a conta estiver ativa. Após a exclusão da conta, os dados
              da empresa são removidos, salvo registros que precisem ser mantidos por obrigação legal.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
