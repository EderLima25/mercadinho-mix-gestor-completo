// Utilitário para impressora térmica ESC/POS

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
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

export class ThermalPrinter {
  private static instance: ThermalPrinter;
  private port: any = null;
  private writer: any = null;

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

  // Conectar via Web Serial API
  public async connect(): Promise<boolean> {
    try {
      if ('serial' in navigator) {
        this.port = await (navigator as any).serial.requestPort();
        await this.port.open({ 
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none'
        });
        
        this.writer = this.port.writable.getWriter();
        
        // Inicializar impressora
        await this.sendCommand(this.INIT);
        
        console.log('Impressora térmica conectada com sucesso!');
        return true;
      } else {
        console.warn('Web Serial API não suportada neste navegador');
        return false;
      }
    } catch (error) {
      console.error('Erro ao conectar impressora:', error);
      return false;
    }
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
    } catch (error) {
      console.error('Erro ao desconectar impressora:', error);
    }
  }

  private async sendCommand(command: string): Promise<void> {
    if (!this.writer) {
      throw new Error('Impressora não conectada');
    }
    
    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode(command));
  }

  private async sendText(text: string): Promise<void> {
    await this.sendCommand(text);
  }

  // Imprimir cupom fiscal
  public async printReceipt(data: ReceiptData): Promise<boolean> {
    try {
      if (!this.writer) {
        // Fallback para console se não conectado
        this.printToConsole(data);
        return false;
      }

      // Cabeçalho
      await this.sendCommand(this.ALIGN_CENTER);
      await this.sendCommand(this.BOLD_ON + this.DOUBLE_HEIGHT);
      await this.sendText('MERCADINHO MIX');
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
        const itemLine = `${item.name}`;
        await this.sendText(itemLine);
        await this.sendCommand(this.LINE_FEED);
        
        const detailLine = `${item.quantity}x R$ ${item.unitPrice.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}`;
        await this.sendCommand(this.ALIGN_RIGHT);
        await this.sendText(detailLine);
        await this.sendCommand(this.LINE_FEED);
        await this.sendCommand(this.ALIGN_LEFT);
      }

      // Totais
      await this.sendText('--------------------------------');
      await this.sendCommand(this.LINE_FEED);
      
      await this.sendCommand(this.ALIGN_RIGHT);
      await this.sendText(`Subtotal: R$ ${data.subtotal.toFixed(2)}`);
      await this.sendCommand(this.LINE_FEED);
      
      if (data.discount > 0) {
        await this.sendText(`Desconto: -R$ ${data.discount.toFixed(2)}`);
        await this.sendCommand(this.LINE_FEED);
      }
      
      await this.sendCommand(this.BOLD_ON);
      await this.sendText(`TOTAL: R$ ${data.total.toFixed(2)}`);
      await this.sendCommand(this.LINE_FEED);
      await this.sendCommand(this.BOLD_OFF);

      // Pagamento
      await this.sendText(`Pagamento: ${this.getPaymentMethodName(data.paymentMethod)}`);
      await this.sendCommand(this.LINE_FEED);
      
      if (data.receivedAmount && data.change !== undefined) {
        await this.sendText(`Recebido: R$ ${data.receivedAmount.toFixed(2)}`);
        await this.sendCommand(this.LINE_FEED);
        await this.sendText(`Troco: R$ ${data.change.toFixed(2)}`);
        await this.sendCommand(this.LINE_FEED);
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
      this.printToConsole(data);
      return false;
    }
  }

  // Fallback para console quando impressora não está conectada
  private printToConsole(data: ReceiptData): void {
    console.log('=== CUPOM FISCAL ===');
    console.log('MERCADINHO MIX');
    console.log('Sistema de Gestão Completo');
    console.log('================================');
    console.log(`Data: ${data.timestamp.toLocaleString('pt-BR')}`);
    console.log('--------------------------------');
    
    data.items.forEach((item) => {
      console.log(`${item.name}`);
      console.log(`${item.quantity}x R$ ${item.unitPrice.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}`);
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

  // Teste de impressão
  public async printTest(): Promise<boolean> {
    try {
      if (!this.writer) {
        console.log('=== TESTE DE IMPRESSÃO ===');
        console.log('Impressora não conectada');
        console.log('Usando fallback do console');
        return false;
      }

      await this.sendCommand(this.ALIGN_CENTER);
      await this.sendCommand(this.BOLD_ON);
      await this.sendText('TESTE DE IMPRESSÃO');
      await this.sendCommand(this.LINE_FEED);
      await this.sendCommand(this.BOLD_OFF);
      await this.sendText('Impressora funcionando!');
      await this.sendCommand(this.LINE_FEED + this.LINE_FEED);
      await this.sendCommand(this.CUT);

      return true;
    } catch (error) {
      console.error('Erro no teste de impressão:', error);
      return false;
    }
  }
}