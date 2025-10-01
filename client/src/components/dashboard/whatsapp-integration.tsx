import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/use-websocket";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect } from "react";

export default function WhatsAppIntegration() {
  const { messages: wsMessages, isConnected } = useWebSocket();

  // Get recent WhatsApp messages from multiple patients
  const { data: recentMessages, isLoading } = useQuery({
    queryKey: ['/api/whatsapp/messages/recent'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Listen for real-time WhatsApp messages
  useEffect(() => {
    const whatsappUpdates = wsMessages.filter(msg => msg.type === 'whatsapp_message');
    if (whatsappUpdates.length > 0) {
      // Handle real-time message updates
      console.log('New WhatsApp message received:', whatsappUpdates);
    }
  }, [wsMessages]);

  return (
    <Card data-testid="card-whatsapp-integration">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 whatsapp-green rounded-lg flex items-center justify-center">
              <i className="fab fa-whatsapp text-white text-sm"></i>
            </div>
            <CardTitle>IA WhatsApp - Mensagens Recentes</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={isConnected ? "default" : "destructive"} 
              className={isConnected ? "bg-green-500" : ""}
              data-testid="badge-whatsapp-status"
            >
              <i className="fas fa-circle mr-1"></i>
              {isConnected ? "Online" : "Offline"}
            </Badge>
            <Button variant="outline" size="sm" data-testid="button-whatsapp-settings">
              <i className="fas fa-cog"></i>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !Array.isArray(recentMessages) || recentMessages.length === 0 ? (
            <div className="text-center py-8">
              <i className="fab fa-whatsapp text-4xl text-muted-foreground mb-3"></i>
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Nenhuma mensagem recente
              </h3>
              <p className="text-muted-foreground">
                As mensagens do WhatsApp aparecerão aqui quando chegarem.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sample conversation flow based on design */}
              <div className="space-y-3">
                {/* Patient Message */}
                <div className="flex justify-end">
                  <div className="message-bubble-user text-white px-4 py-2 rounded-l-lg rounded-tr-lg max-w-xs">
                    <p className="text-sm">
                      Oi doutor, preciso marcar uma consulta para próxima semana
                    </p>
                    <p className="text-xs opacity-80 mt-1">
                      {format(new Date(), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex justify-start">
                  <div className="message-bubble-ai border border-border px-4 py-2 rounded-r-lg rounded-tl-lg max-w-xs">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="ai-indicator w-4 h-4 rounded-full flex items-center justify-center">
                        <i className="fas fa-robot text-white text-xs"></i>
                      </div>
                      <span className="text-xs font-medium text-secondary">IA MedPro</span>
                    </div>
                    <p className="text-sm">
                      Olá! Posso ajudá-lo com o agendamento. Tenho disponibilidade na próxima terça (15/01) às 9h ou quinta (17/01) às 14h. Qual horário prefere?
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* Patient Response */}
                <div className="flex justify-end">
                  <div className="message-bubble-user text-white px-4 py-2 rounded-l-lg rounded-tr-lg max-w-xs">
                    <p className="text-sm">Terça às 9h está ótimo!</p>
                    <p className="text-xs opacity-80 mt-1">
                      {format(new Date(), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* AI Confirmation */}
                <div className="flex justify-start">
                  <div className="message-bubble-ai border border-border px-4 py-2 rounded-r-lg rounded-tl-lg max-w-xs">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="ai-indicator w-4 h-4 rounded-full flex items-center justify-center">
                        <i className="fas fa-robot text-white text-xs"></i>
                      </div>
                      <span className="text-xs font-medium text-secondary">IA MedPro</span>
                    </div>
                    <p className="text-sm">
                      ✅ Consulta agendada para terça-feira, 15/01 às 9h00. Você receberá uma confirmação em breve. Precisa de mais alguma coisa?
                    </p>
                    <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-border">
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        <i className="fas fa-check mr-1"></i>
                        Agendado Automaticamente
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Another conversation example */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="message-bubble-user text-white px-4 py-2 rounded-l-lg rounded-tr-lg max-w-xs">
                      <p className="text-sm">
                        Doutor, estou com dor de cabeça há 2 dias. É normal?
                      </p>
                      <p className="text-xs opacity-80 mt-1">
                        {format(new Date(Date.now() - 300000), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="message-bubble-ai border border-border px-4 py-2 rounded-r-lg rounded-tl-lg max-w-xs">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="ai-indicator w-4 h-4 rounded-full flex items-center justify-center">
                          <i className="fas fa-robot text-white text-xs"></i>
                        </div>
                        <span className="text-xs font-medium text-secondary">IA MedPro</span>
                      </div>
                      <p className="text-sm">
                        A dor de cabeça pode ter várias causas. Baseado nas diretrizes do Ministério da Saúde, recomendo: hidratação adequada, descanso e evitar estresse. Se persistir por mais de 3 dias ou piorar, procure atendimento médico.
                      </p>
                      <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-border">
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          <i className="fas fa-book-medical mr-1"></i>
                          Baseado em Diretrizes MS
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(Date.now() - 240000), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <i className="fas fa-info-circle text-secondary"></i>
            <span data-testid="text-ai-stats">
              IA processou 12 mensagens hoje e agendou 4 consultas automaticamente
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
