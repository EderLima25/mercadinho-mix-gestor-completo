import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from '@/hooks/useCategories';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

interface ImportedProduct {
  name: string;
  barcode: string;
  price: number;
  cost_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  category_id: string | null;
  fornecedor_id: string | null;
  description: string | null;
  is_active: boolean;
  internal_code: string | null;
  sell_by_weight: boolean;
}

export function ExcelImporter() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: number; total: number } | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { categories } = useCategories();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const normalizeUnit = (unit: string | undefined): string => {
    if (!unit) return 'un';
    const normalized = unit.toLowerCase().trim();
    if (['un', 'und', 'unidade', 'unidades'].includes(normalized)) return 'un';
    if (['kg', 'quilo', 'quilograma'].includes(normalized)) return 'kg';
    if (['l', 'lt', 'litro', 'litros'].includes(normalized)) return 'l';
    if (['cx', 'caixa', 'caixas'].includes(normalized)) return 'cx';
    if (['pct', 'pacote', 'pacotes'].includes(normalized)) return 'pct';
    if (['fd', 'fardo', 'fardos'].includes(normalized)) return 'pct';
    return 'un';
  };

  const findCategoryId = (categoryName: string | undefined, categoriesMap: Map<string, string>): string | null => {
    if (!categoryName || categoryName.trim() === '') return null;
    const normalizedName = categoryName.toLowerCase().trim();
    return categoriesMap.get(normalizedName) || null;
  };

  const parseExcelRow = (row: any, categoriesMap: Map<string, string>): ImportedProduct | null => {
    // Mapear campos do Excel para o formato do banco
    const name = String(row.nome || row.name || row.Nome || row.NAME || '').trim();
    const barcode = String(row.codigo_barras || row.barcode || row.codigo || row.Codigo || row['código'] || '').trim();
    
    if (!name || !barcode) return null;
    
    // Preço de venda
    let price = parseFloat(row.preco_venda || row.preco || row.price || row.Preco || row['preço'] || 0);
    if (isNaN(price) || price < 0) price = 0;
    
    // Preço de custo
    let costPrice = parseFloat(row.preco_custo || row.custo || row.cost || row.Custo || row.cost_price || 0);
    if (isNaN(costPrice) || costPrice < 0) costPrice = 0;
    
    // Estoque - default 1000 para novos produtos
    let stock = parseInt(row.estoque || row.stock || 1000);
    if (isNaN(stock) || stock < 0) stock = 1000;
    
    // Estoque mínimo
    let minStock = parseInt(row.estoque_minimo || row.minimo || row.min_stock || 2);
    if (isNaN(minStock) || minStock < 0) minStock = 2;
    // Valores muito grandes são erros, limitar
    if (minStock > 10000) minStock = 2;
    
    // Unidade
    const unit = normalizeUnit(row.unidade_medida || row.unidade || row.unit);
    
    // Categoria
    const categoryId = findCategoryId(row.categoria || row.category, categoriesMap);
    
    // Descrição
    const description = row.descricao || row.description || null;
    
    // Ativo (1 = true, 0 = false)
    const isActive = row.ativo === 1 || row.ativo === '1' || row.ativo === true || row.is_active === true || row.ativo === undefined;
    
    // Código interno
    const internalCode = row.codigo_interno || row.internal_code || null;
    
    // Venda por peso (1 = true, 0 = false)
    const sellByWeight = row.venda_por_peso === 1 || row.venda_por_peso === '1' || row.sell_by_weight === true;

    // Fornecedor ID (pode ser null se não existir ou não for UUID válido)
    let fornecedorId: string | null = null;
    const rawFornecedorId = row.fornecedor_id || row.fornecedorId || null;
    if (rawFornecedorId && typeof rawFornecedorId === 'string' && rawFornecedorId.length === 36) {
      fornecedorId = rawFornecedorId;
    }

    return {
      name,
      barcode,
      price,
      cost_price: costPrice,
      stock,
      min_stock: minStock,
      unit,
      category_id: categoryId,
      fornecedor_id: fornecedorId,
      description,
      is_active: isActive,
      internal_code: internalCode,
      sell_by_weight: sellByWeight,
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setCurrentBatch(0);
    setTotalBatches(0);
    setImportResult(null);
    setErrorDetails([]);

    try {
      // Usar categorias atuais
      const categoriesMap = new Map<string, string>();
      categories.forEach(cat => {
        categoriesMap.set(cat.name.toLowerCase(), cat.id);
      });

      console.log('Categorias disponíveis:', Array.from(categoriesMap.keys()));

      // Ler arquivo Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log(`Processando ${data.length} linhas do Excel...`);
      console.log('Primeira linha:', data[0]);

      // Converter para formato de produtos
      const products: ImportedProduct[] = [];
      const parseErrors: string[] = [];
      const seenBarcodes = new Set<string>();

      data.forEach((row: any, index) => {
        const product = parseExcelRow(row, categoriesMap);
        if (product) {
          // Evitar duplicatas no mesmo arquivo
          if (!seenBarcodes.has(product.barcode)) {
            seenBarcodes.add(product.barcode);
            products.push(product);
          }
        } else {
          parseErrors.push(`Linha ${index + 2}: nome ou código de barras inválido`);
        }
      });

      console.log(`${products.length} produtos válidos para importar`);
      console.log('Exemplo de produto:', products[0]);

      if (products.length === 0) {
        toast({
          title: 'Nenhum produto válido',
          description: 'Verifique se o arquivo contém as colunas: nome, codigo_barras, preco_venda',
          variant: 'destructive',
        });
        setImporting(false);
        return;
      }

      // Importar em lotes menores para evitar timeout
      const BATCH_SIZE = 50;
      let successCount = 0;
      let errorCount = 0;
      const importErrors: string[] = [...parseErrors];
      const batches = Math.ceil(products.length / BATCH_SIZE);
      
      setTotalBatches(batches);

      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        setCurrentBatch(batchNum);
        
        const batch = products.slice(i, i + BATCH_SIZE);
        
        try {
          // Usar upsert para atualizar se já existe
          const { error } = await supabase
            .from('products')
            .upsert(batch as any, { 
              onConflict: 'barcode',
              ignoreDuplicates: false
            });

          if (error) {
            console.error(`Erro no lote ${batchNum}:`, error);
            importErrors.push(`Lote ${batchNum}: ${error.message}`);
            errorCount += batch.length;
          } else {
            successCount += batch.length;
          }
        } catch (err: any) {
          console.error(`Erro ao processar lote ${batchNum}:`, err);
          importErrors.push(`Lote ${batchNum}: ${err.message || 'Erro desconhecido'}`);
          errorCount += batch.length;
        }

        // Atualizar progresso
        const progressPercent = Math.round(((i + batch.length) / products.length) * 100);
        setProgress(progressPercent);
        
        // Pequena pausa entre lotes para não sobrecarregar
        if (i + BATCH_SIZE < products.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setImportResult({
        success: successCount,
        errors: errorCount,
        total: products.length,
      });
      
      if (importErrors.length > 0) {
        setErrorDetails(importErrors.slice(0, 10)); // Mostrar apenas os 10 primeiros erros
      }

      // Invalidar cache de produtos
      await queryClient.invalidateQueries({ queryKey: ['products'] });

      if (successCount > 0) {
        toast({
          title: 'Importação concluída!',
          description: `${successCount} de ${products.length} produtos importados com sucesso.`,
        });
      } else {
        toast({
          title: 'Erro na importação',
          description: 'Nenhum produto foi importado. Verifique o console para detalhes.',
          variant: 'destructive',
        });
      }

    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast({
        title: 'Erro na importação',
        description: error.message || 'Verifique o formato do arquivo e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      setProgress(100);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <FileSpreadsheet className="h-5 w-5 text-primary" />
        Importar Dados do Excel
      </h2>
      <p className="text-muted-foreground mb-4">
        Importe produtos do arquivo Excel com todos os campos: 
        nome, código de barras, preços, categoria, estoque mínimo, unidade, etc.
      </p>

      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          size="lg"
          className="w-full"
        >
          {importing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Importando... {progress}% (Lote {currentBatch}/{totalBatches})
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Selecionar Arquivo Excel
            </>
          )}
        </Button>

        {importing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Processando lote {currentBatch} de {totalBatches}...
            </p>
          </div>
        )}

        <AnimatePresence>
          {importResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-lg border p-4 space-y-2"
            >
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>{importResult.success} produtos importados/atualizados</span>
              </div>
              {importResult.errors > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{importResult.errors} produtos com erro</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Total processado: {importResult.total} produtos
              </div>
              
              {errorDetails.length > 0 && (
                <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
                  <p className="font-medium text-destructive mb-1">Detalhes dos erros:</p>
                  <ul className="list-disc list-inside space-y-1 text-destructive/80">
                    {errorDetails.map((err, idx) => (
                      <li key={idx} className="truncate">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="font-medium mb-2">Campos esperados no Excel:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 grid grid-cols-2 gap-1">
            <li>• nome</li>
            <li>• codigo_barras</li>
            <li>• preco_venda</li>
            <li>• preco_custo</li>
            <li>• categoria</li>
            <li>• fornecedor_id</li>
            <li>• estoque_minimo</li>
            <li>• unidade_medida</li>
            <li>• descricao</li>
            <li>• ativo (1 ou 0)</li>
            <li>• codigo_interno</li>
            <li>• venda_por_peso (1 ou 0)</li>
          </ul>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <RefreshCw className="h-4 w-4 text-blue-500" />
          <span className="text-blue-700 dark:text-blue-300">
            Produtos com mesmo código de barras serão atualizados automaticamente.
          </span>
        </div>
      </div>
    </Card>
  );
}
