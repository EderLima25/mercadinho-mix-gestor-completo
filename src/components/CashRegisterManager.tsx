import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Plus, 
  Minus, 
  Calculator, 
  Clock, 
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCashRegister } from '@/hooks/useCashRegister';

export function CashRegisterManager() {
  const [openAmount, setOpenAmount] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [closeAmount, setCloseAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDescription, setMovementDescription] = useState('');
  const [movementType, setMovementType] = useState<'withdrawal' | 'deposit'>('withdrawal');
  
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);

  const {
    currentRegister,
    registers,
    movements,
    isLoadingCurrent,
    openCashRegister,
    closeCashRegister,
    addCashMovement,
    getExpectedCashAmount,
    getCashDifference,
  } = useCashRegister();

  const handleOpenCashRegister = async () => {
    const amount = parseFloat(openAmount);
    if (isNaN(amount) || amount < 0) {
      return;
    }

    try {
      await openCashRegister.mutateAsync({
        initial_amount: amount,
        notes: openNotes || null,
      });
      
      setOpenAmount('');
      setOpenNotes('');
      setIsOpenDialogOpen(false);
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
    }
  };

  const handleCloseCashRegister = async () => {
    const amount = parseFloat(closeAmount);
    if (isNaN(amount) || amount < 0) {
      return;
    }

    try {
      await closeCashRegister.mutateAsync({
        finalAmount: amount,
        notes: closeNotes || undefined,
      });
      
      setCloseAmount('');
      setCloseNotes('');
      setIsCloseDialogOpen(false);
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
    }
  };

  const handleAddMovement = async () => {
    const amount = parseFloat(movementAmount);
    if (isNaN(amount) || amount <= 0 || !movementDescription.trim() || !currentRegister) {
      return;
    }

    try {
      await addCashMovement.mutateAsync({
        cash_register_id: currentRegister.id,
        type: movementType,
        amount,
        description: movementDescription.trim(),
      });
      
      setMovementAmount('');
      setMovementDescription('');
      setIsMovementDialogOpen(false);
    } catch (error) {
      console.error('Erro ao adicionar movimentação:', error);
    }
  };

  const expectedAmount = getExpectedCashAmount();
  const actualAmount = parseFloat(closeAmount) || 0;
  const difference = getCashDifference(actualAmount);

  if (isLoadingCurrent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Controle de Caixa</h2>
          <p className="text-muted-foreground">
            Gerencie abertura, fechamento e movimentações do caixa
          </p>
        </div>
        
        {!currentRegister ? (
          <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Abrir Caixa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Abrir Caixa</DialogTitle>
                <DialogDescription>
                  Informe o valor inicial em dinheiro no caixa
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="openAmount">Valor Inicial (R$)</Label>
                  <Input
                    id="openAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={openAmount}
                    onChange={(e) => setOpenAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="openNotes">Observações (opcional)</Label>
                  <Textarea
                    id="openNotes"
                    value={openNotes}
                    onChange={(e) => setOpenNotes(e.target.value)}
                    placeholder="Observações sobre a abertura do caixa..."
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleOpenCashRegister}
                  disabled={!openAmount || openCashRegister.isPending}
                >
                  Abrir Caixa
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="flex gap-2">
            <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Calculator className="mr-2 h-4 w-4" />
                  Movimentação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Movimentação</DialogTitle>
                  <DialogDescription>
                    Registre sangrias ou suprimentos no caixa
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label>Tipo de Movimentação</Label>
                    <Select value={movementType} onValueChange={(value: any) => setMovementType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="withdrawal">
                          <div className="flex items-center gap-2">
                            <Minus className="h-4 w-4 text-destructive" />
                            Sangria (Retirada)
                          </div>
                        </SelectItem>
                        <SelectItem value="deposit">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-success" />
                            Suprimento (Depósito)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="movementAmount">Valor (R$)</Label>
                    <Input
                      id="movementAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={movementAmount}
                      onChange={(e) => setMovementAmount(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="movementDescription">Descrição</Label>
                    <Textarea
                      id="movementDescription"
                      value={movementDescription}
                      onChange={(e) => setMovementDescription(e.target.value)}
                      placeholder="Motivo da movimentação..."
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddMovement}
                    disabled={!movementAmount || !movementDescription.trim() || addCashMovement.isPending}
                  >
                    Registrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Fechar Caixa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Fechar Caixa</DialogTitle>
                  <DialogDescription>
                    Conte o dinheiro no caixa e informe o valor final
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between">
                      <span>Valor Inicial:</span>
                      <span className="font-mono">R$ {currentRegister?.initial_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vendas em Dinheiro:</span>
                      <span className="font-mono">R$ {currentRegister?.total_cash_sales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Suprimentos:</span>
                      <span className="font-mono text-success">+R$ {currentRegister?.deposits.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sangrias:</span>
                      <span className="font-mono text-destructive">-R$ {currentRegister?.withdrawals.toFixed(2)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold">
                      <span>Valor Esperado:</span>
                      <span className="font-mono">R$ {expectedAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="closeAmount">Valor Contado (R$)</Label>
                    <Input
                      id="closeAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={closeAmount}
                      onChange={(e) => setCloseAmount(e.target.value)}
                      placeholder="0,00"
                    />
                    {closeAmount && (
                      <div className={`mt-2 p-2 rounded text-sm ${
                        Math.abs(difference) < 0.01 
                          ? 'bg-success/10 text-success' 
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {Math.abs(difference) < 0.01 ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Caixa confere!
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Diferença: {difference > 0 ? '+' : ''}R$ {difference.toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="closeNotes">Observações (opcional)</Label>
                    <Textarea
                      id="closeNotes"
                      value={closeNotes}
                      onChange={(e) => setCloseNotes(e.target.value)}
                      placeholder="Observações sobre o fechamento..."
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCloseCashRegister}
                    disabled={!closeAmount || closeCashRegister.isPending}
                  >
                    Fechar Caixa
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Current Register Status */}
      {currentRegister ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              Caixa Aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Valor Inicial</p>
                <p className="text-2xl font-bold">R$ {currentRegister.initial_amount.toFixed(2)}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Vendas em Dinheiro</p>
                <p className="text-2xl font-bold text-success">R$ {currentRegister.total_cash_sales.toFixed(2)}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Movimentações</p>
                <div className="flex gap-4">
                  <div>
                    <p className="text-sm text-success">+R$ {currentRegister.deposits.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Suprimentos</p>
                  </div>
                  <div>
                    <p className="text-sm text-destructive">-R$ {currentRegister.withdrawals.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Sangrias</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Esperado</p>
                <p className="text-2xl font-bold text-primary">R$ {expectedAmount.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Aberto em: {new Date(currentRegister.opened_at).toLocaleString('pt-BR')}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <DollarSign className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium">Nenhum caixa aberto</p>
            <p className="text-sm">Abra um caixa para começar as operações</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Movements and History */}
      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Movimentações do Caixa Atual</CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {new Date(movement.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={movement.type === 'deposit' ? 'default' : 'destructive'}>
                            {movement.type === 'deposit' ? (
                              <div className="flex items-center gap-1">
                                <Plus className="h-3 w-3" />
                                Suprimento
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Minus className="h-3 w-3" />
                                Sangria
                              </div>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          <span className={movement.type === 'deposit' ? 'text-success' : 'text-destructive'}>
                            {movement.type === 'deposit' ? '+' : '-'}R$ {movement.amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>{movement.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Calculator className="mb-4 h-12 w-12" />
                  <p className="text-lg font-medium">Nenhuma movimentação registrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Caixas</CardTitle>
            </CardHeader>
            <CardContent>
              {registers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Inicial</TableHead>
                      <TableHead>Final</TableHead>
                      <TableHead>Vendas</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registers.map((register) => (
                      <TableRow key={register.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {new Date(register.opened_at).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(register.opened_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {register.closed_at && (
                                <> - {new Date(register.closed_at).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          R$ {register.initial_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {register.final_amount !== null 
                            ? `R$ ${register.final_amount.toFixed(2)}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="font-mono">
                          R$ {register.total_sales.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={register.is_open ? 'default' : 'secondary'}>
                            {register.is_open ? 'Aberto' : 'Fechado'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <History className="mb-4 h-12 w-12" />
                  <p className="text-lg font-medium">Nenhum histórico encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}