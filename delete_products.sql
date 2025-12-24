-- Script para apagar produtos do banco de dados
-- ATENÇÃO: Execute com cuidado! Esta operação não pode ser desfeita.

-- Opção 1: Ver todos os produtos antes de apagar
SELECT id, name, barcode, created_at 
FROM products 
ORDER BY created_at DESC;

-- Opção 2: Apagar produtos criados hoje (produtos importados recentemente)
-- DELETE FROM products 
-- WHERE DATE(created_at) = CURRENT_DATE;

-- Opção 3: Apagar produtos por padrão no código de barras (se os importados têm um padrão específico)
-- Exemplo: se todos os códigos importados começam com "789"
-- DELETE FROM products 
-- WHERE barcode LIKE '789%';

-- Opção 4: Apagar produtos sem categoria (se os importados não têm categoria)
-- DELETE FROM products 
-- WHERE category_id IS NULL;

-- Opção 5: Apagar produtos por faixa de data (ajuste as datas conforme necessário)
-- DELETE FROM products 
-- WHERE created_at BETWEEN '2025-12-24 00:00:00' AND '2025-12-24 23:59:59';

-- Opção 6: Apagar TODOS os produtos (USE COM EXTREMO CUIDADO!)
-- DELETE FROM products;

-- Opção 7: Apagar produtos específicos por ID (substitua pelos IDs reais)
-- DELETE FROM products 
-- WHERE id IN (
--   'id-do-produto-1',
--   'id-do-produto-2',
--   'id-do-produto-3'
-- );

-- Para verificar quantos produtos serão afetados antes de apagar, use COUNT:
-- SELECT COUNT(*) FROM products WHERE [sua_condição_aqui];