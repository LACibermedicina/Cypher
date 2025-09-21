import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, X, Send, Brain, Calendar, Stethoscope, Minimize2, Maximize2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  metadata?: {
    isSchedulingRequest?: boolean;
    isClinicalQuestion?: boolean;
    diagnosticHypotheses?: Array<{
      condition: string;
      probability: number;
      reasoning: string;
    }>;
    suggestedAction?: string;
  };
}

interface ChatbotResponse {
  response: string;
  isSchedulingRequest?: boolean;
  isClinicalQuestion?: boolean;
  diagnosticHypotheses?: Array<{
    condition: string;
    probability: number;
    reasoning: string;
  }>;
  suggestedAction?: string;
}

export default function FloatingChatbot() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: t('chatbot.welcome_message'),
      timestamp: new Date(),
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // AI Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string): Promise<ChatbotResponse> => {
      // Try diagnostic analysis first for clinical symptoms
      if (message.toLowerCase().includes('dor') || 
          message.toLowerCase().includes('sintoma') ||
          message.toLowerCase().includes('sinto') ||
          message.toLowerCase().includes('febre') ||
          message.toLowerCase().includes('problema')) {
        
        try {
          const diagnosticResponse = await apiRequest('POST', '/api/ai/diagnostic-analysis', {
            symptoms: message,
            patientHistory: ''
          }) as any;
          
          return {
            response: diagnosticResponse?.analysis || 'Análise diagnóstica realizada com sucesso.',
            isClinicalQuestion: true,
            diagnosticHypotheses: diagnosticResponse?.hypotheses || []
          };
        } catch (error) {
          // Fall back to general chat
        }
      }
      
      // Check for scheduling keywords
      if (message.toLowerCase().includes('agendar') ||
          message.toLowerCase().includes('consulta') ||
          message.toLowerCase().includes('horário') ||
          message.toLowerCase().includes('marcar')) {
        
        try {
          const schedulingResponse = await apiRequest('POST', '/api/ai/scheduling-analysis', {
            message,
            availableSlots: ['09:00', '14:00', '16:00'] // Mock available slots
          }) as any;
          
          return {
            response: schedulingResponse?.response || 'Posso ajudar com o agendamento. Que horário prefere?',
            isSchedulingRequest: true,
            suggestedAction: schedulingResponse?.suggestedAction
          };
        } catch (error) {
          // Fall back to general chat
        }
      }

      // General WhatsApp-style AI chat
      try {
        const chatResponse = await apiRequest('POST', '/api/ai/whatsapp-analysis', {
          message,
          patientHistory: ''
        }) as any;
        
        return {
          response: chatResponse?.response || 'Como posso ajudá-lo hoje?'
        };
      } catch (error) {
        throw new Error('Erro ao processar mensagem');
      }
    },
    onSuccess: (data) => {
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        metadata: {
          isSchedulingRequest: data.isSchedulingRequest,
          isClinicalQuestion: data.isClinicalQuestion,
          diagnosticHypotheses: data.diagnosticHypotheses,
          suggestedAction: data.suggestedAction
        }
      };
      
      setMessages(prev => [...prev, aiMessage]);
    },
    onError: () => {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: t('chatbot.error_message'),
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: t('chatbot.error_title'),
        description: t('chatbot.error_description'),
        variant: 'destructive',
      });
    },
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim() || chatMutation.isPending) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Send to AI
    chatMutation.mutate(currentMessage);
    setCurrentMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        type: 'ai',
        content: t('chatbot.welcome_message'),
        timestamp: new Date(),
      }
    ]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageIcon = (metadata?: ChatMessage['metadata']) => {
    if (metadata?.isClinicalQuestion) return <Stethoscope className="w-4 h-4" />;
    if (metadata?.isSchedulingRequest) return <Calendar className="w-4 h-4" />;
    if (metadata?.diagnosticHypotheses?.length) return <Brain className="w-4 h-4" />;
    return null;
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:scale-105 transition-transform bg-gradient-to-br from-primary to-medical-primary"
          data-testid="button-open-chatbot"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={`w-96 shadow-xl border-0 ${isMinimized ? 'h-16' : 'h-[500px]'} transition-all duration-300`}>
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary to-medical-primary text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-medium">
                {t('chatbot.title')}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-white/20 w-8 h-8 p-0"
                data-testid="button-minimize-chatbot"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 w-8 h-8 p-0"
                data-testid="button-close-chatbot"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[calc(500px-4rem)]">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-lg px-3 py-2 ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                      data-testid={`message-${message.type}-${message.id}`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.type === 'ai' && getMessageIcon(message.metadata) && (
                          <div className="mt-1">
                            {getMessageIcon(message.metadata)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{message.content}</p>
                          
                          {/* Show diagnostic hypotheses if available */}
                          {message.metadata?.diagnosticHypotheses && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium">{t('chatbot.diagnostic_hypotheses')}:</p>
                              {message.metadata.diagnosticHypotheses.slice(0, 3).map((hypothesis, index) => (
                                <div key={index} className="flex items-center justify-between text-xs">
                                  <span>{hypothesis.condition}</span>
                                  <Badge variant="outline" className="ml-2">
                                    {hypothesis.probability}%
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <p className="text-xs opacity-70 mt-1">
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 max-w-xs">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm text-muted-foreground">
                          {t('chatbot.typing')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-3">
              <div className="flex space-x-2">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('chatbot.input_placeholder')}
                  disabled={chatMutation.isPending}
                  className="flex-1"
                  data-testid="input-chatbot-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || chatMutation.isPending}
                  size="sm"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-1 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMessage(t('chatbot.quick_scheduling'))}
                  className="text-xs"
                  data-testid="button-quick-scheduling"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  {t('chatbot.schedule')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMessage(t('chatbot.quick_symptoms'))}
                  className="text-xs"
                  data-testid="button-quick-symptoms"
                >
                  <Stethoscope className="w-3 h-3 mr-1" />
                  {t('chatbot.symptoms')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  className="text-xs"
                  data-testid="button-clear-chat"
                >
                  <X className="w-3 h-3 mr-1" />
                  {t('chatbot.clear')}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}