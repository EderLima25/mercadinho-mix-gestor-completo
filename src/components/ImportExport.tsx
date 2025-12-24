import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Database, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

export function ImportExport() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { products, importProducts } = useStore();
  const { toast } = useToast();

  const parseCSV = (content: string): Partial<Product>[] => {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    
    return lines.slice(1).filter(line => line.trim()).map((line) => {
      const values = line.split(',');
      const product: Partial<Product> = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        if (header.includes('nome') || header === 'name') product.name = value;
        if (header.includes('codigo') || header === 'barcode') product.barcode = value;
        if (header.includes('preco') || header === 'price') product.price = parseFloat(value) || 0;
        if (header.includes('custo') || header === 'cost') product.costPrice = parseFloat(value) || 0;
        if (header.includes('estoque') || header === 'stock') product.stock = parseInt(value) || 0;
        if (header.includes('minimo') || header === 'min') product.minStock = parseInt(value) || 5;
        if (header.includes('categoria') || header === 'category') product.category = value;
        if (header.includes('unidade') || header === 'unit') product.unit = value || 'un';
      });
      
      return product;
    });
  };

  const parseExcel = async (file: File): Promise<Partial<Product>[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    return data.map((row: any) => ({
      name: row.nome || row.name || row.Nome || row.NAME || '',
      barcode: String(row.codigo || row.barcode || row.Codigo || row.BARCODE || row['código'] || ''),
      price: parseFloat(row.preco || row.price || row.Preco || row.PRICE || row['preço'] || 0),
      costPrice: parseFloat(row.custo || row.cost || row.Custo || row.COST || 0),
      stock: parseInt(row.estoque || row.stock || row.Estoque || row.STOCK || 0),
      minStock: parseInt(row.minimo || row.min || row.Minimo || row.MIN || 5),
      category: row.categoria || row.category || row.Categoria || row.CATEGORY || '',
      unit: row.unidade || row.unit || row.Unidade || row.UNIT || 'un',
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      let parsedProducts: Partial<Product>[] = [];

      if (file.name.endsWith('.csv')) {
        const content = await file.text();
        parsedProducts = parseCSV(content);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parsedProducts = await parseExcel(file);
      } else if (file.name.endsWith('.json')) {
        const content = await file.text();
        const data = JSON.parse(content);
        parsedProducts = Array.isArray(data) ? data : data.products || [];
      }

      const validProducts: Product[] = parsedProducts
        .filter((p) => p.name && p.barcode)
        .map((p) => ({
          id: crypto.randomUUID(),
          name: p.name!,
          barcode: p.barcode!,
          price: p.price || 0,
          costPrice: p.costPrice || 0,
          stock: p.stock || 0,
          minStock: p.minStock || 5,
          category: p.category || '',
          unit: p.unit || 'un',
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      importProducts(validProducts);
      
      setImportResult({
        success: validProducts.length,
        errors: parsedProducts.length - validProducts.length,
      });

      toast({
        title: 'Importação concluída!',
        description: `${validProducts.length} produtos importados com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro na importação',
        description: 'Verifique o formato do arquivo e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['nome', 'codigo', 'preco', 'custo', 'estoque', 'minimo', 'categoria', 'unidade'];
    const rows = products.map((p) => [
      p.name,
      p.barcode,
      p.price,
      p.costPrice,
      p.stock,
      p.minStock,
      p.category,
      p.unit,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mercadinho_mix_produtos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({ title: 'Exportação concluída!', description: 'Arquivo CSV baixado com sucesso.' });
  };

  const exportToExcel = () => {
    const data = products.map((p) => ({
      Nome: p.name,
      Codigo: p.barcode,
      Preco: p.price,
      Custo: p.costPrice,
      Estoque: p.stock,
      Minimo: p.minStock,
      Categoria: p.category,
      Unidade: p.unit,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
    XLSX.writeFile(workbook, `mercadinho_mix_produtos_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({ title: 'Exportação concluída!', description: 'Arquivo Excel baixado com sucesso.' });
  };

  const exportToJSON = () => {
    const data = JSON.stringify({ products, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mercadinho_mix_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    toast({ title: 'Backup criado!', description: 'Arquivo JSON baixado com sucesso.' });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Import Section */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Produtos
          </h2>
          <p className="text-muted-foreground mb-6">
            Importe produtos de arquivos CSV, Excel (.xlsx/.xls) ou JSON.
          </p>

          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
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
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="mr-2"
                  >
                    <Upload className="h-5 w-5" />
                  </motion.div>
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Selecionar Arquivo
                </>
              )}
            </Button>

            <AnimatePresence>
              {importResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-lg border p-4 space-y-2"
                >
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span>{importResult.success} produtos importados</span>
                  </div>
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
              <h4 className="font-medium mb-2">Formatos suportados:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• CSV - Valores separados por vírgula</li>
                <li>• Excel (.xlsx, .xls)</li>
                <li>• JSON - Backup do sistema</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Export Section */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-accent" />
            Exportar / Backup
          </h2>
          <p className="text-muted-foreground mb-6">
            Exporte seus produtos ou crie um backup completo do sistema.
          </p>

          <div className="grid gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={exportToCSV}
              className="justify-start"
            >
              <FileText className="mr-3 h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium">Exportar CSV</p>
                <p className="text-xs text-muted-foreground">Planilha simples</p>
              </div>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={exportToExcel}
              className="justify-start"
            >
              <FileSpreadsheet className="mr-3 h-5 w-5 text-success" />
              <div className="text-left">
                <p className="font-medium">Exportar Excel</p>
                <p className="text-xs text-muted-foreground">Arquivo .xlsx</p>
              </div>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={exportToJSON}
              className="justify-start"
            >
              <Database className="mr-3 h-5 w-5 text-info" />
              <div className="text-left">
                <p className="font-medium">Backup Completo</p>
                <p className="text-xs text-muted-foreground">Arquivo JSON</p>
              </div>
            </Button>
          </div>

          <div className="mt-6 rounded-lg bg-accent/10 border border-accent/20 p-4">
            <p className="text-sm">
              <strong>Dica:</strong> Faça backups regulares para proteger seus dados!
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
