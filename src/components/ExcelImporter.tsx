import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
  description: string | null;
  is_active: boolean;
  internal_code: string | null;
  sell_by_weight: boolean;
}

export function ExcelImporter() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: number; duplicates: number } | null>(null);
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
    if (['pct', 'pacote', 'pacotes', 'pct'].includes(normalized)) return 'pct';
    if (['fd', 'fardo', 'fardos'].includes(normalized)) return 'pct';
    return 'un';
  };

  const findCategoryId = (categoryName: string | undefined): string | null => {
    if (!categoryName || categoryName.trim() === '') return null;
    const category = categories.find(
      c => c.name.toLowerCase() === categoryName.toLowerCase().trim()
    );
    return category?.id || null;
  };

  const parseExcelRow = (row: any): ImportedProduct | null => {
    // Mapear campos do Excel para o formato do banco
    const name = row.nome || row.name || row.Nome || row.NAME || '';
    const barcode = String(row.codigo_barras || row.barcode || row.codigo || row.Codigo || row['código'] || '').trim();
    
    if (!name || !barcode) return null;
    
    // Preço de venda
    let price = parseFloat(row.preco_venda || row.preco || row.price || row.Preco || row['preço'] || 0);
    if (isNaN(price)) price = 0;
    
    // Preço de custo
    let costPrice = parseFloat(row.preco_custo || row.custo || row.cost || row.Custo || row.cost_price || 0);
    if (isNaN(costPrice)) costPrice = 0;
    
    // Estoque - na planilha não tem coluna de estoque atual, usar 0
    let stock = parseInt(row.estoque || row.stock || 0);
    if (isNaN(stock)) stock = 0;
    
    // Estoque mínimo
    let minStock = parseInt(row.estoque_minimo || row.minimo || row.min_stock || 5);
    if (isNaN(minStock) || minStock < 0) minStock = 0;
    // Valores muito grandes (como 100000000) são erros, limitar
    if (minStock > 10000) minStock = 5;
    
    // Unidade
    const unit = normalizeUnit(row.unidade_medida || row.unidade || row.unit);
    
    // Categoria
    const categoryId = findCategoryId(row.categoria || row.category);
    
    // Descrição
    const description = row.descricao || row.description || null;
    
    // Ativo (1 = true, 0 = false)
    const isActive = row.ativo === 1 || row.ativo === '1' || row.ativo === true || row.is_active === true;
    
    // Código interno
    const internalCode = row.codigo_interno || row.internal_code || null;
    
    // Venda por peso (1 = true, 0 = false)
    const sellByWeight = row.venda_por_peso === 1 || row.venda_por_peso === '1' || row.sell_by_weight === true;

    return {
      name: name.trim(),
      barcode,
      price,
      cost_price: costPrice,
      stock,
      min_stock: minStock,
      unit,
      category_id: categoryId,
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
    setImportResult(null);

    try {
      // Ler arquivo Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log(`Processando ${data.length} linhas do Excel...`);

      // Converter para formato de produtos
      const products: ImportedProduct[] = [];
      const errors: string[] = [];

      data.forEach((row: any, index) => {
        const product = parseExcelRow(row);
        if (product) {
          products.push(product);
        } else {
          errors.push(`Linha ${index + 2}: dados inválidos`);
        }
      });

      console.log(`${products.length} produtos válidos para importar`);

      // Importar em lotes para evitar timeout
      const BATCH_SIZE = 100;
      let successCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        
        try {
          // Usar upsert para evitar duplicatas (atualiza se já existe)
          const { data: result, error } = await supabase
            .from('products')
            .upsert(batch as any, { 
              onConflict: 'barcode',
              ignoreDuplicates: false  // Atualiza se já existe
            })
            .select();

          if (error) {
            console.error('Erro no lote:', error);
            errorCount += batch.length;
          } else {
            successCount += batch.length;
          }
        } catch (err) {
          console.error('Erro ao processar lote:', err);
          errorCount += batch.length;
        }

        // Atualizar progresso
        setProgress(Math.round(((i + batch.length) / products.length) * 100));
      }

      setImportResult({
        success: successCount,
        errors: errorCount + errors.length,
        duplicates: duplicateCount,
      });

      // Invalidar cache de produtos
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast({
        title: 'Importação concluída!',
        description: `${successCount} produtos importados com sucesso.`,
      });

    } catch (error) {
      console.error('Erro na importação:', error);
      toast({
        title: 'Erro na importação',
        description: 'Verifique o formato do arquivo e tente novamente.',
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
        Importe produtos do arquivo Excel do Mercadinho Mix com todos os campos: 
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
              Importando... {progress}%
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Selecionar Arquivo Excel
            </>
          )}
        </Button>

        {importing && (
          <Progress value={progress} className="w-full" />
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
              {importResult.duplicates > 0 && (
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{importResult.duplicates} produtos atualizados (já existiam)</span>
                </div>
              )}
              {importResult.errors > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{importResult.errors} linhas com erro</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="font-medium mb-2">Campos suportados:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 grid grid-cols-2 gap-1">
            <li>• nome / name</li>
            <li>• codigo_barras / barcode</li>
            <li>• preco_venda / price</li>
            <li>• preco_custo / cost_price</li>
            <li>• categoria / category</li>
            <li>• estoque_minimo / min_stock</li>
            <li>• unidade_medida / unit</li>
            <li>• descricao / description</li>
            <li>• ativo / is_active</li>
            <li>• codigo_interno</li>
            <li>• venda_por_peso</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
