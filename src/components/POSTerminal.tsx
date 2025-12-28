import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, QrCode, Printer, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
  isWeightBased?: boolean;
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
  const [weightInput, setWeightInput] = useState<{[key: string]: string}>({});
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [selectedProductForWeight, setSelectedProductForWeight] = useState<Product | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<{[key: string]: string}>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const { products, getProductByBarcode } = useProducts();
  const { createSale, topProducts } = useSales();
  const { toast } = useToast();

  // Instâncias dos utilitários de hardware
  const barcodeScanner = BarcodeScanner.getInstance();
  const thermalPrinter = ThermalPrinter.getInstance();

  // Função para verificar se produto é vendido por peso/volume
  const isWeightBasedProduct = (product: Product) => {
    return product.unit === 'kg' || product.unit === 'l';
  };

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    const isWeightBased = isWeightBasedProduct(product);
    
    // Se é produto por peso/volume, abrir dialog para inserir quantidade
    if (isWeightBased && quantity === 1) {
      setSelectedProductForWeight(product);
      setShowWeightDialog(true);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        return prev.map((item) =>
          item.product.id === product.id
            ? { 
                ...item, 
                quantity: newQuantity, 
                subtotal: newQuantity * Number(item.product.price),
                isWeightBased 
              }
            : item
        );
      }
      return [...prev, { 
        product, 
        quantity, 
        subtotal: Number(product.price) * quantity,
        isWeightBased 
      }];
    });
    
    // Limpar busca após adicionar produto
    setBarcodeInput('');
    setSearchResults([]);
    setShowSearchResults(false);
    inputRef.current?.focus();
  }, []);

  // Função para processar entrada com multiplicação (ex: 7*789456123)
  const parseQuantityAndBarcode = (input: string) => {
    const multiplyMatch = input.match(/^(\d+(?:\.\d+)?)\*(.+)$/);
    if (multiplyMatch) {
      const quantity = parseFloat(multiplyMatch[1]);
      const barcode = multiplyMatch[2].trim();
      return { quantity, barcode };
    }
    return { quantity: 1, barcode: input.trim() };
  };

  // Função para buscar produtos por nome ou código de barras
  const searchProducts = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Extrair quantidade e código/nome do produto
    const { barcode } = parseQuantityAndBarcode(query);

    const results = products.filter(product => 
      product.name.toLowerCase().includes(barcode.toLowerCase()) ||
      product.barcode.includes(barcode)
    ).slice(0, 5); // Limitar a 5 resultados

    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  }, [products]);

  // Atualizar busca quando o input muda
  const handleInputChange = (value: string) => {
    setBarcodeInput(value);
    searchProducts(value);
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    // Processar quantidade e código de barras
    const { quantity, barcode } = parseQuantityAndBarcode(barcodeInput);

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
        addToCart(product, quantity);
        toast({
          title: 'Produto adicionado',
          description: `${product.name} ${quantity > 1 ? `(${quantity}x)` : ''} adicionado ao carrinho.`,
        });
      }
      return;
    }

    // Busca exata por código de barras
    const product = await getProductByBarcode(barcode);
    
    if (product) {
      if (product.stock <= 0) {
        toast({
          title: 'Produto sem estoque',
          description: `${product.name} está sem estoque disponível.`,
          variant: 'destructive',
        });
      } else {
        addToCart(product, quantity);
        toast({
          title: 'Produto adicionado',
          description: `${product.name} ${quantity > 1 ? `(${quantity}x)` : ''} adicionado ao carrinho.`,
        });
      }
    } else {
      setUnknownBarcode(barcode);
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
            const isWeightBased = isWeightBasedProduct(item.product);
            const increment = isWeightBased ? 0.1 : 1; // Incremento menor para produtos por peso
            const newQuantity = Math.max(0, item.quantity + (delta * increment));
            
            if (newQuantity <= 0) return null;
            return { 
              ...item, 
              quantity: Math.round(newQuantity * 100) / 100, // Arredondar para 2 casas decimais
              subtotal: (Math.round(newQuantity * 100) / 100) * Number(item.product.price) 
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Função para atualizar quantidade diretamente
  const setQuantityDirectly = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const isWeightBased = isWeightBasedProduct(item.product);
          const finalQuantity = isWeightBased 
            ? Math.round(newQuantity * 100) / 100 
            : Math.round(newQuantity);
          
          return { 
            ...item, 
            quantity: finalQuantity,
            subtotal: finalQuantity * Number(item.product.price) 
          };
        }
        return item;
      })
    );
  };

  // Função para lidar com edição de quantidade
  const handleQuantityEdit = (productId: string, value: string) => {
    setEditingQuantity(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  // Função para confirmar edição de quantidade
  const confirmQuantityEdit = (productId: string) => {
    const value = editingQuantity[productId];
    if (value !== undefined) {
      const newQuantity = parseFloat(value);
      if (!isNaN(newQuantity) && newQuantity >= 0) {
        setQuantityDirectly(productId, newQuantity);
      }
      setEditingQuantity(prev => {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      });
    }
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Função para adicionar produto com peso específico
  const addProductWithWeight = (product: Product, weight: number) => {
    if (weight <= 0) {
      toast({
        title: 'Peso inválido',
        description: 'O peso deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se há estoque suficiente
    if (weight > product.stock) {
      toast({
        title: 'Estoque insuficiente',
        description: `Disponível: ${product.stock} ${product.unit}`,
        variant: 'destructive',
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQuantity = existing.quantity + weight;
        return prev.map((item) =>
          item.product.id === product.id
            ? { 
                ...item, 
                quantity: Math.round(newQuantity * 100) / 100,
                subtotal: (Math.round(newQuantity * 100) / 100) * Number(item.product.price),
                isWeightBased: true
              }
            : item
        );
      }
      return [...prev, { 
        product, 
        quantity: Math.round(weight * 100) / 100,
        subtotal: (Math.round(weight * 100) / 100) * Number(product.price),
        isWeightBased: true
      }];
    });

    setShowWeightDialog(false);
    setSelectedProductForWeight(null);
    setWeightInput({});
    
    toast({
      title: 'Produto adicionado',
      description: `${product.name} - ${weight} ${product.unit}`,
    });
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
    const handleBarcodeScan = async (barcode: string) => {
      const product = await getProductByBarcode(barcode);
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

    try {
      console.log('handlePayment called');
      
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

      // Verificar estoque antes de finalizar venda
      for (const item of cart) {
        if (item.quantity > item.product.stock) {
          toast({
            title: 'Estoque insuficiente',
            description: `${item.product.name}: disponível ${item.product.stock} ${item.product.unit}, solicitado ${item.quantity} ${item.product.unit}`,
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

      console.log('Calling createSale.mutate...');
      
      // Usar mutate ao invés de mutateAsync para evitar problemas com promises
      createSale.mutate({
        items,
        total: finalTotal,
        paymentMethod: selectedPaymentMethod,
      }, {
        onSuccess: (sale) => {
          console.log('Sale completed successfully:', sale);
          // Limpar formulário após venda
          setCart([]);
          setDiscount(0);
          setReceivedAmount('');
          
          // Imprimir cupom
          printReceipt();
        },
        onError: (error) => {
          console.error('Error in mutation:', error);
          toast({
            title: 'Erro ao processar venda',
            description: error.message,
            variant: 'destructive',
          });
        }
      });
      
    } catch (error) {
      console.error('Error in handlePayment:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const printReceipt = async () => {
    const receiptData = {
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.isWeightBased ? parseFloat(item.quantity.toFixed(2)) : item.quantity,
        unit: item.product.unit,
        unitPrice: Number(item.product.price),
        subtotal: item.subtotal,
        isWeightBased: item.isWeightBased,
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
    
    // Processar quantidade da busca atual
    const { quantity } = parseQuantityAndBarcode(barcodeInput);
    
    addToCart(product, quantity);
    toast({
      title: 'Produto adicionado',
      description: `${product.name} ${quantity > 1 ? `(${quantity}x)` : ''} adicionado ao carrinho.`,
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
                placeholder="Escaneie código de barras, digite o nome do produto ou use multiplicação (ex: 5*789456123)..."
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

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Carrinho - Agora ocupa 3 colunas */}
        <div className="lg:col-span-3">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 border-b pb-3">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold">Carrinho</h2>
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {cart.length} itens
              </span>
            </div>

            <div className="min-h-[300px] max-h-[500px] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                <AnimatePresence>
                  {cart.map((item) => (
                    <motion.div
                      key={item.product.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="rounded-lg border bg-secondary/30 p-3 flex flex-col"
                    >
                      <div className="flex-1 mb-2">
                        <p className="font-medium text-sm leading-tight mb-1 line-clamp-2">{item.product.name}</p>
                        <div className="text-xs text-muted-foreground mb-1">
                          <div>#{item.product.barcode}</div>
                          <div>
                            R$ {Number(item.product.price).toFixed(2)}
                            {item.isWeightBased ? `/${item.product.unit}` : ''}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        {editingQuantity[item.product.id] !== undefined ? (
                          <Input
                            type="number"
                            value={editingQuantity[item.product.id]}
                            onChange={(e) => handleQuantityEdit(item.product.id, e.target.value)}
                            onBlur={() => confirmQuantityEdit(item.product.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                confirmQuantityEdit(item.product.id);
                              }
                              if (e.key === 'Escape') {
                                setEditingQuantity(prev => {
                                  const newState = { ...prev };
                                  delete newState[item.product.id];
                                  return newState;
                                });
                              }
                            }}
                            className="h-7 w-12 text-center text-xs p-1"
                            step={item.isWeightBased ? "0.01" : "1"}
                            min="0"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => setEditingQuantity(prev => ({
                              ...prev,
                              [item.product.id]: item.quantity.toString()
                            }))}
                            className="text-center font-bold text-sm px-1 hover:bg-gray-100 rounded min-w-[3rem]"
                          >
                            {item.isWeightBased ? item.quantity.toFixed(2) : item.quantity}
                          </button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="text-center">
                        <p className="font-bold text-base text-primary">
                          R$ {item.subtotal.toFixed(2)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {cart.length === 0 && (
                  <div className="col-span-full flex h-48 flex-col items-center justify-center text-muted-foreground">
                    <ShoppingCart className="mb-3 h-12 w-12" />
                    <p className="text-lg">Carrinho vazio</p>
                    <p className="text-sm">Adicione produtos para começar a venda</p>
                  </div>
                )}
              </div>
            </div>

            {/* Total e Botões de Pagamento */}
            {cart.length > 0 && (
              <div className="mt-4 space-y-3 border-t pt-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-base">
                    <span>Subtotal</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-base text-red-600">
                      <span>Desconto</span>
                      <span>-R$ {discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-2xl font-bold border-t pt-2">
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
              <Card className="p-3">
                <h3 className="mb-3 font-semibold text-sm">Forma de Pagamento</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedPaymentMethod === 'cash' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('cash')}
                    className="flex-col gap-1 h-auto py-2"
                    size="sm"
                  >
                    <Banknote className="h-4 w-4" />
                    <span className="text-xs">Dinheiro</span>
                  </Button>
                  <Button
                    variant={selectedPaymentMethod === 'credit' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('credit')}
                    className="flex-col gap-1 h-auto py-2"
                    size="sm"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span className="text-xs">Crédito</span>
                  </Button>
                  <Button
                    variant={selectedPaymentMethod === 'debit' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('debit')}
                    className="flex-col gap-1 h-auto py-2"
                    size="sm"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span className="text-xs">Débito</span>
                  </Button>
                  <Button
                    variant={selectedPaymentMethod === 'pix' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('pix')}
                    className="flex-col gap-1 h-auto py-2"
                    size="sm"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span className="text-xs">PIX</span>
                  </Button>
                </div>
              </Card>

              {/* Desconto */}
              <Card className="p-3">
                <h3 className="mb-3 font-semibold text-sm">Desconto</h3>
                <div className="space-y-2">
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
                    className="h-9"
                  />
                  {discountAmount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Desconto: R$ {discountAmount.toFixed(2)}
                    </p>
                  )}
                </div>
              </Card>

              {/* Valor Recebido e Troco (apenas para dinheiro) */}
              {selectedPaymentMethod === 'cash' && (
                <Card className="p-3">
                  <h3 className="mb-3 font-semibold text-sm">Pagamento em Dinheiro</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium">Valor Recebido</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        step="0.01"
                        min="0"
                        className="h-9"
                      />
                    </div>
                    {receivedValue > 0 && (
                      <div className="space-y-1 p-2 bg-muted rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span>Total:</span>
                          <span>R$ {finalTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Recebido:</span>
                          <span>R$ {receivedValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-base border-t pt-1">
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
                className="w-full h-12 text-base font-bold"
                size="lg"
              >
                {createSale.isPending ? 'Processando...' : 'Finalizar Venda'}
              </Button>
            </>
          )}

          {cart.length === 0 && (
            <Card className="p-6">
              <div className="text-center text-muted-foreground">
                <ShoppingCart className="mx-auto mb-3 h-10 w-10" />
                <p className="text-sm">Adicione produtos ao carrinho para ver as opções de pagamento</p>
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

      {/* Dialog para inserir peso/volume */}
      <Dialog open={showWeightDialog} onOpenChange={setShowWeightDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Informar Quantidade</DialogTitle>
            <DialogDescription>
              {selectedProductForWeight && (
                <>
                  Produto: <strong>{selectedProductForWeight.name}</strong><br/>
                  Preço: <strong>R$ {Number(selectedProductForWeight.price).toFixed(2)} por {selectedProductForWeight.unit}</strong><br/>
                  Estoque disponível: <strong>{selectedProductForWeight.stock} {selectedProductForWeight.unit}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProductForWeight && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="weight">
                  Quantidade ({selectedProductForWeight.unit})
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedProductForWeight.stock}
                  placeholder={`Ex: 1.5 ${selectedProductForWeight.unit}`}
                  value={weightInput[selectedProductForWeight.id] || ''}
                  onChange={(e) => setWeightInput({
                    ...weightInput,
                    [selectedProductForWeight.id]: e.target.value
                  })}
                  autoFocus
                />
              </div>
              
              {weightInput[selectedProductForWeight.id] && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>Total:</span>
                    <span className="font-bold text-lg">
                      R$ {(parseFloat(weightInput[selectedProductForWeight.id]) * Number(selectedProductForWeight.price)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowWeightDialog(false);
              setSelectedProductForWeight(null);
              setWeightInput({});
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedProductForWeight && weightInput[selectedProductForWeight.id]) {
                  const weight = parseFloat(weightInput[selectedProductForWeight.id]);
                  addProductWithWeight(selectedProductForWeight, weight);
                }
              }}
              disabled={!selectedProductForWeight || !weightInput[selectedProductForWeight.id] || parseFloat(weightInput[selectedProductForWeight.id] || '0') <= 0}
            >
              Adicionar ao Carrinho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
