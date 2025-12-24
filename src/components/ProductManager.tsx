import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/store/useStore';
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export function ProductManager() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { products, categories, addProduct, updateProduct, deleteProduct } = useStore();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    price: '',
    costPrice: '',
    stock: '',
    minStock: '',
    category: '',
    unit: 'un',
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search)
  );

  const resetForm = () => {
    setFormData({
      name: '',
      barcode: '',
      price: '',
      costPrice: '',
      stock: '',
      minStock: '',
      category: '',
      unit: 'un',
    });
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const productData: Product = {
      id: editingProduct?.id || crypto.randomUUID(),
      name: formData.name,
      barcode: formData.barcode,
      price: parseFloat(formData.price),
      costPrice: parseFloat(formData.costPrice),
      stock: parseInt(formData.stock),
      minStock: parseInt(formData.minStock),
      category: formData.category,
      unit: formData.unit,
      createdAt: editingProduct?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
      toast({ title: 'Produto atualizado com sucesso!' });
    } else {
      addProduct(productData);
      toast({ title: 'Produto cadastrado com sucesso!' });
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      price: product.price.toString(),
      costPrice: product.costPrice.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      category: product.category,
      unit: product.unit,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    toast({ title: 'Produto removido!', variant: 'destructive' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou código de barras..."
            className="pl-10"
          />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Nome do Produto</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="barcode">Código de Barras</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Preço de Venda (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="costPrice">Preço de Custo (R$)</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Estoque Atual</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="minStock">Estoque Mínimo</Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="unit">Unidade</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">Unidade</SelectItem>
                      <SelectItem value="kg">Quilograma</SelectItem>
                      <SelectItem value="l">Litro</SelectItem>
                      <SelectItem value="cx">Caixa</SelectItem>
                      <SelectItem value="pct">Pacote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredProducts.map((product) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {product.barcode}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.category || 'Sem categoria'}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {product.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {product.stock <= product.minStock && (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                      <span className={product.stock <= product.minStock ? 'text-warning font-medium' : ''}>
                        {product.stock} {product.unit}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium">Nenhum produto encontrado</p>
            <p className="text-sm">Cadastre seu primeiro produto para começar!</p>
          </div>
        )}
      </Card>
    </div>
  );
}
