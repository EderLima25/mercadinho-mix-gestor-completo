import { useState, useEffect, createContext, useContext } from 'react';

export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  cnpj: string;
  logo?: string;
}

export interface PrinterSettings {
  autoConnect: boolean;
  autoPrint: boolean;
  paperWidth: number;
  baudRate: number;
  testOnConnect: boolean;
}

export interface ScannerSettings {
  autoActivate: boolean;
  scanTimeout: number;
  minBarcodeLength: number;
  beepOnScan: boolean;
}

export interface NotificationSettings {
  lowStock: boolean;
  lowStockThreshold: number;
  dailyReport: boolean;
  salesAlert: boolean;
  systemUpdates: boolean;
}

export interface SystemSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'pt-BR' | 'en-US';
  currency: 'BRL' | 'USD';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface AppSettings {
  store: StoreSettings;
  printer: PrinterSettings;
  scanner: ScannerSettings;
  notifications: NotificationSettings;
  system: SystemSettings;
  lastUpdated: string;
}

const defaultSettings: AppSettings = {
  store: {
    name: 'Mercadinho Mix',
    address: 'Rua das Flores, 123 - Centro',
    phone: '(11) 99999-9999',
    email: 'contato@mercadinhomix.com.br',
    cnpj: '12.345.678/0001-90',
  },
  printer: {
    autoConnect: true,
    autoPrint: true,
    paperWidth: 80,
    baudRate: 9600,
    testOnConnect: true,
  },
  scanner: {
    autoActivate: false,
    scanTimeout: 100,
    minBarcodeLength: 8,
    beepOnScan: true,
  },
  notifications: {
    lowStock: true,
    lowStockThreshold: 5,
    dailyReport: false,
    salesAlert: true,
    systemUpdates: true,
  },
  system: {
    theme: 'light',
    language: 'pt-BR',
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
    autoBackup: true,
    backupFrequency: 'weekly',
  },
  lastUpdated: new Date().toISOString(),
};

const STORAGE_KEY = 'mercadinho-settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar configurações do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsedSettings });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Salvar configurações
  const saveSettings = (newSettings: Partial<AppSettings>) => {
    const updatedSettings = {
      ...settings,
      ...newSettings,
      lastUpdated: new Date().toISOString(),
    };

    setSettings(updatedSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
  };

  // Atualizar configurações específicas
  const updateStoreSettings = (storeSettings: Partial<StoreSettings>) => {
    saveSettings({
      store: { ...settings.store, ...storeSettings }
    });
  };

  const updatePrinterSettings = (printerSettings: Partial<PrinterSettings>) => {
    saveSettings({
      printer: { ...settings.printer, ...printerSettings }
    });
  };

  const updateScannerSettings = (scannerSettings: Partial<ScannerSettings>) => {
    saveSettings({
      scanner: { ...settings.scanner, ...scannerSettings }
    });
  };

  const updateNotificationSettings = (notificationSettings: Partial<NotificationSettings>) => {
    saveSettings({
      notifications: { ...settings.notifications, ...notificationSettings }
    });
  };

  const updateSystemSettings = (systemSettings: Partial<SystemSettings>) => {
    saveSettings({
      system: { ...settings.system, ...systemSettings }
    });
  };

  // Resetar configurações
  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Exportar configurações
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `mercadinho-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  // Importar configurações
  const importSettings = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string);
          saveSettings(importedSettings);
          resolve(true);
        } catch (error) {
          console.error('Erro ao importar configurações:', error);
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  };

  // Aplicar tema
  useEffect(() => {
    const applyTheme = () => {
      const { theme } = settings.system;
      const root = document.documentElement;
      
      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      } else {
        root.classList.toggle('dark', theme === 'dark');
      }
    };

    applyTheme();
  }, [settings.system.theme]);

  return {
    settings,
    isLoading,
    saveSettings,
    updateStoreSettings,
    updatePrinterSettings,
    updateScannerSettings,
    updateNotificationSettings,
    updateSystemSettings,
    resetSettings,
    exportSettings,
    importSettings,
  };
}

// Context para usar as configurações globalmente
const SettingsContext = createContext<ReturnType<typeof useSettings> | null>(null);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const settings = useSettings();
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useGlobalSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useGlobalSettings deve ser usado dentro de SettingsProvider');
  }
  return context;
};