// Local cache utility for offline functionality
export class LocalCache {
  private static instance: LocalCache;
  private dbName = 'MercadinhoMixDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  static getInstance(): LocalCache {
    if (!LocalCache.instance) {
      LocalCache.instance = new LocalCache();
    }
    return LocalCache.instance;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('barcode', 'barcode', { unique: true });
          productStore.createIndex('name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
          salesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('pendingSync')) {
          db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async saveProducts(products: any[]): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    
    for (const product of products) {
      await store.put(product);
    }
  }

  async getProducts(): Promise<any[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveOfflineSale(sale: any): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sales', 'pendingSync'], 'readwrite');
      const salesStore = transaction.objectStore('sales');
      const pendingStore = transaction.objectStore('pendingSync');
      
      // Save sale locally
      const saleWithTimestamp = {
        ...sale,
        timestamp: Date.now(),
        synced: false
      };
      
      const saleRequest = salesStore.add(saleWithTimestamp);
      
      saleRequest.onsuccess = () => {
        // Add to pending sync queue
        const pendingRequest = pendingStore.add({
          type: 'sale',
          data: saleWithTimestamp,
          timestamp: Date.now()
        });
        
        pendingRequest.onsuccess = () => resolve();
        pendingRequest.onerror = () => reject(pendingRequest.error);
      };
      
      saleRequest.onerror = () => reject(saleRequest.error);
    });
  }

  async getPendingSyncItems(): Promise<any[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingSync'], 'readonly');
      const store = transaction.objectStore('pendingSync');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingSync(): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['pendingSync'], 'readwrite');
    const store = transaction.objectStore('pendingSync');
    await store.clear();
  }

  async getProductByBarcode(barcode: string): Promise<any | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');
      const index = store.index('barcode');
      const request = index.get(barcode);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async searchProducts(query: string): Promise<any[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const products = request.result;
        const filtered = products.filter(product => 
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.barcode.includes(query)
        );
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  }
}