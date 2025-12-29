import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Upload, 
  Database, 
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BackupInfo {
  date: string;
  size: string;
  tables: string[];
  status: 'success' | 'error' | 'pending';
}

export function BackupManager() {
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupHistory] = useState<BackupInfo[]>([
    {
      date: '2024-12-24 10:30:00',
      size: '2.5 MB',
      tables: ['products', 'sales', 'categories'],
      status: 'success'
    },
    {
      date: '2024-12-23 10:30:00',
      size: '2.3 MB',
      tables: ['products', 'sales', 'categories'],
      status: 'success'
    },
    {
      date: '2024-12-22 10:30:00',
      size: '2.1 MB',
      tables: ['products', 'sales', 'categories'],
      status: 'error'
    }
  ]);

  const createBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(0);

    try {
      // Simular progresso do backup
      const tables = ['products', 'categories', 'sales', 'sale_items', 'profiles'];
      const backupData: any = {};

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        setBackupProgress(((i + 1) / tables.length) * 100);

        // Buscar dados da tabela
        const { data, error } = await supabase
          .from(table as any)
          .select('*');

        if (error) {
          throw new Error(`Erro ao fazer backup da tabela ${table}: ${error.message}`);
        }

        backupData[table] = data;
        
        // Simular delay
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Adicionar metadados do backup
      const backup = {
        metadata: {
          version: '1.0.0',
          created_at: new Date().toISOString(),
          tables: tables,
          total_records: Object.values(backupData).reduce((acc: number, data: any) => acc + data.length, 0)
        },
        data: backupData
      };

      // Fazer download do backup
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `mercadinho-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup criado com sucesso!',
        description: `Backup salvo com ${backup.metadata.total_records} registros.`,
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao criar backup',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsBackingUp(false);
      setBackupProgress(0);
    }
  };

  const restoreBackup = async (file: File) => {
    setIsRestoring(true);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.metadata || !backup.data) {
        throw new Error('Arquivo de backup inválido');
      }

      const tables = Object.keys(backup.data);
      
      for (const table of tables) {
        const records = backup.data[table];
        
        if (records && records.length > 0) {
          // Limpar tabela existente (cuidado!)
          await (supabase.from(table as any) as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          
          // Inserir dados do backup
          const { error } = await supabase
            .from(table as any)
            .insert(records);

          if (error) {
            throw new Error(`Erro ao restaurar tabela ${table}: ${error.message}`);
          }
        }
      }

      toast({
        title: 'Backup restaurado com sucesso!',
        description: `${backup.metadata.total_records} registros foram restaurados.`,
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao restaurar backup',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (confirm('Tem certeza que deseja restaurar este backup? Todos os dados atuais serão substituídos!')) {
        restoreBackup(file);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Ações de Backup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Criar Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Faça um backup completo de todos os dados do sistema.
            </p>
            
            {isBackingUp && (
              <div className="space-y-2">
                <Progress value={backupProgress} />
                <p className="text-sm text-center">{Math.round(backupProgress)}% concluído</p>
              </div>
            )}
            
            <Button 
              onClick={createBackup} 
              disabled={isBackingUp}
              className="w-full"
            >
              <Database className="mr-2 h-4 w-4" />
              {isBackingUp ? 'Criando Backup...' : 'Criar Backup Agora'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restaurar Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Restaure dados de um arquivo de backup anterior.
            </p>
            
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="backup-file"
                disabled={isRestoring}
              />
              <label 
                htmlFor="backup-file" 
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileText className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm">
                  {isRestoring ? 'Restaurando...' : 'Clique para selecionar arquivo'}
                </span>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Backups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backupHistory.map((backup, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(backup.status)}
                  <div>
                    <p className="font-medium">{backup.date}</p>
                    <p className="text-sm text-muted-foreground">
                      {backup.tables.length} tabelas • {backup.size}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    backup.status === 'success' 
                      ? 'bg-green-100 text-green-800' 
                      : backup.status === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {backup.status === 'success' ? 'Sucesso' : 
                     backup.status === 'error' ? 'Erro' : 'Pendente'}
                  </span>
                  
                  {backup.status === 'success' && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configurações Automáticas */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Automático</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Próximo Backup</h4>
              <p className="text-2xl font-bold text-primary">25/12</p>
              <p className="text-sm text-muted-foreground">10:30</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Frequência</h4>
              <p className="text-2xl font-bold text-primary">Semanal</p>
              <p className="text-sm text-muted-foreground">Toda segunda</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Último Backup</h4>
              <p className="text-2xl font-bold text-primary">24/12</p>
              <p className="text-sm text-muted-foreground">Sucesso</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}