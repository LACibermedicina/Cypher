import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UserPlus, Calendar, FileText, Shield, Phone, MessageCircle, Users, Clock, MapPin } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

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
            <Button 
              className="bg-medical-primary hover:bg-medical-primary/90"
              data-testid="button-register-patient"
            >
              Sou Paciente
            </Button>
            <Button 
              variant="outline" 
              className="border-medical-secondary text-medical-secondary"
              data-testid="button-register-doctor"
            >
              Sou Médico
            </Button>
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
          <Button 
            variant="outline" 
            className="w-full text-green-700 border-green-300"
            data-testid="button-contact-support"
          >
            Falar com Suporte
          </Button>
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
  );
}