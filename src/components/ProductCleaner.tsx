import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function ProductCleaner() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const deleteAllProducts = async () => {
    if (!confirm('⚠️ ATENÇÃO! Tem certeza que quer apagar TODOS OS PRODUTOS? Esta ação não pode ser desfeita!')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Condição sempre verdadeira

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      toast({ title: 'TODOS os produtos foram apagados com sucesso!' });
      
      // Recarregar a página para atualizar a lista
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast({ 
        title: 'Erro ao apagar produtos', 
        description: error.message || 'Erro desconhecido',
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteProductsToday = async () => {
    if (!confirm('Tem certeza que quer apagar os produtos criados hoje?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('products')
        .delete()
        .gte('created_at', today);

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      toast({ title: 'Produtos de hoje apagados com sucesso!' });
      
      // Recarregar a página para atualizar a lista
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast({ 
        title: 'Erro ao apagar produtos', 
        description: error.message || 'Erro desconhecido',
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          🚨 Apagar Produtos Importados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Button 
            onClick={deleteProductsToday}
            variant="destructive"
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Apagando...' : 'Apagar produtos de hoje'}
          </Button>

          <Button 
            onClick={deleteAllProducts}
            variant="destructive"
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Apagando...' : '⚠️ APAGAR TODOS OS PRODUTOS'}
          </Button>
        </div>
        
        {isDeleting && (
          <div className="mt-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-sm text-red-600">Apagando produtos...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}