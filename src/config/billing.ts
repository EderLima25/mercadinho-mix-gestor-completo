// Dados comerciais do MercadoPDV.
// Ajuste estes valores com os seus dados reais antes de vender o sistema.
export const BILLING = {
  planName: 'MercadoPDV Básico',
  monthlyPrice: 49.9,
  pixKey: 'SUA-CHAVE-PIX-AQUI',
  pixHolder: 'MercadoPDV',
  supportEmail: 'suporte@mercadopdv.com.br',
  supportWhatsapp: '',
  legalName: 'MercadoPDV',
  trialDays: 14,
};

export function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
