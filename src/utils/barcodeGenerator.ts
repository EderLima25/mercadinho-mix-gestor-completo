/**
 * Gera um código de barras EAN-13 válido
 * EAN-13 consiste em 13 dígitos: 12 dígitos de dados + 1 dígito verificador
 */
export function generateEAN13(): string {
  // Gera 12 dígitos aleatórios (os primeiros 12 dígitos do EAN-13)
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  
  // Calcula o dígito verificador
  const checkDigit = calculateEAN13CheckDigit(code);
  
  return code + checkDigit;
}

/**
 * Calcula o dígito verificador para um código EAN-13
 * @param code - Os primeiros 12 dígitos do código EAN-13
 * @returns O dígito verificador (0-9)
 */
function calculateEAN13CheckDigit(code: string): string {
  if (code.length !== 12) {
    throw new Error('Código deve ter exatamente 12 dígitos');
  }
  
  let sum = 0;
  
  // Soma os dígitos nas posições ímpares (multiplicados por 1)
  // e os dígitos nas posições pares (multiplicados por 3)
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i]);
    if (i % 2 === 0) {
      sum += digit; // Posições ímpares (0, 2, 4, 6, 8, 10)
    } else {
      sum += digit * 3; // Posições pares (1, 3, 5, 7, 9, 11)
    }
  }
  
  // O dígito verificador é o que falta para completar o próximo múltiplo de 10
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return checkDigit.toString();
}

/**
 * Valida se um código EAN-13 é válido
 * @param code - Código EAN-13 completo (13 dígitos)
 * @returns true se o código for válido, false caso contrário
 */
export function validateEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) {
    return false;
  }
  
  const dataDigits = code.slice(0, 12);
  const providedCheckDigit = code[12];
  const calculatedCheckDigit = calculateEAN13CheckDigit(dataDigits);
  
  return providedCheckDigit === calculatedCheckDigit;
}

/**
 * Formata um código EAN-13 para exibição (com espaços)
 * @param code - Código EAN-13 (13 dígitos)
 * @returns Código formatado (ex: "123 4567 890123 4")
 */
export function formatEAN13(code: string): string {
  if (code.length !== 13) {
    return code;
  }
  
  return `${code.slice(0, 3)} ${code.slice(3, 7)} ${code.slice(7, 13)}`;
}