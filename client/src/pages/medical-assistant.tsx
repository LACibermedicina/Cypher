import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Send, Bot, User as UserIcon, Stethoscope, FileText, Sparkles, Loader2 } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  referencesUsed?: string[];
};

type Conversation = {
  id: string;
  userId: string;
  userRole: string;
  messages: Message[];
  context: string;
  referencesUsed: string[];
  lastMessageAt: string;
  isActive: boolean;
  createdAt: string;
};

export default function MedicalAssistant() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inputMessage, setInputMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get or create active conversation
  const { data: conversation, isLoading } = useQuery<Conversation>({
    queryKey: ['/api/chatbot/conversation', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/chatbot/conversation', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }
      return response.json();
    },
    enabled: !!user,
  });

  // Set conversation ID when loaded
  useEffect(() => {
    if (conversation?.id) {
      setCurrentConversationId(conversation.id);
    }
  }, [conversation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chatbot/message', {
        message,
        conversationId: currentConversationId,
        context: user?.role === 'doctor' ? 'doctor_diagnostics' : 'patient_health_query',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/conversation', user?.id] });
      setInputMessage('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message || 'Não foi possível processar sua pergunta.',
        variant: 'destructive',
      });
    },
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(inputMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getContextInfo = () => {
    if (user?.role === 'doctor') {
      return {
        title: 'Assistente Médico AI',
        description: 'Consulte guias médicas, verifique hipóteses diagnósticas e acesse literatura atualizada',
        icon: <Stethoscope className="w-6 h-6" />,
        color: 'from-blue-500 to-cyan-500',
      };
    } else {
      return {
        title: 'Assistente de Saúde AI',
        description: 'Tire dúvidas sobre sintomas e receba orientações baseadas em fontes confiáveis',
        icon: <Bot className="w-6 h-6" />,
        color: 'from-purple-500 to-pink-500',
      };
    }
  };

  const contextInfo = getContextInfo();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl h-screen flex flex-col">
      <Card className="flex-1 flex flex-col shadow-lg">
        <CardHeader className={`bg-gradient-to-r ${contextInfo.color} text-white rounded-t-lg`}>
          <div className="flex items-center gap-3">
            {contextInfo.icon}
            <div>
              <CardTitle className="text-2xl font-bold">{contextInfo.title}</CardTitle>
              <CardDescription className="text-white/90">
                {contextInfo.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-4">
              {!conversation?.messages || conversation.messages.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Comece uma conversa</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {user?.role === 'doctor'
                      ? 'Pergunte sobre guidelines, hipóteses diagnósticas ou procedimentos médicos.'
                      : 'Pergunte sobre sintomas, condições de saúde ou orientações gerais.'}
                  </p>
                </div>
              ) : (
                conversation.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[70%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                      
                      {message.referencesUsed && message.referencesUsed.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="w-3 h-3" />
                            <span>Baseado em {message.referencesUsed.length} referência(s) médica(s)</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs opacity-70 mt-2">
                        {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {sendMessageMutation.isPending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analisando referências médicas...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Input Area */}
          <div className="p-4 bg-muted/30">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  user?.role === 'doctor'
                    ? 'Digite sua pergunta médica...'
                    : 'Digite sua dúvida de saúde...'
                }
                disabled={sendMessageMutation.isPending}
                className="flex-1"
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || sendMessageMutation.isPending}
                className="px-6"
                data-testid="button-send-message"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground">
              {user?.role === 'doctor' ? (
                <span>💡 As respostas são baseadas em guidelines médicos e literatura científica atualizada</span>
              ) : (
                <span>⚠️ Este assistente fornece orientações gerais. Em caso de emergência, procure atendimento médico imediato</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
