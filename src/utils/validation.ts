import { z } from 'zod';

/**
 * Remove caracteres perigosos (tags HTML/scripts) de textos digitados pelo usuário.
 * O React já escapa a saída, isto evita armazenar lixo no banco.
 */
export function sanitizeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}

const money = z
  .number({ invalid_type_error: 'Informe um valor numérico' })
  .finite('Valor inválido')
  .min(0, 'O valor não pode ser negativo')
  .max(9999999, 'Valor muito alto');

const quantity = z
  .number({ invalid_type_error: 'Informe uma quantidade numérica' })
  .int('Use um número inteiro')
  .min(0, 'A quantidade não pode ser negativa')
  .max(9999999, 'Quantidade muito alta');

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do produto').max(120, 'Nome muito longo'),
  barcode: z.string().trim().min(1, 'Informe o código de barras').max(64, 'Código muito longo'),
  price: money,
  cost_price: money,
  stock: quantity,
  min_stock: quantity,
  unit: z.string().trim().min(1).max(10),
  description: z.string().max(500, 'Descrição muito longa').nullable().optional(),
  internal_code: z.string().max(60, 'Código interno muito longo').nullable().optional(),
});

export interface ProductInput {
  name: string;
  barcode: string;
  price: number;
  cost_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  description: string | null;
  internal_code: string | null;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return Number.NaN;
  return Number(value.trim().replace(',', '.'));
}

function optionalText(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return sanitizeText(String(value));
}

/**
 * Normaliza e valida entradas de formulários e importações no mesmo padrão.
 * Valores inválidos são rejeitados, nunca convertidos silenciosamente para zero.
 */
export function validateProductInput(
  input: Record<string, unknown>,
): { success: true; data: ProductInput } | { success: false; error: z.ZodError } {
  const result = productSchema.safeParse({
    name: sanitizeText(String(input.name ?? '')),
    barcode: sanitizeText(String(input.barcode ?? '')),
    price: toNumber(input.price),
    cost_price: toNumber(input.cost_price),
    stock: toNumber(input.stock),
    min_stock: toNumber(input.min_stock),
    unit: sanitizeText(String(input.unit ?? 'un')),
    description: optionalText(input.description),
    internal_code: optionalText(input.internal_code),
  });
  if (result.success) return { success: true, data: result.data as ProductInput };
  return { success: false, error: result.error };
}

/** Valida um arquivo de upload (logo, comprovante, importação). */
export function validateUpload(
  file: File,
  opts: { maxSizeMB: number; allowedExtensions: string[]; allowedMime?: string[] },
): { ok: true } | { ok: false; error: string } {
  const name = file.name.replace(/\\/g, '/').split('/').pop() ?? '';
  if (!name || name.includes('..')) {
    return { ok: false, error: 'Nome de arquivo inválido.' };
  }
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  if (!opts.allowedExtensions.includes(ext)) {
    return {
      ok: false,
      error: `Tipo de arquivo não permitido. Use: ${opts.allowedExtensions.join(', ')}.`,
    };
  }
  if (opts.allowedMime && file.type && !opts.allowedMime.includes(file.type)) {
    return { ok: false, error: 'O conteúdo do arquivo não corresponde à extensão.' };
  }
  if (file.size > opts.maxSizeMB * 1024 * 1024) {
    return { ok: false, error: `Arquivo maior que ${opts.maxSizeMB} MB.` };
  }
  return { ok: true };
}

export const IMAGE_UPLOAD = {
  maxSizeMB: 2,
  allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  allowedMime: ['image/jpeg', 'image/png', 'image/webp'],
};

export const SHEET_UPLOAD = {
  maxSizeMB: 10,
  allowedExtensions: ['csv', 'xlsx', 'xls', 'json'],
};
