import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

const STORAGE_KEY = 'mercadopdv_onboarding_done';

interface OnboardingGuideProps {
  onNavigate: (view: 'products' | 'import' | 'cash' | 'pos' | 'users') => void;
}

const steps: { title: string; text: string; action: string; view: 'products' | 'import' | 'cash' | 'pos' | 'users' }[] = [
  {
    title: '1. Cadastre seus produtos',
    text: 'Adicione um a um ou importe tudo de uma planilha.',
    action: 'Cadastrar produtos',
    view: 'products',
  },
  {
    title: '2. Importe sua planilha (opcional)',
    text: 'Tem uma lista em Excel ou CSV? Suba o arquivo e pronto.',
    action: 'Importar planilha',
    view: 'import',
  },
  {
    title: '3. Abra o caixa',
    text: 'Informe o valor inicial em dinheiro para começar o dia.',
    action: 'Abrir caixa',
    view: 'cash',
  },
  {
    title: '4. Faça sua primeira venda',
    text: 'Bipe o código de barras, receba em dinheiro, cartão ou PIX.',
    action: 'Ir para o PDV',
    view: 'pos',
  },
  {
    title: '5. Convide sua equipe',
    text: 'Envie um link para operadores e gerentes acessarem.',
    action: 'Convidar equipe',
    view: 'users',
  },
];

export function OnboardingGuide({ onNavigate }: OnboardingGuideProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(STORAGE_KEY) !== 'true');
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Primeiros passos</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Siga o roteiro abaixo para deixar seu comércio pronto para vender.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={dismiss} aria-label="Fechar primeiros passos">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {steps.map((step) => (
          <div key={step.title} className="flex items-start gap-3 rounded-lg border bg-card p-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-medium leading-tight">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.text}</p>
              <Button size="sm" variant="outline" onClick={() => onNavigate(step.view)}>
                {step.action}
              </Button>
            </div>
          </div>
        ))}
        <div className="md:col-span-2 flex justify-end">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Já configurei, não mostrar mais
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
