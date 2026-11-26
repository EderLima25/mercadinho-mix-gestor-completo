import { describe, expect, test } from 'bun:test';
import { validateProductInput, validateUpload, SHEET_UPLOAD } from '../src/utils/validation';

const validProduct = {
  name: 'Arroz 5kg',
  barcode: '7891234567890',
  price: 24.9,
  cost_price: 18.5,
  stock: 10,
  min_stock: 2,
  unit: 'un',
};

describe('validação de produtos', () => {
  test('aceita valores válidos e converte preço com vírgula', () => {
    const result = validateProductInput({ ...validProduct, price: '24,90' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.price).toBe(24.9);
  });

  test('rejeita preço negativo sem transformar em zero', () => {
    const result = validateProductInput({ ...validProduct, price: -0.01 });
    expect(result.success).toBe(false);
  });

  test('rejeita preço vazio sem transformar em zero', () => {
    const result = validateProductInput({ ...validProduct, price: '' });
    expect(result.success).toBe(false);
  });

  test('rejeita estoque negativo', () => {
    const result = validateProductInput({ ...validProduct, stock: -1 });
    expect(result.success).toBe(false);
  });

  test('rejeita estoque fracionado', () => {
    const result = validateProductInput({ ...validProduct, stock: 1.5 });
    expect(result.success).toBe(false);
  });

  test('rejeita nome vazio após remover marcações', () => {
    const result = validateProductInput({ ...validProduct, name: '<b></b>' });
    expect(result.success).toBe(false);
  });

  test('remove marcações e limita a descrição', () => {
    const result = validateProductInput({ ...validProduct, description: '<b>Produto</b> novo' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBe('Produto novo');
  });
});

describe('validação de arquivos de importação', () => {
  test('aceita uma planilha XLSX dentro do limite', () => {
    const file = new File(['planilha'], 'produtos.xlsx');
    expect(validateUpload(file, SHEET_UPLOAD)).toEqual({ ok: true });
  });

  test('rejeita executável mesmo com nome de produto', () => {
    const file = new File(['conteudo'], 'produtos.exe');
    expect(validateUpload(file, SHEET_UPLOAD).ok).toBe(false);
  });

  test('rejeita arquivo acima de 10 MB', () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'produtos.csv');
    expect(validateUpload(file, SHEET_UPLOAD).ok).toBe(false);
  });
});
