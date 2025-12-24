import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Store, 
  Printer, 
  Scan, 
  Bell, 
  Shield, 
  Database, 
  Palette,
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  TestTube,
  Wifi,
  HardDrive
} from 'lucide-react';
import { ThermalPrinter } from '@/utils/thermalPrinter';
import { BarcodeScanner } from '@/utils/barcodeScanner';
import { BackupManager } from './BackupManager';

interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  cnpj: string;
  logo?: string;
}

interface PrinterSettings {
  autoConnect: boolean;
  autoPrint: boolean;
  paperWidth: number;
  baudRate: number;
  testOnConnect: boolean;
}

interface ScannerSettings {
  autoActivate: boolean;
  scanTimeout: number;
  minBarcodeLength: number;
  beepOnScan: boolean;
}

interface NotificationSettings {
  lowStock: boolean;
  lowStockThreshold: number;
  dailyReport: boolean;
  salesAlert: boolean;
  systemUpdates: boolean;
}

interface SystemSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'pt-BR' | 'en-US';
  currency: 'BRL' | 'USD';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
}

export function Settings() {
  const { toast } = useToast();
  
  // Estados das configurações
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    name: 'Mercadinho Mix',
    address: 'Rua das Flores, 123 - Centro',
    phone: '(11) 99999-9999',
    email: 'contato@mercadinhomix.com.br',
    cnpj: '12.345.678/0001-90',
  });

  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    autoConnect: true,
    autoPrint: true,
    paperWidth: 80,
    baudRate: 9600,
    testOnConnect: true,
  });

  const [scannerSettings, setScannerSettings] = useState<ScannerSettings>({
    autoActivate: false,
    scanTimeout: 100,
    minBarcodeLength: 8,
    beepOnScan: true,
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    lowStock: true,
    lowStockThreshold: 5,
    dailyReport: false,
    salesAlert: true,
    systemUpdates: true,
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    theme: 'light',
    language: 'pt-BR',
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
    autoBackup: true,
    backupFrequency: 'weekly',
  });

  const [isConnectedToPrinter, setIsConnectedToPrinter] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);

  // Carregar configurações do localStorage
  useEffect(() => {
    const loadSettings = () => {
      const stored = localStorage.getItem('mercadinho-settings');
      if (stored) {
        const settings = JSON.parse(stored);
        setStoreSettings(settings.store || storeSettings);
        setPrinterSettings(settings.printer || printerSettings);
        setScannerSettings(settings.scanner || scannerSettings);
        setNotificationSettings(settings.notifications || notificationSettings);
        setSystemSettings(settings.system || systemSettings);
      }
    };
    loadSettings();
  }, []);

  // Salvar configurações
  const saveSettings = () => {
    const allSettings = {
      store: storeSettings,
      printer: printerSettings,
      scanner: scannerSettings,
      notifications: notificationSettings,
      system: systemSettings,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem('mercadinho-settings', JSON.stringify(allSettings));
    
    toast({
      title: 'Configurações salvas!',
      description: 'Todas as configurações foram salvas com sucesso.',
    });
  };

  // Resetar configurações
  const resetSettings = () => {
    if (confirm('Tem certeza que deseja resetar todas as configurações?')) {
      localStorage.removeItem('mercadinho-settings');
      
      // Resetar estados
      setStoreSettings({
        name: 'Mercadinho Mix',
        address: 'Rua das Flores, 123 - Centro',
        phone: '(11) 99999-9999',
        email: 'contato@mercadinhomix.com.br',
        cnpj: '12.345.678/0001-90',
      });
      
      setPrinterSettings({
        autoConnect: true,
        autoPrint: true,
        paperWidth: 80,
        baudRate: 9600,
        testOnConnect: true,
      });
      
      setScannerSettings({
        autoActivate: false,
        scanTimeout: 100,
        minBarcodeLength: 8,
        beepOnScan: true,
      });
      
      setNotificationSettings({
        lowStock: true,
        lowStockThreshold: 5,
        dailyReport: false,
        salesAlert: true,
        systemUpdates: true,
      });
      
      setSystemSettings({
        theme: 'light',
        language: 'pt-BR',
        currency: 'BRL',
        dateFormat: 'DD/MM/YYYY',
        autoBackup: true,
        backupFrequency: 'weekly',
      });

      toast({
        title: 'Configurações resetadas!',
        description: 'Todas as configurações foram restauradas para o padrão.',
      });
    }
  };

  // Testar impressora
  const testPrinter = async () => {
    const printer = ThermalPrinter.getInstance();
    const success = await printer.printTest();
    
    toast({
      title: success ? 'Teste de impressão enviado!' : 'Erro no teste',
      description: success 
        ? 'Verifique se o cupom de teste foi impresso.' 
        : 'Verifique se a impressora está conectada.',
      variant: success ? 'default' : 'destructive',
    });
  };

  // Conectar impressora
  const connectPrinter = async () => {
    const printer = ThermalPrinter.getInstance();
    const connected = await printer.connect();
    setIsConnectedToPrinter(connected);
    
    toast({
      title: connected ? 'Impressora conectada!' : 'Erro na conexão',
      description: connected 
        ? 'Impressora térmica pronta para uso.' 
        : 'Não foi possível conectar à impressora.',
      variant: connected ? 'default' : 'destructive',
    });
  };

  // Testar scanner
  const testScanner = () => {
    const scanner = BarcodeScanner.getInstance();
    
    if (!isScannerActive) {
      scanner.startListening((barcode) => {
        toast({
          title: 'Código escaneado!',
          description: `Código detectado: ${barcode}`,
        });
      });
      setIsScannerActive(true);
      
      toast({
        title: 'Scanner ativado!',
        description: 'Escaneie um código de barras para testar.',
      });
    } else {
      scanner.stopListening();
      setIsScannerActive(false);
      
      toast({
        title: 'Scanner desativado!',
        description: 'Teste de scanner finalizado.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetSettings}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Resetar
          </Button>
          <Button onClick={saveSettings}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Tudo
          </Button>
        </div>
      </div>

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="store">Loja</TabsTrigger>
          <TabsTrigger value="hardware">Hardware</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="about">Sobre</TabsTrigger>
        </TabsList>

        {/* Configurações da Loja */}
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Informações da Loja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="storeName">Nome da Loja</Label>
                  <Input
                    id="storeName"
                    value={storeSettings.name}
                    onChange={(e) => setStoreSettings({...storeSettings, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="storePhone">Telefone</Label>
                  <Input
                    id="storePhone"
                    value={storeSettings.phone}
                    onChange={(e) => setStoreSettings({...storeSettings, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="storeEmail">E-mail</Label>
                  <Input
                    id="storeEmail"
                    type="email"
                    value={storeSettings.email}
                    onChange={(e) => setStoreSettings({...storeSettings, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="storeCnpj">CNPJ</Label>
                  <Input
                    id="storeCnpj"
                    value={storeSettings.cnpj}
                    onChange={(e) => setStoreSettings({...storeSettings, cnpj: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="storeAddress">Endereço Completo</Label>
                <Input
                  id="storeAddress"
                  value={storeSettings.address}
                  onChange={(e) => setStoreSettings({...storeSettings, address: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações de Hardware */}
        <TabsContent value="hardware">
          <div className="space-y-6">
            {/* Impressora */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Impressora Térmica
                  <Badge variant={isConnectedToPrinter ? "default" : "secondary"}>
                    {isConnectedToPrinter ? "Conectada" : "Desconectada"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={printerSettings.autoConnect}
                      onCheckedChange={(checked) => setPrinterSettings({...printerSettings, autoConnect: checked})}
                    />
                    <Label>Conectar automaticamente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={printerSettings.autoPrint}
                      onCheckedChange={(checked) => setPrinterSettings({...printerSettings, autoPrint: checked})}
                    />
                    <Label>Imprimir automaticamente</Label>
                  </div>
                  <div>
                    <Label>Largura do papel (mm)</Label>
                    <Input
                      type="number"
                      value={printerSettings.paperWidth}
                      onChange={(e) => setPrinterSettings({...printerSettings, paperWidth: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Taxa de transmissão (baud)</Label>
                    <Input
                      type="number"
                      value={printerSettings.baudRate}
                      onChange={(e) => setPrinterSettings({...printerSettings, baudRate: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={connectPrinter} variant="outline">
                    <Wifi className="mr-2 h-4 w-4" />
                    Conectar
                  </Button>
                  <Button onClick={testPrinter} variant="outline">
                    <TestTube className="mr-2 h-4 w-4" />
                    Testar Impressão
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scanner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Leitor de Código de Barras
                  <Badge variant={isScannerActive ? "default" : "secondary"}>
                    {isScannerActive ? "Ativo" : "Inativo"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={scannerSettings.autoActivate}
                      onCheckedChange={(checked) => setScannerSettings({...scannerSettings, autoActivate: checked})}
                    />
                    <Label>Ativar automaticamente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={scannerSettings.beepOnScan}
                      onCheckedChange={(checked) => setScannerSettings({...scannerSettings, beepOnScan: checked})}
                    />
                    <Label>Som ao escanear</Label>
                  </div>
                  <div>
                    <Label>Timeout entre caracteres (ms)</Label>
                    <Input
                      type="number"
                      value={scannerSettings.scanTimeout}
                      onChange={(e) => setScannerSettings({...scannerSettings, scanTimeout: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Tamanho mínimo do código</Label>
                    <Input
                      type="number"
                      value={scannerSettings.minBarcodeLength}
                      onChange={(e) => setScannerSettings({...scannerSettings, minBarcodeLength: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <Button onClick={testScanner} variant="outline">
                  <TestTube className="mr-2 h-4 w-4" />
                  {isScannerActive ? 'Parar Teste' : 'Testar Scanner'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Configurações de Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alerta de estoque baixo</Label>
                    <p className="text-sm text-muted-foreground">Notificar quando produtos estiverem com estoque baixo</p>
                  </div>
                  <Switch
                    checked={notificationSettings.lowStock}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, lowStock: checked})}
                  />
                </div>
                
                {notificationSettings.lowStock && (
                  <div>
                    <Label>Limite para estoque baixo</Label>
                    <Input
                      type="number"
                      value={notificationSettings.lowStockThreshold}
                      onChange={(e) => setNotificationSettings({...notificationSettings, lowStockThreshold: parseInt(e.target.value)})}
                      className="w-32"
                    />
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Relatório diário</Label>
                    <p className="text-sm text-muted-foreground">Receber relatório de vendas diário</p>
                  </div>
                  <Switch
                    checked={notificationSettings.dailyReport}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, dailyReport: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertas de vendas</Label>
                    <p className="text-sm text-muted-foreground">Notificar sobre vendas importantes</p>
                  </div>
                  <Switch
                    checked={notificationSettings.salesAlert}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, salesAlert: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Atualizações do sistema</Label>
                    <p className="text-sm text-muted-foreground">Notificar sobre atualizações disponíveis</p>
                  </div>
                  <Switch
                    checked={notificationSettings.systemUpdates}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, systemUpdates: checked})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sistema */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Configurações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tema</Label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={systemSettings.theme}
                    onChange={(e) => setSystemSettings({...systemSettings, theme: e.target.value as any})}
                  >
                    <option value="light">Claro</option>
                    <option value="dark">Escuro</option>
                    <option value="auto">Automático</option>
                  </select>
                </div>
                <div>
                  <Label>Idioma</Label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={systemSettings.language}
                    onChange={(e) => setSystemSettings({...systemSettings, language: e.target.value as any})}
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </div>
                <div>
                  <Label>Moeda</Label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={systemSettings.currency}
                    onChange={(e) => setSystemSettings({...systemSettings, currency: e.target.value as any})}
                  >
                    <option value="BRL">Real (R$)</option>
                    <option value="USD">Dólar ($)</option>
                  </select>
                </div>
                <div>
                  <Label>Formato de data</Label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={systemSettings.dateFormat}
                    onChange={(e) => setSystemSettings({...systemSettings, dateFormat: e.target.value as any})}
                  >
                    <option value="DD/MM/YYYY">DD/MM/AAAA</option>
                    <option value="MM/DD/YYYY">MM/DD/AAAA</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup */}
        <TabsContent value="backup">
          <BackupManager />
        </TabsContent>

        {/* Sobre */}
        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sobre o Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div>
                  <h3 className="text-2xl font-bold">Mercadinho Mix</h3>
                  <p className="text-muted-foreground">Sistema de Gestão Completo</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Versão</Label>
                    <p>1.0.0</p>
                  </div>
                  <div>
                    <Label>Última atualização</Label>
                    <p>24/12/2024</p>
                  </div>
                  <div>
                    <Label>Desenvolvido por</Label>
                    <p>Kiro AI Assistant</p>
                  </div>
                  <div>
                    <Label>Licença</Label>
                    <p>MIT</p>
                  </div>
                </div>

                <Separator />

                <div className="text-left space-y-2">
                  <h4 className="font-semibold">Funcionalidades:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Ponto de Venda (PDV) completo</li>
                    <li>• Gerenciamento de produtos e estoque</li>
                    <li>• Suporte a leitor de código de barras</li>
                    <li>• Impressora térmica ESC/POS</li>
                    <li>• Relatórios e dashboard</li>
                    <li>• Import/Export de dados</li>
                    <li>• Sistema de backup automático</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}