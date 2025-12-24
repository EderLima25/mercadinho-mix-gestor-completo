import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, QrCode, Printer, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useProducts, Product } from '@/hooks/useProducts';
import { useSales } from '@/hooks/useSales';
import { QuickProductModal } from './QuickProductModal';
import { useToast } from '@/hooks/use-toast';
import { BarcodeScanner } from '@/utils/barcodeScanner';
import { ThermalPrinter } from '@/utils/thermalPrinter';

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export function POSTerminal() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'credit' | 'debit' | 'pix'>('cash');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'value'>('percentage');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [isConnectedToPrinter, setIsConnectedToPrinter] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { products, getProductByBarcode } = useProducts();
  const { createSale, topProducts } = useSales();
  const { toast } = useToast();

  // Instâncias dos utilitários de hardware
  const barcodeScanner = BarcodeScanner.getInstance();
  const thermalPrinter = ThermalPrinter.getInstance();

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity, subtotal: (item.quantity + quantity) * Number(item.product.price) }
            : item
        );
      }
      return [...prev, { product, quantity, subtotal: Number(product.price) * quantity }];
    });
    
    // Limpar busca após adicionar produto
    setBarcodeInput('');
    setSearchResults([]);
    setShowSearchResults(false);
    inputRef.current?.focus();
  }, []);

  // Função para buscar produtos por nome ou código de barras
  const searchProducts = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const results = products.filter(product => 
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.barcode.includes(query)
    ).slice(0, 5); // Limitar a 5 resultados

    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  }, [products]);

  // Atualizar busca quando o input muda
  const handleInputChange = (value: string) => {
    setBarcodeInput(value);
    searchProducts(value);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    // Se há resultados de busca, adicionar o primeiro
    if (searchResults.length > 0) {
      const product = searchResults[0];
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
      return;
    }

    // Busca exata por código de barras
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
        title: 'Produto não encontrado',
        description: 'Deseja cadastrar este produto agora?',
        variant: 'destructive',
      });
    }
    
    setBarcodeInput('');
    setSearchResults([]);
    setShowSearchResults(false);
    inputRef.current?.focus();
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQuantity = item.quantity + delta;
            if (newQuantity <= 0) return null;
            return { ...item, quantity: newQuantity, subtotal: newQuantity * Number(item.product.price) };
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
  
  // Calcular desconto
  const discountAmount = discountType === 'percentage' 
    ? (total * discount) / 100 
    : discount;
  
  const finalTotal = Math.max(0, total - discountAmount);
  
  // Calcular troco
  const receivedValue = parseFloat(receivedAmount) || 0;
  const change = receivedValue - finalTotal;

  // Configurar scanner de código de barras
  useEffect(() => {
    const handleBarcodeScan = (barcode: string) => {
      const product = getProductByBarcode(barcode);
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
            title: 'Produto escaneado!',
            description: `${product.name} adicionado ao carrinho.`,
          });
        }
      } else {
        toast({
          title: 'Produto não encontrado',
          description: `Código ${barcode} não cadastrado.`,
          variant: 'destructive',
        });
      }
    };

    if (isScannerActive) {
      barcodeScanner.startListening(handleBarcodeScan);
    } else {
      barcodeScanner.stopListening();
    }

    return () => {
      barcodeScanner.stopListening();
    };
  }, [isScannerActive, getProductByBarcode, addToCart, toast]);

  const handlePayment = async () => {
    if (cart.length === 0) return;

    // Validações para pagamento em dinheiro
    if (selectedPaymentMethod === 'cash') {
      if (receivedValue < finalTotal) {
        toast({
          title: 'Valor insuficiente',
          description: `Valor recebido (R$ ${receivedValue.toFixed(2)}) é menor que o total (R$ ${finalTotal.toFixed(2)})`,
          variant: 'destructive',
        });
        return;
      }
    }

    const items = cart.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: Number(item.product.price),
      subtotal: item.subtotal,
    }));

    await createSale.mutateAsync({
      items,
      total: finalTotal,
      paymentMethod: selectedPaymentMethod,
    });

    // Limpar formulário após venda
    setCart([]);
    setDiscount(0);
    setReceivedAmount('');
    printReceipt();
  };

  const printReceipt = async () => {
    const receiptData = {
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: Number(item.product.price),
        subtotal: item.subtotal,
      })),
      subtotal: total,
      discount: discountAmount,
      total: finalTotal,
      paymentMethod: selectedPaymentMethod,
      receivedAmount: selectedPaymentMethod === 'cash' ? receivedValue : undefined,
      change: selectedPaymentMethod === 'cash' ? change : undefined,
      timestamp: new Date(),
    };

    const printed = await thermalPrinter.printReceipt(receiptData);
    
    toast({
      title: printed ? 'Cupom impresso!' : 'Cupom simulado!',
      description: printed 
        ? (selectedPaymentMethod === 'cash' && change > 0 ? `Troco: R$ ${change.toFixed(2)}` : 'Verifique a impressora térmica.')
        : 'Impressora não conectada. Verifique o console.',
    });
  };

  const handleProductAdded = (product: Product) => {
    addToCart(product);
    setShowQuickAdd(false);
    setUnknownBarcode('');
  };

  // Função para selecionar produto da lista de busca
  const selectSearchResult = (product: Product) => {
    if (product.stock <= 0) {
      toast({
        title: 'Produto sem estoque',
        description: `${product.name} está sem estoque disponível.`,
        variant: 'destructive',
      });
      return;
    }
    
    addToCart(product);
    toast({
      title: 'Produto adicionado',
      description: `${product.name} adicionado ao carrinho.`,
    });
  };

  // Conectar impressora térmica
  const connectPrinter = async () => {
    const connected = await thermalPrinter.connect();
    setIsConnectedToPrinter(connected);
    
    if (connected) {
      toast({
        title: 'Impressora conectada!',
        description: 'Impressora térmica pronta para uso.',
      });
      // Teste de impressão
      await thermalPrinter.printTest();
    } else {
      toast({
        title: 'Erro na conexão',
        description: 'Não foi possível conectar à impressora.',
        variant: 'destructive',
      });
    }
  };

  // Conectar scanner USB
  const connectUSBScanner = async () => {
    const connected = await barcodeScanner.connectUSBScanner();
    
    if (connected) {
      setIsScannerActive(true);
      toast({
        title: 'Scanner USB conectado!',
        description: 'Leitor de código de barras pronto para uso.',
      });
    } else {
      toast({
        title: 'Erro na conexão',
        description: 'Não foi possível conectar ao scanner USB.',
        variant: 'destructive',
      });
    }
  };

  // Toggle scanner de teclado
  const toggleKeyboardScanner = () => {
    setIsScannerActive(!isScannerActive);
    toast({
      title: isScannerActive ? 'Scanner desativado' : 'Scanner ativado',
      description: isScannerActive 
        ? 'Scanner de teclado desativado.' 
        : 'Scanner de teclado ativo. Use um leitor conectado.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Barra de busca */}
      <Card className="p-4">
        <div className="flex gap-3 mb-3">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-3 flex-1">
            <div className="relative flex-1">
              <QrCode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={barcodeInput}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Escaneie código de barras ou digite o nome do produto..."
                className="pl-10 h-14 text-lg"
                autoFocus
              />
              
              {/* Dropdown com resultados da busca */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectSearchResult(product)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.barcode}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">R$ {Number(product.price).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          Estoque: {product.stock}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" size="lg" className="h-14 px-8">
              <Search className="mr-2 h-5 w-5" />
              Buscar
            </Button>
          </form>
          
          {/* Botões de Hardware */}
          <div className="flex gap-2">
            <Button
              variant={isScannerActive ? "default" : "outline"}
              size="lg"
              onClick={toggleKeyboardScanner}
              className="h-14 px-4"
              title="Scanner de Teclado"
            >
              <Scan className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={connectUSBScanner}
              className="h-14 px-4"
              title="Conectar Scanner USB"
            >
              <QrCode className="h-5 w-5" />
            </Button>
            
            <Button
              variant={isConnectedToPrinter ? "default" : "outline"}
              size="lg"
              onClick={connectPrinter}
              className="h-14 px-4"
              title="Conectar Impressora"
            >
              <Printer className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Status dos dispositivos */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isScannerActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            Scanner: {isScannerActive ? 'Ativo' : 'Inativo'}
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnectedToPrinter ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            Impressora: {isConnectedToPrinter ? 'Conectada' : 'Desconectada'}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Carrinho - Agora na parte central */}
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2 border-b pb-4">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Carrinho</h2>
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {cart.length} itens
              </span>
            </div>

            <div className="space-y-3 min-h-[300px] max-h-[400px] overflow-y-auto">
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div
                    key={item.product.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 rounded-lg border bg-secondary/30 p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-lg">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Código: {item.product.barcode}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        R$ {Number(item.product.price).toFixed(2)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center font-bold text-lg">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-destructive hover:text-destructive ml-2"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="w-24 text-right font-bold text-xl text-primary">
                      R$ {item.subtotal.toFixed(2)}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>

              {cart.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                  <ShoppingCart className="mb-4 h-16 w-16" />
                  <p className="text-xl">Carrinho vazio</p>
                  <p className="text-sm">Adicione produtos para começar a venda</p>
                </div>
              )}
            </div>

            {/* Total e Botões de Pagamento */}
            {cart.length > 0 && (
              <div className="mt-6 space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-lg">
                    <span>Subtotal</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-lg text-red-600">
                      <span>Desconto</span>
                      <span>-R$ {discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-3xl font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="text-primary">R$ {finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Painel de Pagamento - Substituindo produtos mais vendidos */}
        <div className="space-y-4">
          {cart.length > 0 && (
            <>
              {/* Seleção de Forma de Pagamento */}
              <Card className="p-4">
                <h3 className="mb-4 font-semibold">Forma de Pagamento</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedPaymentMethod === 'cash' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('cash')}
                    className="flex-col gap-1 h-auto py-3"
                  >
                    <Banknote className="h-5 w-5" />
                    <span className="text-xs">Dinheiro</span>
                  </Button>
                  <Button
                    variant={selectedPaymentMethod === 'credit' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('credit')}
                    className="flex-col gap-1 h-auto py-3"
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-xs">Crédito</span>
                  </Button>
                  <Button
                    variant={selectedPaymentMethod === 'debit' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('debit')}
                    className="flex-col gap-1 h-auto py-3"
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-xs">Débito</span>
                  </Button>
                  <Button
                    variant={selectedPaymentMethod === 'pix' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('pix')}
                    className="flex-col gap-1 h-auto py-3"
                  >
                    <Smartphone className="h-5 w-5" />
                    <span className="text-xs">PIX</span>
                  </Button>
                </div>
              </Card>

              {/* Desconto */}
              <Card className="p-4">
                <h3 className="mb-4 font-semibold">Desconto</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant={discountType === 'percentage' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDiscountType('percentage')}
                    >
                      %
                    </Button>
                    <Button
                      variant={discountType === 'value' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDiscountType('value')}
                    >
                      R$
                    </Button>
                  </div>
                  <Input
                    type="number"
                    placeholder={discountType === 'percentage' ? '0' : '0.00'}
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    step={discountType === 'percentage' ? '1' : '0.01'}
                    min="0"
                    max={discountType === 'percentage' ? '100' : total.toString()}
                  />
                  {discountAmount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Desconto: R$ {discountAmount.toFixed(2)}
                    </p>
                  )}
                </div>
              </Card>

              {/* Valor Recebido e Troco (apenas para dinheiro) */}
              {selectedPaymentMethod === 'cash' && (
                <Card className="p-4">
                  <h3 className="mb-4 font-semibold">Pagamento em Dinheiro</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Valor Recebido</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    {receivedValue > 0 && (
                      <div className="space-y-2 p-3 bg-muted rounded-lg">
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span>R$ {finalTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recebido:</span>
                          <span>R$ {receivedValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Troco:</span>
                          <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                            R$ {change.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Botão Finalizar Venda */}
              <Button
                onClick={handlePayment}
                disabled={createSale.isPending || (selectedPaymentMethod === 'cash' && receivedValue < finalTotal)}
                className="w-full h-14 text-lg font-bold"
                size="lg"
              >
                {createSale.isPending ? 'Processando...' : 'Finalizar Venda'}
              </Button>
            </>
          )}

          {cart.length === 0 && (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <ShoppingCart className="mx-auto mb-4 h-12 w-12" />
                <p>Adicione produtos ao carrinho para ver as opções de pagamento</p>
              </div>
            </Card>
          )}
        </div>
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
