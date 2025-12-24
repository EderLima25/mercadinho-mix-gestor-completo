import { Product, Sale, Category } from '@/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoreState {
  products: Product[];
  sales: Sale[];
  categories: Category[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProductByBarcode: (barcode: string) => Product | undefined;
  addSale: (sale: Sale) => void;
  updateStock: (productId: string, quantity: number) => void;
  addCategory: (category: Category) => void;
  importProducts: (products: Product[]) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      products: [],
      sales: [],
      categories: [
        { id: '1', name: 'Alimentos', color: '#E67E22' },
        { id: '2', name: 'Bebidas', color: '#3498DB' },
        { id: '3', name: 'Limpeza', color: '#27AE60' },
        { id: '4', name: 'Higiene', color: '#9B59B6' },
        { id: '5', name: 'Outros', color: '#95A5A6' },
      ],
      
      addProduct: (product) =>
        set((state) => ({ products: [...state.products, product] })),
      
      updateProduct: (id, updates) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
        })),
      
      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),
      
      getProductByBarcode: (barcode) => {
        return get().products.find((p) => p.barcode === barcode);
      },
      
      addSale: (sale) =>
        set((state) => ({ sales: [...state.sales, sale] })),
      
      updateStock: (productId, quantity) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId
              ? { ...p, stock: p.stock - quantity, updatedAt: new Date() }
              : p
          ),
        })),
      
      addCategory: (category) =>
        set((state) => ({ categories: [...state.categories, category] })),
      
      importProducts: (products) =>
        set((state) => {
          const existingBarcodes = new Set(state.products.map((p) => p.barcode));
          const newProducts = products.filter((p) => !existingBarcodes.has(p.barcode));
          return { products: [...state.products, ...newProducts] };
        }),
    }),
    {
      name: 'mercadinho-mix-storage',
    }
  )
);
