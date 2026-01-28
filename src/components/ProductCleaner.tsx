import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function ProductCleaner() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteAllProducts = async () => {
    if (!confirm('⚠️ ATENÇÃO! Tem certeza que quer apagar TODOS OS PRODUTOS?\n\nIsto também apagará o histórico de vendas associado.\n\nEsta ação NÃO pode ser desfeita!')) {
      return;
    }

    // Confirmação dupla
    if (!confirm('🚨 ÚLTIMA CONFIRMAÇÃO!\n\nDigite OK para confirmar que você realmente quer APAGAR TODOS OS PRODUTOS.')) {
      return;
    }

    setIsDeleting(true);
    setStatus('Iniciando limpeza...');
    
    try {
      // 1. Primeiro, deletar todos os sale_items (dependência de products)
      setStatus('Removendo itens de vendas vinculados...');
      const { error: saleItemsError } = await supabase
        .from('sale_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (saleItemsError) {
        console.error('Erro ao deletar sale_items:', saleItemsError);
        // Continuar mesmo com erro pois pode não haver itens
      }

      // 2. Deletar todas as vendas
      setStatus('Removendo vendas...');
      const { error: salesError } = await supabase
        .from('sales')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (salesError) {
        console.error('Erro ao deletar sales:', salesError);
        // Continuar mesmo com erro
      }

      // 3. Agora deletar todos os produtos
      setStatus('Removendo produtos...');
      const { error: productsError } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (productsError) {
        console.error('Erro ao deletar products:', productsError);
        throw productsError;
      }

      setStatus('Concluído!');
      
      // Invalidar caches
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['sales'] });

      toast({ 
        title: '✅ Limpeza concluída!', 
        description: 'Todos os produtos, vendas e itens foram removidos.' 
      });
      
      // Recarregar após breve pausa
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast({ 
        title: 'Erro ao apagar produtos', 
        description: error.message || 'Verifique se você tem permissão de administrador.',
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
      setStatus('');
    }
  };

  const deleteProductsToday = async () => {
    if (!confirm('Tem certeza que quer apagar os produtos criados hoje?')) {
      return;
    }

    setIsDeleting(true);
    setStatus('Apagando produtos de hoje...');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Buscar IDs dos produtos de hoje
      const { data: todayProducts, error: fetchError } = await supabase
        .from('products')
        .select('id')
        .gte('created_at', today);
      
      if (fetchError) throw fetchError;
      
      if (!todayProducts || todayProducts.length === 0) {
        toast({ title: 'Nenhum produto criado hoje.' });
        return;
      }

      const productIds = todayProducts.map(p => p.id);
      
      // Deletar sale_items vinculados a esses produtos
      setStatus('Removendo itens de vendas vinculados...');
      await supabase
        .from('sale_items')
        .delete()
        .in('product_id', productIds);

      // Deletar os produtos
      setStatus('Removendo produtos...');
      const { error } = await supabase
        .from('products')
        .delete()
        .gte('created_at', today);

      if (error) throw error;

      // Invalidar caches
      await queryClient.invalidateQueries({ queryKey: ['products'] });

      toast({ title: `✅ ${productIds.length} produtos de hoje apagados!` });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast({ 
        title: 'Erro ao apagar produtos', 
        description: error.message || 'Verifique suas permissões.',
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
      setStatus('');
    }
  };

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive text-lg">
          <AlertTriangle className="h-5 w-5" />
          Gerenciar Produtos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={deleteProductsToday}
            variant="outline"
            disabled={isDeleting}
            className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Processando...' : 'Apagar produtos de hoje'}
          </Button>

          <Button 
            onClick={deleteAllProducts}
            variant="destructive"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {status || 'Processando...'}
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                ⚠️ APAGAR TODOS
              </>
            )}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-3">
          ⚠️ Apenas administradores podem apagar produtos. Esta ação é irreversível.
        </p>
      </CardContent>
    </Card>
  );
}