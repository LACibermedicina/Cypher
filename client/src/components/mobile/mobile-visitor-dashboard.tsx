import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UserPlus, Calendar, FileText, Shield, Phone, MessageCircle, Users, Clock, MapPin, Bot } from "lucide-react"
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
}

export function MobileVisitorDashboard() {
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
    setShowChatBot(true);
  };
  
  // Public services available for visitors
  const publicServices: Service[] = [
    {
      id: "1",
      name: "Consulta Geral",
      description: "Consulta médica geral online",
      price: "150 TMC",
      duration: "30 min",
      available: true
    },
    {
      id: "2", 
      name: "Orientação Médica",
      description: "Esclarecimento de dúvidas médicas",
      price: "80 TMC",
      duration: "15 min",
      available: true
    },
    {
      id: "3",
      name: "Avaliação de Exames",
      description: "Análise e interpretação de exames",
      price: "100 TMC",
      duration: "20 min",
      available: false
    }
  ];

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-6 space-y-6">
      
      {/* Welcome Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <CardContent className="p-6">
          <div className="text-center">
            <UserPlus className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-2xl font-bold">Bem-vindo ao Telemed</h1>
            <p className="text-blue-100 mt-2">Acesso público aos serviços de telemedicina</p>
            <div className="mt-4">
              <Badge className="bg-white/20 text-white">Visitante</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Registration */}
      <Card className="shadow-lg border-blue-200">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center text-blue-800">
            <UserPlus className="w-5 h-5 mr-2" />
            Criar Conta
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Registre-se para acessar todos os recursos da plataforma
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/register/patient">
              <Button 
                className="bg-medical-primary hover:bg-medical-primary/90 w-full"
                data-testid="button-register-patient"
              >
                Sou Paciente
              </Button>
            </Link>
            <Link href="/register/doctor">
              <Button 
                variant="outline" 
                className="border-medical-secondary text-medical-secondary w-full"
                data-testid="button-register-doctor"
              >
                Sou Médico
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Available Services */}
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Serviços Disponíveis
            </h2>
            <Badge variant="secondary">{publicServices.filter(s => s.available).length} ativos</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {publicServices.map((service, index) => (
            <div key={service.id}>
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <h3 className="font-medium" data-testid={`text-service-name-${service.id}`}>{service.name}</h3>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span className="text-sm font-medium">{service.duration}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-medium text-green-600">{service.price}</span>
                    </div>
                    <Badge 
                      variant={service.available ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {service.available ? "Disponível" : "Indisponível"}
                    </Badge>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  disabled={!service.available}
                  onClick={() => handleServiceBooking(service.id)}
                  data-testid={`button-book-${service.id}`}
                >
                  {service.available ? "Agendar" : "Indisponível"}
                </Button>
              </div>
              {index < publicServices.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center text-green-800">
            <Phone className="w-5 h-5 mr-2" />
            Contato & Suporte
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium text-green-800">WhatsApp</div>
                <div className="text-sm text-green-600">+55 11 96070-8817</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium text-green-800">Endereço</div>
                <div className="text-sm text-green-600">São Paulo, SP - Brasil</div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full text-green-700 border-green-300"
              onClick={handleSupportContact}
              data-testid="button-contact-support"
            >
              Falar com Suporte
            </Button>
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={handleWhatsAppContact}
              data-testid="button-whatsapp-contact"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp Direto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Chatbot Section */}
      <Card className="shadow-lg bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center text-purple-800">
            <Bot className="w-5 h-5 mr-2" />
            Assistente Virtual IA
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-purple-600">
            Nosso assistente virtual pode ajudar com agendamento, análise de sintomas e orientações médicas.
          </p>
          <div className="grid grid-cols-1 gap-2">
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

      {/* Emergency Notice */}
      <Card className="shadow-lg bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
        <CardContent className="p-4">
          <div className="text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-red-600" />
            <h3 className="font-bold text-red-800">Emergência Médica?</h3>
            <p className="text-sm text-red-600 mt-1">
              Em caso de emergência, ligue 192 (SAMU) ou dirija-se ao hospital mais próximo
            </p>
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
              rows={3}
              data-testid="textarea-support-message"
            />
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleSupportSubmit} className="flex-1" data-testid="button-support-submit">
              Enviar
            </Button>
            <Button 
              variant="outline" 
              onClick={handleWhatsAppContact}
              data-testid="button-support-whatsapp"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* AI Assistant */}
    <AIAssistant open={showChatBot} onOpenChange={setShowChatBot} />
    </>
  );
}