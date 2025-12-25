import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useCategories';
import { addCategories } from '@/utils/addCategories';
import { Plus, RefreshCw } from 'lucide-react';

export function CategoryManager() {
  const [isAdding, setIsAdding] = useState(false);
  const { categories } = useCategories();
  const { toast } = useToast();

  const handleAddCategories = async () => {
    setIsAdding(true);
    try {
      await addCategories();
      toast({
        title: 'Categorias adicionadas!',
        description: 'Novas categorias foram adicionadas ao sistema.',
      });
      // Recarregar a página para atualizar a lista
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Erro ao adicionar categorias',
        description: 'Ocorreu um erro ao adicionar as categorias.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gerenciar Categorias</h3>
          <p className="text-sm text-muted-foreground">
            Total de categorias disponíveis: {categories.length}
          </p>
        </div>
        <Button 
          onClick={handleAddCategories}
          disabled={isAdding}
          className="flex items-center gap-2"
        >
          {isAdding ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isAdding ? 'Adicionando...' : 'Adicionar Mais Categorias'}
        </Button>
      </div>
    </Card>
  );
}