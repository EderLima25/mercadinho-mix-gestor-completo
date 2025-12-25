import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useCategories';
import { addCategories } from '@/utils/addCategories';
import { Plus, RefreshCw } from 'lucide-react';

export function CategoryManager() {
  const [isAdding, setIsAdding] = useState(false);
  const { categories, addCategory } = useCategories();
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
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Gerenciar Categorias</h3>
          <p className="text-sm text-muted-foreground">
            Total de categorias: {categories.length}
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
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-2 p-2 rounded-lg border"
            style={{ borderColor: category.color + '40' }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-sm truncate">{category.name}</span>
          </div>
        ))}
      </div>
      
      {categories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma categoria encontrada.</p>
          <p className="text-sm">Clique em "Adicionar Mais Categorias" para começar.</p>
        </div>
      )}
    </Card>
  );
}