import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Calendar, Send, Loader2, User, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'appointment' | 'action';
  metadata?: any;
}

interface AIAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContext?: string;
}

export function AIAssistant({ open, onOpenChange, initialContext }: AIAssistantProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = getGreeting();
      setMessages([{
        id: '1',
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
        type: 'text'
      }]);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getGreeting = () => {
    if (!user) {
      return `👋 Olá! Sou o assistente virtual da Telemed. Posso ajudar com:
• Agendamento de consultas
• Análise inicial de sintomas
• Orientações médicas gerais
• Informações sobre nossos serviços

⚠️ Para funcionalidades completas, faça login ou registre-se!`;
    }

    const name = user.name.split(' ')[0];
    
    if (user.role === 'admin') {
      return `👋 Olá, ${name}! Como administrador, posso mostrar:
• Todas as consultas agendadas de todos os médicos
• Estatísticas gerais da plataforma
• Status de pacientes em espera
• Configurações do sistema

Como posso ajudar?`;
    }

    if (user.role === 'doctor') {
      return `👋 Olá, Dr(a). ${name}! Posso mostrar:
• Suas consultas agendadas
• Pacientes que agendaram com você
• Suas consultas em andamento e completadas
• Gestão da sua agenda

O que você gostaria de ver?`;
    }

    if (user.role === 'patient') {
      return `👋 Olá, ${name}! Posso ajudar com:
• Agendar nova consulta
• Ver suas consultas agendadas
• Análise de sintomas
• Orientações médicas

Como posso ajudar hoje?`;
    }

    return `👋 Olá, ${name}! Como posso ajudar você hoje?`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch('/api/chatbot/message', {
        method: 'POST',
        body: JSON.stringify({
          message: input,
          role: user?.role || 'visitor',
          userId: user?.id
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        type: data.type || 'text',
        metadata: data.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If there's an appointment suggestion, show it
      if (data.metadata?.suggestedAppointment) {
        handleAppointmentSuggestion(data.metadata.suggestedAppointment);
      }

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, houve um erro ao processar sua mensagem. Por favor, tente novamente.',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Erro",
        description: "Não foi possível processar sua mensagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppointmentSuggestion = (appointment: any) => {
    const suggestionMessage: Message = {
      id: (Date.now() + 2).toString(),
      role: 'assistant',
      content: `📅 Encontrei um horário disponível:
      
Data: ${new Date(appointment.date).toLocaleDateString('pt-BR')}
Horário: ${appointment.time}
Tipo: ${appointment.type}

Deseja confirmar este agendamento?`,
      timestamp: new Date(),
      type: 'appointment',
      metadata: appointment
    };
    
    setMessages(prev => [...prev, suggestionMessage]);
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => handleSend(), 100);
  };

  const handleConfirmAppointment = async (appointment: any) => {
    try {
      setIsLoading(true);
      
      const res = await fetch('/api/chatbot/schedule', {
        method: 'POST',
        body: JSON.stringify({
          ...appointment,
          userId: user?.id
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to schedule appointment');
      }

      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '✅ Consulta agendada com sucesso! Você receberá uma confirmação por email e WhatsApp.',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, confirmMessage]);

      toast({
        title: "Sucesso!",
        description: "Consulta agendada com sucesso.",
      });

    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível agendar a consulta. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = user?.role === 'patient' ? [
    "Agendar consulta",
    "Analisar sintomas",
    "Ver minhas consultas"
  ] : user?.role === 'doctor' ? [
    "Ver minhas consultas",
    "Pacientes agendados hoje",
    "Consultas em andamento"
  ] : user?.role === 'admin' ? [
    "Ver todas as consultas",
    "Pacientes em espera",
    "Estatísticas do sistema"
  ] : [
    "Agendar consulta",
    "Analisar sintomas",
    "Informações sobre serviços"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Bot className="w-5 h-5 mr-2 text-purple-600" />
              <span>Assistente Virtual IA - Telemed</span>
            </div>
            {user && (
              <Badge variant="outline" className="ml-2">
                {user.role === 'admin' ? 'Admin' : user.role === 'doctor' ? 'Médico' : user.role === 'patient' ? 'Paciente' : user.role}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[80%] ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col">
                    <div className={`rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.type === 'appointment' && message.metadata && message.role === 'assistant' && (
                      <Button
                        size="sm"
                        className="mt-2 w-fit"
                        onClick={() => handleConfirmAppointment(message.metadata)}
                        data-testid="button-confirm-appointment"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Confirmar Agendamento
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground mt-1">
                      {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-gray-50">
          {messages.length <= 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action}
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickAction(action)}
                  disabled={isLoading}
                  data-testid={`button-quick-${action.toLowerCase().replace(/ /g, '-')}`}
                >
                  {action}
                </Button>
              ))}
            </div>
          )}
          <div className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              placeholder="Digite sua pergunta ou descreva seus sintomas..."
              disabled={isLoading}
              data-testid="input-chatbot-message"
            />
            <Button 
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
              data-testid="button-chatbot-send"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          {!user && (
            <p className="text-xs text-muted-foreground mt-2">
              💡 Para funcionalidades completas, faça login ou registre-se.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
