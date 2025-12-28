// Local cache utility for offline functionality
export class LocalCache {
  private static instance: LocalCache;
  private dbName = 'MercadinhoMixDB';
  private version = 2; // Increased version for schema updates
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  static getInstance(): LocalCache {
    if (!LocalCache.instance) {
      LocalCache.instance = new LocalCache();
    }
    return LocalCache.instance;
  }

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('Upgrading IndexedDB schema...');
        
        // Create object stores
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('barcode', 'barcode', { unique: false });
          productStore.createIndex('name', 'name', { unique: false });
          console.log('Created products store');
        }

        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
          salesStore.createIndex('timestamp', 'timestamp', { unique: false });
          salesStore.createIndex('user_id', 'user_id', { unique: false });
          console.log('Created sales store');
        }

        if (!db.objectStoreNames.contains('pendingSync')) {
          const pendingStore = db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
          pendingStore.createIndex('type', 'type', { unique: false });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('Created pendingSync store');
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  async saveProducts(products: any[]): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products'], 'readwrite');
      const store = transaction.objectStore('products');
      
      transaction.oncomplete = () => {
        console.log(`Saved ${products.length} products to cache`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
      
      // Clear existing products first
      store.clear();
      
      // Add all products
      products.forEach(product => {
        store.put(product);
      });
    });
  }

  async getProducts(): Promise<any[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log(`Retrieved ${request.result.length} products from cache`);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveOfflineSale(sale: any): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sales', 'pendingSync'], 'readwrite');
      const salesStore = transaction.objectStore('sales');
      const pendingStore = transaction.objectStore('pendingSync');
      
      transaction.oncomplete = () => {
        console.log('Offline sale saved successfully');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
      
      // Save sale locally
      const saleWithTimestamp = {
        ...sale,
        timestamp: Date.now(),
        synced: false
      };
      
      salesStore.put(saleWithTimestamp);
      
      // Add to pending sync queue
      pendingStore.add({
        type: 'sale',
        data: saleWithTimestamp,
        timestamp: Date.now()
      });
    });
  }

  async getPendingSyncItems(): Promise<any[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingSync'], 'readonly');
      const store = transaction.objectStore('pendingSync');
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log(`Retrieved ${request.result.length} pending sync items`);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingSync(): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingSync'], 'readwrite');
      const store = transaction.objectStore('pendingSync');
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('Pending sync queue cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getProductByBarcode(barcode: string): Promise<any | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');
      const index = store.index('barcode');
      const request = index.get(barcode);
      
      request.onsuccess = () => {
        const result = request.result || null;
        console.log(`Product lookup for barcode ${barcode}:`, result ? 'found' : 'not found');
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async searchProducts(query: string): Promise<any[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const products = request.result;
        const filtered = products.filter(product => 
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.barcode.includes(query)
        );
        console.log(`Search for "${query}" returned ${filtered.length} results`);
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineSales(): Promise<any[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sales'], 'readonly');
      const store = transaction.objectStore('sales');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const sales = request.result.filter(sale => !sale.synced);
        console.log(`Retrieved ${sales.length} offline sales`);
        resolve(sales);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markSaleAsSynced(saleId: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sales'], 'readwrite');
      const store = transaction.objectStore('sales');
      const getRequest = store.get(saleId);
      
      getRequest.onsuccess = () => {
        const sale = getRequest.result;
        if (sale) {
          sale.synced = true;
          const putRequest = store.put(sale);
          putRequest.onsuccess = () => {
            console.log(`Sale ${saleId} marked as synced`);
            resolve();
          };
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Sale not found, consider it already synced
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products', 'sales', 'pendingSync'], 'readwrite');
      
      transaction.oncomplete = () => {
        console.log('All local data cleared');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
      
      transaction.objectStore('products').clear();
      transaction.objectStore('sales').clear();
      transaction.objectStore('pendingSync').clear();
    });
  }
}