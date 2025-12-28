import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Share, 
  MoreVertical, 
  Plus,
  Check,
  ArrowLeft,
  Apple,
  Chrome
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const android = /android/.test(userAgent);
    const mobile = ios || android || /mobile/.test(userAgent);
    
    setIsIOS(ios);
    setIsAndroid(android);
    setIsMobile(mobile);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const defaultTab = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/Mercadinho.jpg" alt="Logo" className="h-8 w-8 rounded-lg" />
            <span className="font-semibold text-lg">Mercadinho Mix</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Download className="h-4 w-4" />
            <span className="text-sm font-medium">Instale o App</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Instale o Mercadinho Mix
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tenha acesso rápido ao sistema de PDV direto na tela inicial do seu dispositivo. 
            Funciona offline e carrega instantaneamente!
          </p>
        </div>

        {/* Already Installed */}
        {isInstalled && (
          <Card className="mb-8 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">App já instalado!</h3>
                <p className="text-green-600 dark:text-green-400 text-sm">
                  O Mercadinho Mix já está instalado no seu dispositivo.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Install Button (for supported browsers) */}
        {deferredPrompt && !isInstalled && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Download className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-semibold text-lg">Instalação Rápida</h3>
                  <p className="text-muted-foreground">
                    Seu navegador suporta instalação direta. Clique para instalar agora!
                  </p>
                </div>
                <Button size="lg" onClick={handleInstall} className="w-full md:w-auto">
                  <Download className="h-5 w-5 mr-2" />
                  Instalar Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                <Smartphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-1">Acesso Rápido</h3>
              <p className="text-sm text-muted-foreground">
                Abra direto da tela inicial, como um app nativo
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold mb-1">Funciona Offline</h3>
              <p className="text-sm text-muted-foreground">
                Continue trabalhando mesmo sem internet
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3">
                <Monitor className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold mb-1">Tela Cheia</h3>
              <p className="text-sm text-muted-foreground">
                Experiência imersiva sem barra do navegador
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Installation Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Instruções de Instalação
            </CardTitle>
            <CardDescription>
              Selecione seu dispositivo para ver as instruções detalhadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="ios" className="flex items-center gap-2">
                  <Apple className="h-4 w-4" />
                  <span className="hidden sm:inline">iPhone/iPad</span>
                  <span className="sm:hidden">iOS</span>
                </TabsTrigger>
                <TabsTrigger value="android" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span>Android</span>
                </TabsTrigger>
                <TabsTrigger value="desktop" className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span className="hidden sm:inline">Computador</span>
                  <span className="sm:hidden">PC</span>
                </TabsTrigger>
              </TabsList>

              {/* iOS Instructions */}
              <TabsContent value="ios" className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <Badge variant="outline" className="mb-3">Safari</Badge>
                  <p className="text-sm text-muted-foreground mb-4">
                    No iPhone e iPad, a instalação deve ser feita pelo Safari.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Abra no Safari</h4>
                      <p className="text-sm text-muted-foreground">
                        Certifique-se de que está usando o navegador Safari (não Chrome ou outro)
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium mb-1 flex items-center gap-2">
                        Toque em Compartilhar
                        <Share className="h-4 w-4 text-blue-500" />
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Na barra inferior (iPhone) ou superior (iPad), toque no ícone de compartilhar
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium mb-1 flex items-center gap-2">
                        Adicionar à Tela de Início
                        <Plus className="h-4 w-4" />
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Role para baixo e toque em "Adicionar à Tela de Início"
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Confirme a instalação</h4>
                      <p className="text-sm text-muted-foreground">
                        Toque em "Adicionar" no canto superior direito para confirmar
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Android Instructions */}
              <TabsContent value="android" className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <Badge variant="outline" className="mb-3 flex items-center gap-1 w-fit">
                    <Chrome className="h-3 w-3" />
                    Chrome
                  </Badge>
                  <p className="text-sm text-muted-foreground mb-4">
                    Recomendamos usar o Google Chrome para a melhor experiência.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Abra no Chrome</h4>
                      <p className="text-sm text-muted-foreground">
                        Acesse este site pelo navegador Chrome
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium mb-1 flex items-center gap-2">
                        Toque no Menu
                        <MoreVertical className="h-4 w-4" />
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Toque nos três pontos no canto superior direito
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Instalar app ou Adicionar à tela inicial</h4>
                      <p className="text-sm text-muted-foreground">
                        Procure pela opção "Instalar app" ou "Adicionar à tela inicial"
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Confirme a instalação</h4>
                      <p className="text-sm text-muted-foreground">
                        Toque em "Instalar" para confirmar e aguarde a instalação
                      </p>
                    </div>
                  </div>
                </div>

                {deferredPrompt && (
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      Ou use o botão abaixo para instalar diretamente:
                    </p>
                    <Button onClick={handleInstall} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Instalar App Agora
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Desktop Instructions */}
              <TabsContent value="desktop" className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex gap-2 mb-3">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Chrome className="h-3 w-3" />
                      Chrome
                    </Badge>
                    <Badge variant="outline">Edge</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A instalação funciona no Chrome, Edge e outros navegadores baseados em Chromium.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Procure o ícone de instalação</h4>
                      <p className="text-sm text-muted-foreground">
                        Na barra de endereço, procure pelo ícone de instalação (um computador com uma seta)
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Clique para instalar</h4>
                      <p className="text-sm text-muted-foreground">
                        Clique no ícone e depois em "Instalar" no diálogo que aparecer
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Acesse pelo atalho</h4>
                      <p className="text-sm text-muted-foreground">
                        O app será adicionado ao menu iniciar/aplicativos e pode ser fixado na barra de tarefas
                      </p>
                    </div>
                  </div>
                </div>

                {deferredPrompt && (
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      Ou use o botão abaixo para instalar diretamente:
                    </p>
                    <Button onClick={handleInstall} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Instalar App Agora
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            Após instalar, o app funcionará offline e sincronizará automaticamente quando conectado.
          </p>
        </div>
      </main>
    </div>
  );
}
