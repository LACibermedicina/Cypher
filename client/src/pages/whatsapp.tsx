import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function WhatsApp() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { messages: wsMessages } = useWebSocket();

  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/whatsapp/messages', selectedPatientId],
    enabled: !!selectedPatientId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: { to: string; message: string }) => 
      apiRequest('POST', '/api/whatsapp/send', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/messages'] });
      setNewMessage("");
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for real-time WhatsApp messages
  useEffect(() => {
    const whatsappMessages = wsMessages.filter(msg => msg.type === 'whatsapp_message');
    if (whatsappMessages.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/messages'] });
    }
  }, [wsMessages, queryClient]);

  const selectedPatient = (patients || []).find((p: any) => p.id === selectedPatientId);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedPatient) return;

    sendMessageMutation.mutate({
      to: selectedPatient.whatsappNumber || selectedPatient.phone,
      message: newMessage.trim(),
    });
  };

  const patientsWithMessages = (patients || []).filter((p: any) => p.whatsappNumber || p.phone);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">WhatsApp IA</h1>
          <p className="text-muted-foreground">Central de mensagens inteligente com agendamento automático</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">WhatsApp Business Conectado</span>
          </div>
          <Badge variant="secondary" className="ai-indicator text-white">
            <i className="fas fa-robot mr-1"></i>
            IA Ativa
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
        {/* Patient List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span>Conversas</span>
                <Badge variant="outline" data-testid="badge-conversation-count">
                  {patientsWithMessages.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {patientsWithMessages.length === 0 ? (
                  <div className="p-6 text-center">
                    <i className="fab fa-whatsapp text-4xl text-muted-foreground mb-3"></i>
                    <p className="text-sm text-muted-foreground">
                      Nenhum paciente com WhatsApp cadastrado
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {patientsWithMessages.map((patient: any) => (
                      <div
                        key={patient.id}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border ${
                          selectedPatientId === patient.id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => setSelectedPatientId(patient.id)}
                        data-testid={`patient-conversation-${patient.id}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                            <i className="fas fa-user text-primary text-sm"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" data-testid={`patient-name-${patient.id}`}>
                              {patient.name}
                            </p>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <i className="fab fa-whatsapp text-green-600"></i>
                              <span data-testid={`patient-phone-${patient.id}`}>
                                {patient.whatsappNumber || patient.phone}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Message Area */}
        <div className="lg:col-span-3">
          {!selectedPatient ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent>
                <div className="text-center">
                  <i className="fab fa-whatsapp text-6xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    Selecione uma conversa
                  </h3>
                  <p className="text-muted-foreground">
                    Escolha um paciente para iniciar ou continuar a conversa
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-primary"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold" data-testid="selected-patient-name">
                        {selectedPatient.name}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <i className="fab fa-whatsapp text-green-600"></i>
                        <span data-testid="selected-patient-phone">
                          {selectedPatient.whatsappNumber || selectedPatient.phone}
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Online</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-patient-details">
                    <i className="fas fa-info-circle mr-2"></i>
                    Detalhes
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[450px]">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : !(messages || []).length ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <i className="fas fa-comments text-4xl text-muted-foreground mb-3"></i>
                        <p className="text-muted-foreground">Ainda não há mensagens</p>
                        <p className="text-sm text-muted-foreground">Inicie uma conversa digitando abaixo</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {(messages || []).map((message: any) => (
                        <div
                          key={message.id}
                          className={`flex ${message.isFromAI || message.toNumber === selectedPatient.whatsappNumber ? 'justify-start' : 'justify-end'}`}
                          data-testid={`message-${message.id}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.isFromAI
                                ? 'message-bubble-ai border border-border'
                                : message.toNumber === selectedPatient.whatsappNumber
                                ? 'bg-muted'
                                : 'message-bubble-user text-white'
                            }`}
                          >
                            {message.isFromAI && (
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="ai-indicator w-4 h-4 rounded-full flex items-center justify-center">
                                  <i className="fas fa-robot text-white text-xs"></i>
                                </div>
                                <span className="text-xs font-medium text-secondary">IA MedPro</span>
                              </div>
                            )}
                            <p className="text-sm" data-testid={`message-text-${message.id}`}>
                              {message.message}
                            </p>
                            <p className={`text-xs mt-1 ${
                              message.isFromAI || message.toNumber === selectedPatient.whatsappNumber 
                                ? 'text-muted-foreground' 
                                : 'text-white/80'
                            }`}>
                              {format(new Date(message.createdAt), 'HH:mm', { locale: ptBR })}
                            </p>
                            {message.appointmentScheduled && (
                              <div className="mt-2 pt-2 border-t border-muted">
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                                  <i className="fas fa-check mr-1"></i>
                                  Consulta agendada automaticamente
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              <div className="border-t border-border p-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={sendMessageMutation.isPending}
                    data-testid="input-new-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    {sendMessageMutation.isPending ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-paper-plane"></i>
                    )}
                  </Button>
                </div>
                <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                  <i className="fas fa-info-circle"></i>
                  <span>As mensagens são processadas automaticamente pela IA para agendamentos e dúvidas clínicas</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
