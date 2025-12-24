import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, QrCode, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { CartItem, Product } from '@/types';
import { QuickProductModal } from './QuickProductModal';
import { useToast } from '@/hooks/use-toast';

export function POSTerminal() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { getProductByBarcode, updateStock, addSale, products } = useStore();
  const { toast } = useToast();

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity, subtotal: (item.quantity + quantity) * item.product.price }
            : item
        );
      }
      return [...prev, { product, quantity, subtotal: product.price * quantity }];
    });
  }, []);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const product = getProductByBarcode(barcodeInput.trim());
    
    if (product) {
      if (product.stock <= 0) {
        toast({
          title: 'Produto sem estoque',
          description: `${product.name} está sem estoque disponível.`,
          variant: 'destructive',
        });
      } else {
        addToCart(product);
        toast({
          title: 'Produto adicionado',
          description: `${product.name} adicionado ao carrinho.`,
        });
      }
    } else {
      setUnknownBarcode(barcodeInput.trim());
      setShowQuickAdd(true);
      toast({
        title: 'Produto não cadastrado',
        description: 'Deseja cadastrar este produto agora?',
        variant: 'destructive',
      });
    }
    
    setBarcodeInput('');
    inputRef.current?.focus();
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQuantity = item.quantity + delta;
            if (newQuantity <= 0) return null;
            return { ...item, quantity: newQuantity, subtotal: newQuantity * item.product.price };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handlePayment = (method: 'cash' | 'credit' | 'debit' | 'pix') => {
    if (cart.length === 0) return;

    const sale = {
      id: crypto.randomUUID(),
      items: cart,
      total,
      paymentMethod: method,
      createdAt: new Date(),
    };

    // Update stock
    cart.forEach((item) => {
      updateStock(item.product.id, item.quantity);
    });

    addSale(sale);
    setCart([]);
    
    toast({
      title: 'Venda finalizada!',
      description: `Total: R$ ${total.toFixed(2)} - ${method.toUpperCase()}`,
    });

    // Here you would trigger thermal printer
    printReceipt(sale);
  };

  const printReceipt = (sale: typeof cart extends infer T ? { id: string; items: CartItem[]; total: number; paymentMethod: string; createdAt: Date } : never) => {
    // ESC/POS command simulation - in real implementation, this would connect to thermal printer
    const escpos = {
      init: '\x1B\x40',
      center: '\x1B\x61\x01',
      left: '\x1B\x61\x00',
      bold: '\x1B\x45\x01',
      normal: '\x1B\x45\x00',
      cut: '\x1D\x56\x00',
    };

    console.log('=== CUPOM FISCAL ===');
    console.log('MERCADINHO MIX');
    console.log('==================');
    sale.items.forEach((item) => {
      console.log(`${item.product.name} x${item.quantity} = R$ ${item.subtotal.toFixed(2)}`);
    });
    console.log('==================');
    console.log(`TOTAL: R$ ${sale.total.toFixed(2)}`);
    console.log(`Pagamento: ${sale.paymentMethod}`);
    console.log('==================');
    
    toast({
      title: 'Cupom impresso!',
      description: 'Verifique a impressora térmica.',
    });
  };

  const handleProductAdded = (product: Product) => {
    addToCart(product);
    setShowQuickAdd(false);
    setUnknownBarcode('');
  };

  return (
    <div className="grid h-full gap-6 lg:grid-cols-3">
      {/* Product List / Scanner */}
      <div className="space-y-4 lg:col-span-2">
        <Card className="p-4">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <QrCode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Escaneie ou digite o código de barras..."
                className="pl-10 h-14 text-lg"
                autoFocus
              />
            </div>
            <Button type="submit" size="lg" className="h-14 px-8">
              <Search className="mr-2 h-5 w-5" />
              Buscar
            </Button>
          </form>
        </Card>

        {/* Quick Products Grid */}
        <Card className="p-4">
          <h3 className="mb-4 font-semibold text-muted-foreground">Produtos Rápidos</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {products.slice(0, 8).map((product) => (
              <motion.button
                key={product.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addToCart(product)}
                className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center transition-colors hover:border-primary hover:bg-primary/5"
              >
                <span className="text-2xl">🛒</span>
                <span className="text-sm font-medium line-clamp-2">{product.name}</span>
                <span className="text-lg font-bold text-primary">R$ {product.price.toFixed(2)}</span>
              </motion.button>
            ))}
          </div>
        </Card>
      </div>

      {/* Cart */}
      <div className="flex flex-col">
        <Card className="flex flex-1 flex-col p-4">
          <div className="mb-4 flex items-center gap-2 border-b pb-4">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Carrinho</h2>
            <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {cart.length} itens
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 rounded-lg border bg-secondary/30 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {item.product.price.toFixed(2)} x {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.product.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.product.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="w-20 text-right font-bold">R$ {item.subtotal.toFixed(2)}</p>
                </motion.div>
              ))}
            </AnimatePresence>

            {cart.length === 0 && (
              <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
                <ShoppingCart className="mb-2 h-8 w-8" />
                <p>Carrinho vazio</p>
              </div>
            )}
          </div>

          {/* Total & Payment */}
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="flex items-center justify-between text-2xl font-bold">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handlePayment('cash')}
                disabled={cart.length === 0}
                className="flex-col gap-1 h-auto py-3"
              >
                <Banknote className="h-5 w-5" />
                <span className="text-xs">Dinheiro</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handlePayment('credit')}
                disabled={cart.length === 0}
                className="flex-col gap-1 h-auto py-3"
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">Crédito</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handlePayment('debit')}
                disabled={cart.length === 0}
                className="flex-col gap-1 h-auto py-3"
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">Débito</span>
              </Button>
              <Button
                variant="accent"
                size="lg"
                onClick={() => handlePayment('pix')}
                disabled={cart.length === 0}
                className="flex-col gap-1 h-auto py-3"
              >
                <Smartphone className="h-5 w-5" />
                <span className="text-xs">PIX</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <QuickProductModal
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        barcode={unknownBarcode}
        onProductAdded={handleProductAdded}
      />
    </div>
  );
}
