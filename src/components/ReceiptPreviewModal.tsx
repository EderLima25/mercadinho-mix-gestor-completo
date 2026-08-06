import { useState, useRef } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReceiptData } from '@/utils/thermalPrinter';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReceiptPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: ReceiptData | null;
  storeName?: string;
  onPrint?: () => Promise<void>;
  isPrinterConnected?: boolean;
}

export function ReceiptPreviewModal({
  open,
  onOpenChange,
  receiptData,
  storeName = 'MERCADOPDV',
  onPrint,
  isPrinterConnected = false,
}: ReceiptPreviewModalProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const getPaymentMethodName = (method: string): string => {
    const methods: { [key: string]: string } = {
      'cash': 'Dinheiro',
      'credit': 'Cartão de Crédito',
      'debit': 'Cartão de Débito',
      'pix': 'PIX'
    };
    return methods[method] || method;
  };

  const handleSavePdf = async () => {
    if (!receiptRef.current || !receiptData) return;

    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Largura típica de cupom térmico (80mm = ~226px em 72dpi, mas vamos usar proporção)
      const receiptWidth = 80; // mm
      const imgHeight = (canvas.height * receiptWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [receiptWidth, imgHeight + 10], // +10 para margem
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 5, receiptWidth, imgHeight);

      const timestamp = receiptData.timestamp.toISOString().slice(0, 19).replace(/[:-]/g, '');
      pdf.save(`cupom_${timestamp}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = async () => {
    if (!onPrint) return;
    setIsPrinting(true);
    try {
      await onPrint();
    } finally {
      setIsPrinting(false);
    }
  };

  if (!receiptData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Cupom da Venda
          </DialogTitle>
        </DialogHeader>

        {/* Receipt Preview */}
        <div
          ref={receiptRef}
          className="bg-white text-black p-4 font-mono text-xs border rounded-lg"
          style={{ fontFamily: 'Courier New, monospace' }}
        >
          {/* Header */}
          <div className="text-center mb-2">
            <div className="text-lg font-bold">{storeName}</div>
            <div className="text-[10px]">Sistema de Gestão Completo</div>
            <div className="border-t border-dashed border-gray-400 my-2"></div>
          </div>

          {/* Date */}
          <div className="mb-2">
            <div>Data: {receiptData.timestamp.toLocaleString('pt-BR')}</div>
            <div className="border-t border-dashed border-gray-400 my-2"></div>
          </div>

          {/* Items */}
          <div className="mb-2">
            {receiptData.items.map((item, index) => (
              <div key={index} className="mb-1">
                <div className="font-semibold truncate">{item.name}</div>
                <div className="flex justify-between text-[10px]">
                  <span>
                    {item.isWeightBased
                      ? `${item.quantity.toFixed(3)}${item.unit || 'kg'}`
                      : `${item.quantity}x`}{' '}
                    x R$ {item.unitPrice.toFixed(2)}
                  </span>
                  <span>R$ {item.subtotal.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2"></div>

          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>R$ {receiptData.subtotal.toFixed(2)}</span>
            </div>
            {receiptData.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Desconto:</span>
                <span>-R$ {receiptData.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL:</span>
              <span>R$ {receiptData.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-400 my-2"></div>

          {/* Payment */}
          <div className="space-y-1">
            <div>Pagamento: {getPaymentMethodName(receiptData.paymentMethod)}</div>
            {receiptData.receivedAmount !== undefined && receiptData.change !== undefined && (
              <>
                <div className="flex justify-between">
                  <span>Recebido:</span>
                  <span>R$ {receiptData.receivedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Troco:</span>
                  <span>R$ {receiptData.change.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2"></div>

          {/* Footer */}
          <div className="text-center text-[10px]">
            <div>================================</div>
            <div>Obrigado pela preferência!</div>
            <div>Volte sempre!</div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
          <Button
            variant="outline"
            onClick={handleSavePdf}
            disabled={isGeneratingPdf}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPdf ? 'Gerando...' : 'Salvar PDF'}
          </Button>
          {onPrint && (
            <Button
              onClick={handlePrint}
              disabled={isPrinting || !isPrinterConnected}
              className="flex-1"
              title={!isPrinterConnected ? 'Impressora não conectada' : 'Imprimir cupom'}
            >
              <Printer className="h-4 w-4 mr-2" />
              {isPrinting ? 'Imprimindo...' : 'Imprimir'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
