import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Coins, 
  Send, 
  CreditCard, 
  History, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Zap,
  Settings,
  Info,
  Wallet,
  Clock,
  User,
  FileText
} from "lucide-react";
import { format } from "date-fns";

interface TmcSystemProps {
  userRole: 'admin' | 'doctor' | 'patient' | 'visitor' | 'researcher';
  showAdminFeatures?: boolean;
  compact?: boolean;
}

interface TmcTransaction {
  id: string;
  type: 'credit' | 'debit' | 'transfer' | 'recharge' | 'commission';
  amount: number;
  reason: string;
  functionUsed?: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  relatedUserId?: string;
}

interface TmcConfig {
  id: string;
  functionName: string;
  costInCredits: number;
  description: string;
  category: string;
  minimumRole: string;
  bonusForPatient: number;
  commissionPercentage: number;
  isActive: boolean;
}

export function TmcSystem({ userRole, showAdminFeatures = false, compact = false }: TmcSystemProps) {
  const { toast } = useToast();
  const [transferAmount, setTransferAmount] = useState('');
  const [transferUserId, setTransferUserId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeUserId, setRechargeUserId] = useState('');
  const [rechargeMethod, setRechargeMethod] = useState('manual');

  // Get TMC Balance
  const { data: balance, isLoading: balanceLoading } = useQuery<{balance: number, currency: string}>({
    queryKey: ['/api/tmc/balance'],
  });

  // Get TMC Transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<TmcTransaction[]>({
    queryKey: ['/api/tmc/transactions'],
  });

  // Get TMC Configuration
  const { data: tmcConfig, isLoading: configLoading } = useQuery<TmcConfig[]>({
    queryKey: ['/api/tmc/config'],
    enabled: showAdminFeatures || userRole === 'admin' || userRole === 'doctor',
  });

  // Transfer Credits Mutation
  const transferMutation = useMutation({
    mutationFn: async (data: { toUserId: string; amount: number; reason: string }) => {
      const response = await fetch('/api/tmc/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Transfer failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tmc/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tmc/transactions'] });
      setTransferAmount('');
      setTransferUserId('');
      setTransferReason('');
      toast({
        title: "Transferência Realizada",
        description: "Créditos TMC transferidos com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na Transferência",
        description: error.message || "Falha ao transferir créditos TMC",
        variant: "destructive",
      });
    },
  });

  // Recharge Credits Mutation
  const rechargeMutation = useMutation({
    mutationFn: async (data: { userId: string; amount: number; method: string }) => {
      const response = await fetch('/api/tmc/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Recharge failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tmc/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tmc/transactions'] });
      setRechargeAmount('');
      setRechargeUserId('');
      toast({
        title: "Recarga Realizada",
        description: "Créditos TMC adicionados com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na Recarga",
        description: error.message || "Falha ao recarregar créditos TMC",
        variant: "destructive",
      });
    },
  });

  const handleTransfer = () => {
    if (!transferUserId || !transferAmount || parseInt(transferAmount) <= 0) {
      toast({
        title: "Dados Inválidos",
        description: "Por favor, preencha todos os campos corretamente.",
        variant: "destructive",
      });
      return;
    }

    transferMutation.mutate({
      toUserId: transferUserId,
      amount: parseInt(transferAmount),
      reason: transferReason || 'Transferência entre usuários',
    });
  };

  const handleRecharge = () => {
    if (!rechargeUserId || !rechargeAmount || parseInt(rechargeAmount) <= 0) {
      toast({
        title: "Dados Inválidos",
        description: "Por favor, preencha todos os campos corretamente.",
        variant: "destructive",
      });
      return;
    }

    rechargeMutation.mutate({
      userId: rechargeUserId,
      amount: parseInt(rechargeAmount),
      method: rechargeMethod,
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'debit':
        return <ArrowDownLeft className="w-4 h-4 text-red-600" />;
      case 'transfer':
        return <Send className="w-4 h-4 text-blue-600" />;
      case 'recharge':
        return <CreditCard className="w-4 h-4 text-purple-600" />;
      case 'commission':
        return <Gift className="w-4 h-4 text-orange-600" />;
      default:
        return <Coins className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
      case 'recharge':
      case 'commission':
        return 'text-green-600';
      case 'debit':
        return 'text-red-600';
      case 'transfer':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (compact) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="w-5 h-5 text-blue-600" />
            Sistema TMC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance Display */}
          <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-800">
              {balanceLoading ? "..." : `${balance?.balance || 0} TMC`}
            </div>
            <p className="text-sm text-blue-600">Saldo Atual</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full" data-testid="button-transfer-tmc">
                  <Send className="w-4 h-4 mr-1" />
                  Transferir
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transferir Créditos TMC</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="transferUserId">ID do Usuário</Label>
                    <Input
                      id="transferUserId"
                      value={transferUserId}
                      onChange={(e) => setTransferUserId(e.target.value)}
                      placeholder="ID do usuário de destino"
                      data-testid="input-transfer-user"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transferAmount">Quantidade</Label>
                    <Input
                      id="transferAmount"
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="Quantidade de créditos"
                      data-testid="input-transfer-amount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transferReason">Motivo (opcional)</Label>
                    <Input
                      id="transferReason"
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      placeholder="Motivo da transferência"
                      data-testid="input-transfer-reason"
                    />
                  </div>
                  <Button 
                    onClick={handleTransfer}
                    disabled={transferMutation.isPending}
                    className="w-full"
                    data-testid="button-confirm-transfer"
                  >
                    {transferMutation.isPending ? "Transferindo..." : "Transferir"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full" data-testid="button-view-history">
                  <History className="w-4 h-4 mr-1" />
                  Histórico
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Histórico de Transações TMC</DialogTitle>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {transactionsLoading ? (
                    <p>Carregando histórico...</p>
                  ) : (
                    transactions?.map((transaction: TmcTransaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <p className="font-medium">{transaction.reason}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount} TMC
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Saldo: {transaction.balanceAfter} TMC
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-6 h-6 text-blue-600" />
          Sistema de Créditos TMC
          <Badge variant="secondary" className="ml-auto">Moeda Digital</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="balance" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="balance" data-testid="tab-balance">Saldo</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">Histórico</TabsTrigger>
            <TabsTrigger value="transfer" data-testid="tab-transfer">Transferir</TabsTrigger>
            {showAdminFeatures && (
              <TabsTrigger value="admin" data-testid="tab-admin">Admin</TabsTrigger>
            )}
          </TabsList>

          {/* Balance Tab */}
          <TabsContent value="balance" className="space-y-6">
            <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <div className="text-4xl font-bold text-blue-800 mb-2">
                {balanceLoading ? "..." : `${balance?.balance || 0} TMC`}
              </div>
              <p className="text-blue-600">Saldo Atual de Créditos</p>
            </div>

            {/* Balance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-muted-foreground">Este Mês</p>
                  <p className="text-xl font-semibold">+{
                    transactions?.filter((t: TmcTransaction) => 
                      t.type === 'credit' && 
                      new Date(t.createdAt).getMonth() === new Date().getMonth()
                    ).reduce((sum: number, t: TmcTransaction) => sum + t.amount, 0) || 0
                  } TMC</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <ArrowDownLeft className="w-8 h-8 mx-auto mb-2 text-red-600" />
                  <p className="text-sm text-muted-foreground">Gastos Este Mês</p>
                  <p className="text-xl font-semibold">
                    {Math.abs(
                      transactions?.filter((t: TmcTransaction) => 
                        t.type === 'debit' && 
                        new Date(t.createdAt).getMonth() === new Date().getMonth()
                      ).reduce((sum: number, t: TmcTransaction) => sum + Math.abs(t.amount), 0) || 0
                    )} TMC
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Gift className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-sm text-muted-foreground">Comissões</p>
                  <p className="text-xl font-semibold">+{
                    transactions?.filter((t: TmcTransaction) => t.type === 'commission')
                      .reduce((sum: number, t: TmcTransaction) => sum + t.amount, 0) || 0
                  } TMC</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-3" data-testid="transaction-history">
              {transactionsLoading ? (
                <p>Carregando histórico...</p>
              ) : transactions?.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma transação encontrada</p>
              ) : (
                transactions?.map((transaction: TmcTransaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <p className="font-medium">{transaction.reason}</p>
                        {transaction.functionUsed && (
                          <p className="text-sm text-blue-600">Função: {transaction.functionUsed}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${getTransactionColor(transaction.type)}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount} TMC
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Saldo: {transaction.balanceAfter} TMC
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Transfer Tab */}
          <TabsContent value="transfer" className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="transferUserId">ID do Usuário de Destino</Label>
                <Input
                  id="transferUserId"
                  value={transferUserId}
                  onChange={(e) => setTransferUserId(e.target.value)}
                  placeholder="ID do usuário para transferir"
                  data-testid="input-transfer-user-id"
                />
              </div>
              
              <div>
                <Label htmlFor="transferAmount">Quantidade de Créditos</Label>
                <Input
                  id="transferAmount"
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Quantidade de TMC a transferir"
                  data-testid="input-transfer-amount"
                />
              </div>
              
              <div>
                <Label htmlFor="transferReason">Motivo da Transferência</Label>
                <Textarea
                  id="transferReason"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Descreva o motivo da transferência..."
                  data-testid="input-transfer-reason"
                />
              </div>
              
              <Button 
                onClick={handleTransfer}
                disabled={transferMutation.isPending || !transferUserId || !transferAmount}
                className="w-full"
                data-testid="button-transfer-credits"
              >
                <Send className="w-4 h-4 mr-2" />
                {transferMutation.isPending ? "Transferindo..." : "Transferir Créditos"}
              </Button>
            </div>
          </TabsContent>

          {/* Admin Tab */}
          {showAdminFeatures && (
            <TabsContent value="admin" className="space-y-6">
              <div className="space-y-6">
                
                {/* Recharge Credits */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Recarregar Créditos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="rechargeUserId">ID do Usuário</Label>
                      <Input
                        id="rechargeUserId"
                        value={rechargeUserId}
                        onChange={(e) => setRechargeUserId(e.target.value)}
                        placeholder="ID do usuário para recarregar"
                        data-testid="input-recharge-user-id"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="rechargeAmount">Quantidade</Label>
                      <Input
                        id="rechargeAmount"
                        type="number"
                        value={rechargeAmount}
                        onChange={(e) => setRechargeAmount(e.target.value)}
                        placeholder="Quantidade de créditos"
                        data-testid="input-recharge-amount"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="rechargeMethod">Método</Label>
                      <Select value={rechargeMethod} onValueChange={setRechargeMethod}>
                        <SelectTrigger data-testid="select-recharge-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="card">Cartão</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="bank_transfer">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      onClick={handleRecharge}
                      disabled={rechargeMutation.isPending || !rechargeUserId || !rechargeAmount}
                      className="w-full"
                      data-testid="button-recharge-credits"
                    >
                      {rechargeMutation.isPending ? "Processando..." : "Recarregar Créditos"}
                    </Button>
                  </CardContent>
                </Card>

                {/* TMC Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Configuração do Sistema TMC
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {configLoading ? (
                        <p>Carregando configurações...</p>
                      ) : (
                        tmcConfig?.map((config: TmcConfig) => (
                          <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{config.functionName}</p>
                              <p className="text-sm text-muted-foreground">{config.description}</p>
                              <Badge variant="outline" className="text-xs">
                                {config.category}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-blue-600">
                                {config.costInCredits} TMC
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Min: {config.minimumRole}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}