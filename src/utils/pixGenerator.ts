// Gerador de código PIX baseado no padrão BRCode do Banco Central
// Referência: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf

export interface PixConfig {
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  merchantName: string;
  merchantCity: string;
  txId?: string;
}

export interface PixPayload {
  pixCode: string;
  amount: number;
  description?: string;
}

// Função para calcular CRC16-CCITT
function crc16(str: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Formatar campo TLV (Type-Length-Value)
function tlv(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

// Formatar chave PIX para o formato correto
function formatPixKey(key: string, keyType: PixConfig['pixKeyType']): string {
  switch (keyType) {
    case 'cpf':
      return key.replace(/\D/g, '');
    case 'cnpj':
      return key.replace(/\D/g, '');
    case 'phone':
      // Formato: +55 seguido do DDD e número
      const phoneNumbers = key.replace(/\D/g, '');
      if (phoneNumbers.startsWith('55')) {
        return `+${phoneNumbers}`;
      }
      return `+55${phoneNumbers}`;
    case 'email':
      return key.toLowerCase().trim();
    case 'random':
      return key.trim();
    default:
      return key;
  }
}

// Gerar código PIX copia e cola
export function generatePixCode(config: PixConfig, amount: number, description?: string): string {
  const formattedKey = formatPixKey(config.pixKey, config.pixKeyType);
  
  // Payload Format Indicator (obrigatório, sempre "01")
  let payload = tlv('00', '01');
  
  // Merchant Account Information - PIX
  // 26 = Código de conta do recebedor PIX
  const merchantAccountInfo = 
    tlv('00', 'BR.GOV.BCB.PIX') + // GUI do arranjo PIX
    tlv('01', formattedKey); // Chave PIX
  payload += tlv('26', merchantAccountInfo);
  
  // Merchant Category Code (obrigatório, "0000" = não informado)
  payload += tlv('52', '0000');
  
  // Transaction Currency (obrigatório, "986" = BRL)
  payload += tlv('53', '986');
  
  // Transaction Amount (opcional, mas incluímos se > 0)
  if (amount > 0) {
    payload += tlv('54', amount.toFixed(2));
  }
  
  // Country Code (obrigatório, "BR")
  payload += tlv('58', 'BR');
  
  // Merchant Name (obrigatório, até 25 caracteres)
  const merchantName = config.merchantName.substring(0, 25).toUpperCase();
  payload += tlv('59', merchantName);
  
  // Merchant City (obrigatório, até 15 caracteres)
  const merchantCity = config.merchantCity.substring(0, 15).toUpperCase();
  payload += tlv('60', merchantCity);
  
  // Additional Data Field Template (opcional)
  if (config.txId || description) {
    let additionalData = '';
    
    // Transaction ID (TXID) - até 25 caracteres
    const txId = config.txId || `TX${Date.now().toString().slice(-10)}`;
    additionalData += tlv('05', txId.substring(0, 25));
    
    payload += tlv('62', additionalData);
  }
  
  // CRC16 (obrigatório) - Adiciona o campo 63 com placeholder
  payload += '6304';
  
  // Calcula e adiciona o CRC16
  const crc = crc16(payload);
  payload = payload.slice(0, -4) + tlv('63', crc);
  
  return payload;
}

// Validar chave PIX
export function validatePixKey(key: string, keyType: PixConfig['pixKeyType']): boolean {
  if (!key || key.trim() === '') return false;
  
  switch (keyType) {
    case 'cpf':
      const cpfNumbers = key.replace(/\D/g, '');
      return cpfNumbers.length === 11;
    
    case 'cnpj':
      const cnpjNumbers = key.replace(/\D/g, '');
      return cnpjNumbers.length === 14;
    
    case 'phone':
      const phoneNumbers = key.replace(/\D/g, '');
      return phoneNumbers.length >= 10 && phoneNumbers.length <= 13;
    
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(key);
    
    case 'random':
      // Chave aleatória tem 32 caracteres
      return key.length >= 32 && key.length <= 36;
    
    default:
      return false;
  }
}

// Formatar chave PIX para exibição
export function formatPixKeyForDisplay(key: string, keyType: PixConfig['pixKeyType']): string {
  switch (keyType) {
    case 'cpf':
      const cpf = key.replace(/\D/g, '');
      return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    
    case 'cnpj':
      const cnpj = key.replace(/\D/g, '');
      return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    
    case 'phone':
      const phone = key.replace(/\D/g, '');
      if (phone.length === 11) {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      return key;
    
    case 'email':
      return key.toLowerCase();
    
    case 'random':
      return key;
    
    default:
      return key;
  }
}

// Gerar Transaction ID único
export function generateTxId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `PIX${timestamp}${random}`.toUpperCase().substring(0, 25);
}
