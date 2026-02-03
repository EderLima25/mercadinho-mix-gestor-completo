// Utilitário para impressora térmica ESC/POS

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  unit?: string;
  isWeightBased?: boolean;
}

export interface ReceiptData {
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  receivedAmount?: number;
  change?: number;
  timestamp: Date;
}

export type PrinterConnectionType = 'serial' | 'usb' | 'bluetooth' | 'none';

// Tipos para Web Serial e WebUSB APIs
interface SerialPortLike {
  open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  configuration?: { interfaces: InterfaceLike[] } | null;
}

interface USBDeviceLike {
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  configuration: { interfaces: InterfaceLike[] } | null;
}

interface InterfaceLike {
  interfaceNumber: number;
  alternate: {
    endpoints: { direction: string; type: string; endpointNumber: number }[];
  };
}

interface USBOutTransferResult {
  bytesWritten: number;
  status: string;
}

export class ThermalPrinter {
  private static instance: ThermalPrinter;
  private port: SerialPortLike | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private usbDevice: USBDeviceLike | null = null;
  private usbEndpoint: number = 0;
  private connectionType: PrinterConnectionType = 'none';

  // Comandos ESC/POS
  private readonly ESC = '\x1B';
  private readonly GS = '\x1D';
  
  // Comandos básicos
  private readonly INIT = this.ESC + '@';
  private readonly CUT = this.GS + 'V\x41\x03';
  private readonly LINE_FEED = '\n';
  private readonly ALIGN_CENTER = this.ESC + 'a\x01';
  private readonly ALIGN_LEFT = this.ESC + 'a\x00';
  private readonly ALIGN_RIGHT = this.ESC + 'a\x02';
  private readonly BOLD_ON = this.ESC + 'E\x01';
  private readonly BOLD_OFF = this.ESC + 'E\x00';
  private readonly DOUBLE_HEIGHT = this.ESC + '!\x10';
  private readonly NORMAL_SIZE = this.ESC + '!\x00';

  private constructor() {}

  public static getInstance(): ThermalPrinter {
    if (!ThermalPrinter.instance) {
      ThermalPrinter.instance = new ThermalPrinter();
    }
    return ThermalPrinter.instance;
  }

  public getConnectionType(): PrinterConnectionType {
    return this.connectionType;
  }

  public isConnected(): boolean {
    return this.connectionType !== 'none';
  }

  // Conectar via WebUSB API (impressoras USB diretas)
  public async connectUSB(): Promise<boolean> {
    try {
      if (!('usb' in navigator)) {
        console.warn('WebUSB API não suportada neste navegador');
        return false;
      }

      const usb = navigator.usb as {
        requestDevice(options: { filters: { vendorId: number }[] }): Promise<USBDeviceLike>;
      };

      // Filtros para impressoras térmicas comuns
      const filters = [
        { vendorId: 0x0483 }, // STMicroelectronics (muitas impressoras genéricas)
        { vendorId: 0x0416 }, // Winbond (muitas impressoras chinesas)
        { vendorId: 0x0525 }, // Netchip (gadget USB)
        { vendorId: 0x04B8 }, // Epson
        { vendorId: 0x0519 }, // Star Micronics
        { vendorId: 0x067B }, // Prolific (USB-Serial)
        { vendorId: 0x1504 }, // Bixolon
        { vendorId: 0x0DD4 }, // Custom Engineering
        { vendorId: 0x0FE6 }, // Kontron (algumas impressoras)
        { vendorId: 0x1A86 }, // QinHeng Electronics (CH340)
        { vendorId: 0x10C4 }, // Silicon Labs (CP210x)
      ];

      this.usbDevice = await usb.requestDevice({ filters });
      
      await this.usbDevice.open();
      
      // Tentar selecionar configuração
      if (this.usbDevice.configuration === null) {
        await this.usbDevice.selectConfiguration(1);
      }
      
      // Encontrar interface de impressora
      const interfaces = this.usbDevice.configuration?.interfaces || [];
      let claimedInterface = false;
      
      for (const iface of interfaces) {
        try {
          await this.usbDevice.claimInterface(iface.interfaceNumber);
          claimedInterface = true;
          
          // Encontrar endpoint de saída (bulk out)
          for (const endpoint of iface.alternate.endpoints) {
            if (endpoint.direction === 'out' && endpoint.type === 'bulk') {
              this.usbEndpoint = endpoint.endpointNumber;
              break;
            }
          }
          
          if (this.usbEndpoint > 0) break;
        } catch {
          // Interface não disponível, tentar próxima
          continue;
        }
      }

      if (!claimedInterface || this.usbEndpoint === 0) {
        throw new Error('Não foi possível encontrar endpoint de saída');
      }

      this.connectionType = 'usb';
      
      // Inicializar impressora
      await this.sendCommand(this.INIT);
      
      return true;
    } catch (error) {
      console.error('Erro ao conectar via USB:', error);
      this.usbDevice = null;
      return false;
    }
  }

