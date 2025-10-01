import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UserPlus, Calendar, FileText, Shield, Phone, MessageCircle, Users, Clock, MapPin, Star, Globe, Video, Bot } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Link } from "wouter"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { AIAssistant } from "@/components/chatbot/AIAssistant"

interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  duration: string;
  available: boolean;
  specialty: string;
  rating: number;
}

interface Feature {
  icon: any;
  title: string;
  description: string;
}

export function DesktopVisitorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [showChatBot, setShowChatBot] = useState(false);
  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  // Support phone number - will be configurable in admin later
  const supportPhone = '+5511960708817';

  const handleSupportContact = () => {
    setShowSupportDialog(true);
  };

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent('Olá! Preciso de suporte com a plataforma Telemed.');
    window.open(`https://wa.me/${supportPhone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleSupportSubmit = () => {
    // Here we would send the support form to the backend
    toast({
      title: "Mensagem enviada!",
      description: "Nossa equipe entrará em contato em breve.",
    });
    setShowSupportDialog(false);
    setSupportForm({ name: '', email: '', phone: '', message: '' });
  };

  const handleChatBot = () => {
    setShowChatBot(true);
  };

  const handleServiceBooking = (serviceId: string) => {
    // For now, redirect to AI assistant for symptom analysis and appointment booking
    setShowChatBot(true);
  };
  
  // Expanded services for desktop view
  const publicServices: Service[] = [
    {
      id: "1",
      name: "Consulta Geral",
      description: "Consulta médica geral online com profissionais qualificados",
      price: "150 TMC",
      duration: "30 min",
      available: true,
      specialty: "Clínica Geral",
      rating: 4.9
    },
    {
      id: "2", 
      name: "Orientação Médica",
      description: "Esclarecimento de dúvidas médicas e orientações preventivas",
      price: "80 TMC",
      duration: "15 min",
      available: true,
      specialty: "Orientação",
      rating: 4.8
    },
    {
      id: "3",
      name: "Avaliação de Exames",
      description: "Análise e interpretação de exames laboratoriais e de imagem",
      price: "100 TMC",
      duration: "20 min",
      available: false,
      specialty: "Diagnóstico",
      rating: 4.7
    },
    {
      id: "4",
      name: "Consulta Cardiologista",
      description: "Consulta especializada em cardiologia",
      price: "200 TMC",
      duration: "45 min",
      available: true,
      specialty: "Cardiologia",
      rating: 4.9
    },
    {
      id: "5",
      name: "Consulta Dermatologista",
      description: "Consulta especializada em dermatologia",
      price: "180 TMC",
      duration: "40 min",
      available: true,
      specialty: "Dermatologia",
      rating: 4.8
    }
  ];

  const platformFeatures: Feature[] = [
    {
      icon: Video,
      title: "Videochamadas HD",
      description: "Consultas por vídeo com qualidade profissional"
    },
    {
      icon: Shield,
      title: "Segurança LGPD",
      description: "Dados protegidos conforme legislação brasileira"
    },
    {
      icon: Clock,
      title: "Disponível 24/7",
      description: "Atendimento disponível todos os dias da semana"
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Integrado",
      description: "Comunicação rápida via WhatsApp"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Hero Section */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <CardContent className="p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Globe className="w-12 h-12" />
                  <Badge className="bg-white/20 text-white text-lg px-4 py-2">Visitante</Badge>
                </div>
                <h1 className="text-4xl font-bold mb-4">Bem-vindo ao Telemed</h1>
                <p className="text-xl text-blue-100 mb-6">
                  Plataforma de telemedicina com tecnologia avançada para cuidar da sua saúde
                </p>
                <div className="flex space-x-4">
                  <Link href="/register">
                    <Button 
                      size="lg" 
                      className="bg-white text-blue-600 hover:bg-blue-50"
                      data-testid="button-register-now"
                    >
                      Registrar Agora
                    </Button>
                  </Link>
                  <Link href="/features">
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="border-white text-white hover:bg-white/10"
                      data-testid="button-learn-more"
                    >
                      Saiba Mais
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white/10 rounded-2xl p-8">
                  <h3 className="text-2xl font-bold mb-4">Estatísticas da Plataforma</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-3xl font-bold">1,245+</div>
                      <div className="text-blue-200">Consultas Realizadas</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">150+</div>
                      <div className="text-blue-200">Médicos Ativos</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">4.9⭐</div>
                      <div className="text-blue-200">Avaliação Média</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">24/7</div>
                      <div className="text-blue-200">Suporte Ativo</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg border-medical-primary/20 hover:shadow-xl transition-shadow">
            <CardHeader className="pb-4">
              <h2 className="text-xl font-semibold flex items-center text-medical-primary">
                <Users className="w-6 h-6 mr-2" />
                Registro como Paciente
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Acesse consultas médicas online, gerencie seu histórico de saúde e agende consultas facilmente.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-medical-primary rounded-full"></div>
                  <span>Consultas ilimitadas</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-medical-primary rounded-full"></div>
                  <span>Histórico médico digital</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-medical-primary rounded-full"></div>
                  <span>Receitas digitais</span>
                </li>
              </ul>
              <Link href="/register/patient">
                <Button className="w-full bg-medical-primary hover:bg-medical-primary/90" data-testid="button-register-patient">
                  Registrar como Paciente
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-medical-secondary/20 hover:shadow-xl transition-shadow">
            <CardHeader className="pb-4">
              <h2 className="text-xl font-semibold flex items-center text-medical-secondary">
                <FileText className="w-6 h-6 mr-2" />
                Registro como Médico
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Una-se à nossa rede de profissionais e ofereça seus serviços através da telemedicina.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-medical-secondary rounded-full"></div>
                  <span>Agenda flexível</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-medical-secondary rounded-full"></div>
                  <span>Sistema TMC de pagamentos</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-medical-secondary rounded-full"></div>
                  <span>Ferramentas profissionais</span>
                </li>
              </ul>
              <Link href="/register/doctor">
                <Button variant="outline" className="w-full border-medical-secondary text-medical-secondary hover:bg-medical-secondary/10" data-testid="button-register-doctor">
                  Registrar como Médico
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Available Services */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold flex items-center">
                <Calendar className="w-6 h-6 mr-2 text-blue-600" />
                Serviços Disponíveis
              </h2>
              <Badge variant="secondary" className="text-base px-4 py-2">
                {publicServices.filter(s => s.available).length} serviços ativos
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {publicServices.map((service) => (
                <Card key={service.id} className={`border transition-all hover:shadow-md ${
                  service.available ? 'border-blue-200' : 'border-gray-200 opacity-60'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg" data-testid={`text-service-name-${service.id}`}>
                          {service.name}
                        </h3>
                        <Badge variant="outline" className="mt-1">{service.specialty}</Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{service.rating}</span>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-4">{service.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{service.duration}</span>
                        </div>
                        <div className="text-lg font-bold text-green-600">{service.price}</div>
                      </div>
                      <Badge 
                        variant={service.available ? "default" : "secondary"}
                        className="text-sm"
                      >
                        {service.available ? "Disponível" : "Indisponível"}
                      </Badge>
                    </div>
                    <Button 
                      className="w-full" 
                      disabled={!service.available}
                      onClick={() => handleServiceBooking(service.id)}
                      data-testid={`button-book-${service.id}`}
                    >
                      {service.available ? "Agendar Consulta" : "Indisponível"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Features */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <h2 className="text-2xl font-semibold flex items-center">
              <Shield className="w-6 h-6 mr-2 text-blue-600" />
              Recursos da Plataforma
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {platformFeatures.map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact and Support */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-4">
              <h2 className="text-xl font-semibold flex items-center text-green-800">
                <Phone className="w-6 h-6 mr-2" />
                Contato & Suporte
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <MessageCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="font-semibold text-green-800">WhatsApp Oficial</div>
                    <div className="text-green-600">+55 11 96070-8817</div>
                    <div className="text-sm text-green-500">Disponível 24h para suporte</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <MapPin className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="font-semibold text-green-800">Localização</div>
                    <div className="text-green-600">São Paulo, SP - Brasil</div>
                    <div className="text-sm text-green-500">Matriz da operação</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleSupportContact}
                  data-testid="button-contact-support"
                >
                  Falar com Suporte
                </Button>
                <Button 
                  variant="outline"
                  className="w-full border-green-600 text-green-600 hover:bg-green-50"
                  onClick={handleWhatsAppContact}
                  data-testid="button-whatsapp-contact"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp Direto
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
            <CardHeader className="pb-4">
              <h2 className="text-xl font-semibold flex items-center text-red-800">
                <Shield className="w-6 h-6 mr-2" />
                Emergência Médica
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-red-600 mb-2">192</div>
                <div className="text-red-700 font-semibold">SAMU - Serviço de Atendimento Móvel de Urgência</div>
              </div>
              <p className="text-red-600 text-center">
                Em caso de emergência médica, ligue imediatamente para o SAMU ou dirija-se ao hospital mais próximo.
              </p>
              <div className="text-center text-sm text-red-500">
                O Telemed não substitui atendimento de emergência
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Chatbot Section */}
        <Card className="shadow-lg bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader className="pb-4">
            <h2 className="text-xl font-semibold flex items-center text-purple-800">
              <Bot className="w-6 h-6 mr-2" />
              Assistente Virtual IA
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-purple-600">
              Nosso assistente virtual pode ajudar com agendamento de consultas, análise de sintomas e orientações médicas iniciais.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={handleChatBot}
                data-testid="button-ai-symptom-analysis"
              >
                <Bot className="w-4 h-4 mr-2" />
                Análise de Sintomas
              </Button>
              <Button 
                variant="outline" 
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={handleChatBot}
                data-testid="button-ai-appointment"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Agendar Consulta
              </Button>
              <Button 
                variant="outline" 
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={handleChatBot}
                data-testid="button-ai-questions"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Tirar Dúvidas
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Support Dialog */}
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Falar com Suporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={supportForm.name}
                onChange={(e) => setSupportForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Seu nome completo"
                data-testid="input-support-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={supportForm.email}
                onChange={(e) => setSupportForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="seu@email.com"
                data-testid="input-support-email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <Input
                value={supportForm.phone}
                onChange={(e) => setSupportForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
                data-testid="input-support-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mensagem</label>
              <Textarea
                value={supportForm.message}
                onChange={(e) => setSupportForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Descreva sua dúvida ou problema..."
                rows={4}
                data-testid="textarea-support-message"
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleSupportSubmit} className="flex-1" data-testid="button-support-submit">
                Enviar Mensagem
              </Button>
              <Button 
                variant="outline" 
                onClick={handleWhatsAppContact}
                data-testid="button-support-whatsapp"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Assistant */}
      <AIAssistant open={showChatBot} onOpenChange={setShowChatBot} />
    </div>
  );
}