// Utilitário para integração com leitor de código de barras

export class BarcodeScanner {
  private static instance: BarcodeScanner;
  private isListening = false;
  private buffer = '';
  private lastKeyTime = 0;
  private readonly SCAN_TIMEOUT = 100; // ms entre caracteres do scanner
  private readonly MIN_BARCODE_LENGTH = 8;
  private onScanCallback?: (barcode: string) => void;

  private constructor() {
    this.setupKeyboardListener();
  }

  public static getInstance(): BarcodeScanner {
    if (!BarcodeScanner.instance) {
      BarcodeScanner.instance = new BarcodeScanner();
    }
    return BarcodeScanner.instance;
  }

  private setupKeyboardListener() {
    document.addEventListener('keydown', (event) => {
      if (!this.isListening) return;

      const currentTime = Date.now();
      
      // Se passou muito tempo desde a última tecla, limpar buffer
      if (currentTime - this.lastKeyTime > this.SCAN_TIMEOUT) {
        this.buffer = '';
      }

      this.lastKeyTime = currentTime;

      // Enter indica fim do código de barras
      if (event.key === 'Enter') {
        if (this.buffer.length >= this.MIN_BARCODE_LENGTH) {
          this.onScanCallback?.(this.buffer);
        }
        this.buffer = '';
        event.preventDefault();
        return;
      }

      // Adicionar caractere ao buffer (apenas números e letras)
      if (/^[a-zA-Z0-9]$/.test(event.key)) {
        this.buffer += event.key;
        event.preventDefault();
      }
    });
  }

  public startListening(callback: (barcode: string) => void) {
    this.isListening = true;
    this.onScanCallback = callback;
    this.buffer = '';
  }

  public stopListening() {
    this.isListening = false;
    this.onScanCallback = undefined;
    this.buffer = '';
  }

  // Método para integração com Web Serial API (leitores USB)
  public async connectUSBScanner(): Promise<boolean> {
    try {
      if ('serial' in navigator) {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        
        const reader = port.readable.getReader();
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const barcode = new TextDecoder().decode(value).trim();
          if (barcode.length >= this.MIN_BARCODE_LENGTH) {
            this.onScanCallback?.(barcode);
          }
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao conectar scanner USB:', error);
      return false;
    }
  }
}