  // Conectar via Web Serial API (adaptadores USB-Serial)
  public async connectSerial(baudRate: number = 9600): Promise<boolean> {
    try {
      if (!('serial' in navigator)) {
        console.warn('Web Serial API não suportada neste navegador');
        return false;
      }

      this.port = await (navigator as any).serial.requestPort();
      await this.port!.open({ 
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });
      
      this.writer = this.port!.writable!.getWriter();
      this.connectionType = 'serial';
      
      // Inicializar impressora
      await this.sendCommand(this.INIT);
      
      return true;
    } catch (error) {
      console.error('Erro ao conectar via Serial:', error);
      this.port = null;
      this.writer = null;
      return false;
    }
  }

  // Conectar automaticamente (tenta USB primeiro, depois Serial)
  public async connect(): Promise<boolean> {
    // Tentar USB primeiro
    let connected = await this.connectUSB();
    if (connected) return true;
    
    // Se USB falhou, tentar Serial
    connected = await this.connectSerial();
    return connected;
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
      if (this.usbDevice) {
        await this.usbDevice.close();
        this.usbDevice = null;
      }
      this.connectionType = 'none';
      this.usbEndpoint = 0;
    } catch (error) {
      console.error('Erro ao desconectar impressora:', error);
    }
  }

  private async sendCommand(command: string): Promise<void> {
    const encoder = new TextEncoder();
    const data = encoder.encode(command);
    
    if (this.connectionType === 'usb' && this.usbDevice) {
      await this.usbDevice.transferOut(this.usbEndpoint, data);
    } else if (this.connectionType === 'serial' && this.writer) {
      await this.writer.write(data);
    } else {
      throw new Error('Impressora não conectada');
    }
  }

  private async sendText(text: string): Promise<void> {
    await this.sendCommand(text);
  }

  // Formatar linha com alinhamento
  private formatLine(left: string, right: string, width: number = 32): string {
    const spaces = width - left.length - right.length;
    if (spaces < 1) {
      return left.substring(0, width - right.length - 1) + ' ' + right;
    }
    return left + ' '.repeat(spaces) + right;
  }

  // Imprimir cupom fiscal
  public async printReceipt(data: ReceiptData, storeName: string = 'MERCADINHO MIX'): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        // Fallback para console se não conectado
        this.printToConsole(data, storeName);
        return false;
      }

      // Inicializar
      await this.sendCommand(this.INIT);

      // Cabeçalho
      await this.sendCommand(this.ALIGN_CENTER);
      await this.sendCommand(this.BOLD_ON + this.DOUBLE_HEIGHT);
      await this.sendText(storeName);
      await this.sendCommand(this.LINE_FEED);
      await this.sendCommand(this.NORMAL_SIZE + this.BOLD_OFF);
      await this.sendText('Sistema de Gestão Completo');
      await this.sendCommand(this.LINE_FEED);
      await this.sendText('================================');
      await this.sendCommand(this.LINE_FEED);

      // Data e hora
      await this.sendCommand(this.ALIGN_LEFT);
      const dateStr = data.timestamp.toLocaleString('pt-BR');
      await this.sendText(`Data: ${dateStr}`);
      await this.sendCommand(this.LINE_FEED);
      await this.sendText('--------------------------------');
      await this.sendCommand(this.LINE_FEED);

      // Itens
      for (const item of data.items) {
        // Nome do produto
        await this.sendText(item.name.substring(0, 32));
        await this.sendCommand(this.LINE_FEED);
        
        // Detalhes com quantidade e preço
        const qtyStr = item.isWeightBased 
          ? `${item.quantity.toFixed(3)}${item.unit || 'kg'}` 
          : `${item.quantity}x`;
        const priceStr = `R$ ${item.subtotal.toFixed(2)}`;
        const detailLine = this.formatLine(`  ${qtyStr} x R$${item.unitPrice.toFixed(2)}`, priceStr);
        await this.sendText(detailLine);
        await this.sendCommand(this.LINE_FEED);
      }

      // Totais
      await this.sendText('--------------------------------');
      await this.sendCommand(this.LINE_FEED);
      
      await this.sendText(this.formatLine('Subtotal:', `R$ ${data.subtotal.toFixed(2)}`));
      await this.sendCommand(this.LINE_FEED);
      
      if (data.discount > 0) {
        await this.sendText(this.formatLine('Desconto:', `-R$ ${data.discount.toFixed(2)}`));
        await this.sendCommand(this.LINE_FEED);
      }
      
      await this.sendCommand(this.BOLD_ON);
      await this.sendText(this.formatLine('TOTAL:', `R$ ${data.total.toFixed(2)}`));
      await this.sendCommand(this.LINE_FEED);
      await this.sendCommand(this.BOLD_OFF);

      // Pagamento
      await this.sendText('--------------------------------');
      await this.sendCommand(this.LINE_FEED);
      await this.sendText(`Pagamento: ${this.getPaymentMethodName(data.paymentMethod)}`);
      await this.sendCommand(this.LINE_FEED);
      
      if (data.receivedAmount && data.change !== undefined) {
        await this.sendText(this.formatLine('Recebido:', `R$ ${data.receivedAmount.toFixed(2)}`));
        await this.sendCommand(this.LINE_FEED);
        await this.sendCommand(this.BOLD_ON);
        await this.sendText(this.formatLine('Troco:', `R$ ${data.change.toFixed(2)}`));
        await this.sendCommand(this.LINE_FEED);
        await this.sendCommand(this.BOLD_OFF);
      }

      // Rodapé
      await this.sendCommand(this.ALIGN_CENTER);
      await this.sendText('================================');
      await this.sendCommand(this.LINE_FEED);
      await this.sendText('Obrigado pela preferência!');
      await this.sendCommand(this.LINE_FEED);
      await this.sendText('Volte sempre!');
      await this.sendCommand(this.LINE_FEED + this.LINE_FEED);

      // Cortar papel
      await this.sendCommand(this.CUT);

      return true;
    } catch (error) {
      console.error('Erro ao imprimir cupom:', error);
      // Fallback para console
      this.printToConsole(data, storeName);
      return false;
    }
  }

  // Fallback para console quando impressora não está conectada
  private printToConsole(data: ReceiptData, storeName: string = 'MERCADINHO MIX'): void {
    console.log('=== CUPOM FISCAL ===');
    console.log(storeName);
    console.log('Sistema de Gestão Completo');
    console.log('================================');
    console.log(`Data: ${data.timestamp.toLocaleString('pt-BR')}`);
    console.log('--------------------------------');
    
    data.items.forEach((item) => {
      console.log(`${item.name}`);
      const qtyStr = item.isWeightBased 
        ? `${item.quantity.toFixed(3)}${item.unit || 'kg'}` 
        : `${item.quantity}x`;
      console.log(`  ${qtyStr} x R$ ${item.unitPrice.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}`);
    });
    
    console.log('--------------------------------');
    console.log(`Subtotal: R$ ${data.subtotal.toFixed(2)}`);
    if (data.discount > 0) {
      console.log(`Desconto: -R$ ${data.discount.toFixed(2)}`);
    }
    console.log(`TOTAL: R$ ${data.total.toFixed(2)}`);
    console.log(`Pagamento: ${this.getPaymentMethodName(data.paymentMethod)}`);
    
    if (data.receivedAmount && data.change !== undefined) {
      console.log(`Recebido: R$ ${data.receivedAmount.toFixed(2)}`);
      console.log(`Troco: R$ ${data.change.toFixed(2)}`);
    }
    
    console.log('================================');
    console.log('Obrigado pela preferência!');
    console.log('Volte sempre!');
  }

  private getPaymentMethodName(method: string): string {
    const methods: { [key: string]: string } = {
      'cash': 'Dinheiro',
      'credit': 'Cartão de Crédito',
      'debit': 'Cartão de Débito',
      'pix': 'PIX'
    };
    return methods[method] || method;
  }

  // Abrir gaveta de dinheiro
  public async openCashDrawer(): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        console.log('Impressora não conectada - gaveta não aberta');
        return false;
      }

      // Comando padrão para abrir gaveta (ESC p m t1 t2)
      const OPEN_DRAWER = this.ESC + 'p' + '\x00' + '\x19' + '\xFA';
      await this.sendCommand(OPEN_DRAWER);
      
      return true;
    } catch (error) {
      console.error('Erro ao abrir gaveta:', error);
      return false;
    }
  }

  // Teste de impressão
  public async printTest(): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        console.log('=== TESTE DE IMPRESSÃO ===');
        console.log('Impressora não conectada');
        console.log('Usando fallback do console');
        return false;
      }

      await this.sendCommand(this.INIT);
      await this.sendCommand(this.ALIGN_CENTER);
      await this.sendCommand(this.BOLD_ON + this.DOUBLE_HEIGHT);
      await this.sendText('TESTE DE IMPRESSÃO');
      await this.sendCommand(this.LINE_FEED);
      await this.sendCommand(this.NORMAL_SIZE + this.BOLD_OFF);
      await this.sendText('================================');
      await this.sendCommand(this.LINE_FEED);
      await this.sendText(`Conexão: ${this.connectionType.toUpperCase()}`);
      await this.sendCommand(this.LINE_FEED);
      await this.sendText(`Data: ${new Date().toLocaleString('pt-BR')}`);
      await this.sendCommand(this.LINE_FEED);
      await this.sendText('================================');
      await this.sendCommand(this.LINE_FEED);
      await this.sendText('Impressora funcionando!');
      await this.sendCommand(this.LINE_FEED + this.LINE_FEED);
      await this.sendCommand(this.CUT);

      return true;
    } catch (error) {
      console.error('Erro no teste de impressão:', error);
      return false;
    }
  }

  // Imprimir texto simples
  public async printText(text: string, cut: boolean = true): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        console.log('Impressora não conectada');
        console.log(text);
        return false;
      }

      await this.sendCommand(this.INIT);
      await this.sendText(text);
      await this.sendCommand(this.LINE_FEED + this.LINE_FEED);
      
      if (cut) {
        await this.sendCommand(this.CUT);
      }

      return true;
    } catch (error) {
      console.error('Erro ao imprimir texto:', error);
      return false;
    }
  }
}
