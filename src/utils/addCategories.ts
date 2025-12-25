import { supabase } from '@/integrations/supabase/client';

// Categorias para adicionar ao sistema
const newCategories = [
  // Categorias de Alimentos (subcategorias)
  { name: 'Açougue', color: '#E74C3C' },
  { name: 'Padaria', color: '#F39C12' },
  { name: 'Laticínios', color: '#F1C40F' },
  { name: 'Frios e Embutidos', color: '#E67E22' },
  { name: 'Congelados', color: '#3498DB' },
  { name: 'Enlatados e Conservas', color: '#95A5A6' },
  { name: 'Grãos e Cereais', color: '#D35400' },
  { name: 'Massas', color: '#F39C12' },
  { name: 'Temperos e Condimentos', color: '#27AE60' },
  { name: 'Doces e Chocolates', color: '#8E44AD' },
  { name: 'Biscoitos e Salgadinhos', color: '#E67E22' },
  { name: 'Frutas', color: '#27AE60' },
  { name: 'Verduras e Legumes', color: '#2ECC71' },
  { name: 'Óleos e Vinagres', color: '#F1C40F' },

  // Categorias de Bebidas (subcategorias)
  { name: 'Refrigerantes', color: '#3498DB' },
  { name: 'Sucos', color: '#27AE60' },
  { name: 'Águas', color: '#85C1E9' },
  { name: 'Cervejas', color: '#F39C12' },
  { name: 'Vinhos e Destilados', color: '#8E44AD' },
  { name: 'Energéticos', color: '#E74C3C' },
  { name: 'Chás e Cafés', color: '#8B4513' },
  { name: 'Leites e Achocolatados', color: '#F8C471' },

  // Categorias de Limpeza (subcategorias)
  { name: 'Detergentes', color: '#27AE60' },
  { name: 'Desinfetantes', color: '#3498DB' },
  { name: 'Sabões', color: '#85C1E9' },
  { name: 'Amaciantes', color: '#9B59B6' },
  { name: 'Produtos para Banheiro', color: '#E67E22' },
  { name: 'Produtos para Cozinha', color: '#F39C12' },
  { name: 'Inseticidas', color: '#E74C3C' },

  // Categorias de Higiene (subcategorias)
  { name: 'Shampoos e Condicionadores', color: '#9B59B6' },
  { name: 'Sabonetes', color: '#85C1E9' },
  { name: 'Cremes e Loções', color: '#F8C471' },
  { name: 'Desodorantes', color: '#3498DB' },
  { name: 'Produtos Bucais', color: '#27AE60' },
  { name: 'Fraldas', color: '#F39C12' },
  { name: 'Absorventes', color: '#E91E63' },
  { name: 'Papel Higiênico', color: '#95A5A6' },

  // Novas categorias gerais
  { name: 'Utilidades Domésticas', color: '#34495E' },
  { name: 'Papelaria', color: '#9B59B6' },
  { name: 'Pet Shop', color: '#E67E22' },
  { name: 'Brinquedos', color: '#E91E63' },
  { name: 'Eletrônicos', color: '#2C3E50' },
  { name: 'Ferramentas', color: '#7F8C8D' },
  { name: 'Medicamentos', color: '#E74C3C' },
  { name: 'Cosméticos', color: '#AD1457' },
  { name: 'Cigarros', color: '#5D4037' },
  { name: 'Revistas e Jornais', color: '#607D8B' },
];

export async function addCategories() {
  console.log('Iniciando adição de categorias...');
  
  try {
    // Verificar categorias existentes
    const { data: existingCategories, error: fetchError } = await supabase
      .from('categories')
      .select('name');
    
    if (fetchError) {
      console.error('Erro ao buscar categorias existentes:', fetchError);
      return;
    }
    
    const existingNames = new Set(existingCategories?.map(cat => cat.name) || []);
    
    // Filtrar apenas categorias que não existem
    const categoriesToAdd = newCategories.filter(cat => !existingNames.has(cat.name));
    
    if (categoriesToAdd.length === 0) {
      console.log('Todas as categorias já existem!');
      return;
    }
    
    console.log(`Adicionando ${categoriesToAdd.length} novas categorias...`);
    
    // Inserir categorias em lotes
    const batchSize = 10;
    for (let i = 0; i < categoriesToAdd.length; i += batchSize) {
      const batch = categoriesToAdd.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('categories')
        .insert(batch);
      
      if (error) {
        console.error(`Erro ao inserir lote ${Math.floor(i/batchSize) + 1}:`, error);
      } else {
        console.log(`Lote ${Math.floor(i/batchSize) + 1} inserido com sucesso!`);
      }
    }
    
    // Verificar total de categorias
    const { data: finalCategories, error: finalError } = await supabase
      .from('categories')
      .select('name')
      .order('name');
    
    if (finalError) {
      console.error('Erro ao verificar categorias finais:', finalError);
    } else {
      console.log(`Total de categorias: ${finalCategories?.length}`);
      console.log('Categorias disponíveis:', finalCategories?.map(cat => cat.name).join(', '));
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  addCategories();
}