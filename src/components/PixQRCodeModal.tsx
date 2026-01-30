import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, Clock, Smartphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { generatePixCode, generateTxId, PixConfig } from '@/utils/pixGenerator';

interface PixQRCodeModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  onPaymentConfirmed: () => void;
  pixConfig: PixConfig | null;
}

export function PixQRCodeModal({
  open,
  onClose,
  amount,
  onPaymentConfirmed,
  pixConfig,
}: PixQRCodeModalProps) {
  const [pixCode, setPixCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos
  const [txId, setTxId] = useState('');
  const { toast } = useToast();

  // Gerar código PIX quando o modal abrir
  useEffect(() => {
    if (open && pixConfig) {
      const newTxId = generateTxId();
      setTxId(newTxId);
      
      const code = generatePixCode(
        { ...pixConfig, txId: newTxId },
        amount,
        `Venda ${newTxId}`
      );
      setPixCode(code);
      setTimeLeft(300);
      setCopied(false);
    }
  }, [open, amount, pixConfig]);

  // Timer de expiração
  useEffect(() => {
    if (!open || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast({
        title: 'Código PIX copiado!',
        description: 'Cole no app do banco para pagar.',
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Tente copiar manualmente.',
        variant: 'destructive',
      });
    }
  };

  const regenerateCode = () => {
    if (pixConfig) {
      const newTxId = generateTxId();
      setTxId(newTxId);
      
      const code = generatePixCode(
        { ...pixConfig, txId: newTxId },
        amount,
        `Venda ${newTxId}`
      );
      setPixCode(code);
      setTimeLeft(300);
      setCopied(false);
      
      toast({
        title: 'QR Code regenerado!',
        description: 'Novo código gerado com sucesso.',
      });
    }
  };

  const handleConfirmPayment = () => {
    onPaymentConfirmed();
    toast({
      title: 'Pagamento confirmado!',
      description: 'A venda foi registrada com sucesso.',
    });
  };

  if (!pixConfig) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <X className="h-5 w-5" />
              PIX não configurado
            </DialogTitle>
            <DialogDescription>
              Configure uma chave PIX nas configurações do sistema para usar este método de pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Pagamento via PIX
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code ou copie o código PIX para pagar
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Valor */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Valor a pagar</p>
            <p className="text-3xl font-bold text-primary">
              R$ {amount.toFixed(2)}
            </p>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 ${timeLeft < 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              {timeLeft > 0 ? `Expira em ${formatTime(timeLeft)}` : 'QR Code expirado'}
            </span>
          </div>

          {/* QR Code */}
          {timeLeft > 0 ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-4 rounded-lg shadow-sm"
            >
              <QRCodeSVG
                value={pixCode}
                size={200}
                level="M"
                includeMargin
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-8">
              <p className="text-muted-foreground">QR Code expirado</p>
              <Button onClick={regenerateCode} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Gerar novo código
              </Button>
            </div>
          )}

          {/* Botão de copiar */}
          {timeLeft > 0 && (
            <Button
              onClick={copyPixCode}
              variant="outline"
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  Código copiado!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar código PIX
                </>
              )}
            </Button>
          )}

          {/* Transaction ID */}
          <p className="text-xs text-muted-foreground">
            ID: {txId}
          </p>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-2">
          <Button onClick={handleConfirmPayment} className="w-full">
            Confirmar Pagamento Recebido
          </Button>
          <Button onClick={onClose} variant="ghost" className="w-full">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
