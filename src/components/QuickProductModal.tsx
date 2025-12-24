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
import { useStore } from '@/store/useStore';
import { Product } from '@/types';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { categories, addProduct } = useStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '1',
    category: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const product: Product = {
      id: crypto.randomUUID(),
      name: formData.name,
      barcode: barcode,
      price: parseFloat(formData.price),
      costPrice: parseFloat(formData.price) * 0.7, // Default 30% margin
      stock: parseInt(formData.stock),
      minStock: 5,
      category: formData.category,
      unit: 'un',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addProduct(product);
    toast({
      title: 'Produto cadastrado!',
      description: `${product.name} foi adicionado e incluído no carrinho.`,
    });
    
    onProductAdded(product);
    setFormData({ name: '', price: '', stock: '1', category: '' });
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
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
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

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Cadastrar e Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
