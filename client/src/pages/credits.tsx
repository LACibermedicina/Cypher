import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Check, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PayPalButton from '@/components/PayPalButton';
import { useState } from 'react';

export default function CreditsPage() {
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);

  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ['/api/credits/packages'],
  });

  const { data: balance } = useQuery({
    queryKey: ['/api/tmc/balance'],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (packageId: string) => {
      return await apiRequest('/api/credits/purchase/create-order', {
        method: 'POST',
        body: JSON.stringify({ packageId }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (data) => {
      setPaypalOrderId(data.orderId);
      setSelectedPackage(data.package);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: 'Falha ao criar ordem de compra: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const captureOrderMutation = useMutation({
    mutationFn: async (orderID: string) => {
      return await apiRequest('/api/credits/purchase/capture', {
        method: 'POST',
        body: JSON.stringify({ orderID }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso!',
        description: 'Créditos adicionados à sua conta!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tmc/balance'] });
      setPaypalOrderId(null);
      setSelectedPackage(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: 'Falha ao processar pagamento: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  if (packagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Comprar Créditos TMC</h1>
        <p className="text-muted-foreground">Recarregue sua conta com créditos para usar as funcionalidades da plataforma</p>
      </div>

      {balance && (
        <Card className="mb-8 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Saldo Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-600 dark:text-orange-400">
              {balance.balance} TMC
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {packages?.map((pkg: any) => (
          <Card 
            key={pkg.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedPackage?.id === pkg.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => !paypalOrderId && createOrderMutation.mutate(pkg.id)}
          >
            <CardHeader>
              <CardTitle className="text-xl">{pkg.name}</CardTitle>
              <CardDescription>{pkg.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    ${pkg.priceUsd}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    R$ {pkg.priceBrl}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{pkg.credits} créditos</span>
                  </div>
                  {pkg.bonusCredits > 0 && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-orange-600 font-semibold">
                        +{pkg.bonusCredits} bônus
                      </span>
                    </div>
                  )}
                </div>
                <Button 
                  className="w-full" 
                  disabled={createOrderMutation.isPending || !!paypalOrderId}
                  data-testid={`button-buy-${pkg.id}`}
                >
                  {createOrderMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Comprar Agora
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
        ))}
      </div>

      {paypalOrderId && selectedPackage && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Finalizar Pagamento</h2>
          <p className="mb-6">
            Complete o pagamento com PayPal para receber seus créditos
          </p>
          <PayPalButton 
            amount={selectedPackage.priceUsd}
            currency="USD"
            intent="CAPTURE"
          />
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Custos das Funcionalidades</CardTitle>
          <CardDescription>Veja quanto custa usar cada recurso da plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Consulta por Vídeo</span>
              <span className="font-semibold">50 TMC</span>
            </div>
            <div className="flex justify-between">
              <span>Consulta via WhatsApp</span>
              <span className="font-semibold">10 TMC</span>
            </div>
            <div className="flex justify-between">
              <span>Análise de Exames com IA</span>
              <span className="font-semibold">15 TMC</span>
            </div>
            <div className="flex justify-between">
              <span>Consulta ao Assistente IA</span>
              <span className="font-semibold">5 TMC</span>
            </div>
            <div className="flex justify-between">
              <span>Assinatura Digital de Prescrição</span>
              <span className="font-semibold">20 TMC</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
