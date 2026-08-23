// Dados comerciais do MercadoPDV.
// Ajuste estes valores com os seus dados reais antes de vender o sistema.
export const BILLING = {
  planName: 'MercadoPDV Básico',
  monthlyPrice: 49.9,
  pixKey: '94240361320',
  pixHolder: 'MercadoPDV',
  supportEmail: 'ederportelalima@hotmail.com',
  supportWhatsapp: '',
  legalName: 'MercadoPDV',
  trialDays: 14,
};

export function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
