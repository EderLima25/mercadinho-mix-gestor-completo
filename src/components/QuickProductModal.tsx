import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProducts, Product } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { AlertCircle } from 'lucide-react';

interface QuickProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barcode: string;
  onProductAdded: (product: Product) => void;
}

export function QuickProductModal({
  open,
  onOpenChange,
  barcode,
  onProductAdded,
}: QuickProductModalProps) {
  const { categories } = useCategories();
  const { addProduct } = useProducts();
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '1',
    category_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      name: formData.name,
      barcode: barcode,
      price: parseFloat(formData.price),
      cost_price: parseFloat(formData.price) * 0.7,
      stock: parseInt(formData.stock),
      min_stock: 5,
      category_id: formData.category_id || null,
      unit: 'un',
    };

    const result = await addProduct.mutateAsync(productData);
    onProductAdded(result);
    setFormData({ name: '', price: '', stock: '1', category_id: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Produto Não Cadastrado
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 rounded-lg bg-warning/10 border border-warning/20 p-4">
          <p className="text-sm">
            O código <span className="font-mono font-bold">{barcode}</span> não foi encontrado.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre rapidamente para continuar a venda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="quick-name">Nome do Produto</Label>
            <Input
              id="quick-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Arroz 5kg"
              required
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="quick-price">Preço (R$)</Label>
              <Input
                id="quick-price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <Label htmlFor="quick-stock">Quantidade em Estoque</Label>
              <Input
                id="quick-stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="quick-category">Categoria</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={addProduct.isPending}>
              {addProduct.isPending ? 'Cadastrando...' : 'Cadastrar e Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
