export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  category: string;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'credit' | 'debit' | 'pix';
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}
