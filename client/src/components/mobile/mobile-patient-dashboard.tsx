import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  Video, 
  Calendar, 
  MessageCircle, 
  FileText, 
  Heart, 
  Scale, 
  Activity, 
  Download, 
  Share, 
  Phone,
  Coins,
  TrendingUp
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  type: string;
  doctorAvatar: string;
}

interface HealthMetric {
  name: string;
  value: string;
  status: string;
  icon: any;
  color: string;
}

interface TMCWallet {
  balance: number;
  balanceInReais: number;
  cashbackRate: number;
}

export function MobilePatientDashboard() {
  const { user } = useAuth();
  
  // Mock data - replace with real API calls
  const nextAppointments: Appointment[] = [
    {
      id: "1",
      doctorName: "Dr. João Santos",
      specialty: "Cardiologista",
      date: "Hoje",
      time: "14:30",
      type: "Online",
      doctorAvatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg"
    },
    {
      id: "2",
      doctorName: "Dra. Ana Costa", 
      specialty: "Endocrinologista",
      date: "22/01",
      time: "09:00",
      type: "Presencial",
      doctorAvatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-4.jpg"
    }
  ];

  const healthMetrics: HealthMetric[] = [
    {
      name: "Pressão Arterial",
      value: "120/80",
      status: "Normal",
      icon: Heart,
      color: "text-green-600"
    },
    {
      name: "Peso",
      value: "65kg",
      status: "Meta: 63kg",
      icon: Scale,
      color: "text-blue-600"
    },
    {
      name: "Freq. Cardíaca",
      value: "72 bpm",
      status: "Normal",
      icon: Activity,
      color: "text-green-600"
    }
  ];

  const tmcWallet: TMCWallet = {
    balance: 850,
    balanceInReais: 85.00,
    cashbackRate: 5
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-primary/5 to-medical-secondary/5 px-4 py-6 space-y-6">
      
      {/* Patient Profile Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-medical-secondary to-medical-accent text-white">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Avatar className="w-16 h-16 border-2 border-white/20">
              <AvatarImage src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg" />
              <AvatarFallback className="bg-white/20 text-white text-lg">
                {user?.name?.charAt(0) || 'M'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{user?.name || "Maria Silva"}</h1>
              <p className="text-white/90 text-sm">29 anos • Plano Premium</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className="bg-white/20 text-white">Verificado</Badge>
                <span className="text-xs text-white/80">Última consulta: 15/01</span>
              </div>
            </div>
          </div>
          
          {/* Today's Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">2</div>
              <div className="text-white/80 text-xs">Próximas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">15</div>
              <div className="text-white/80 text-xs">Histórico</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">3</div>
              <div className="text-white/80 text-xs">Receitas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          size="lg" 
          className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-medical-primary to-blue-600 text-white shadow-lg"
          data-testid="button-quick-consultation"
        >
          <Video className="w-6 h-6" />
          <span className="text-sm font-medium">Consulta Rápida</span>
        </Button>
        
        <Button 
          size="lg" 
          variant="outline"
          className="h-20 flex flex-col items-center justify-center space-y-2 border-medical-secondary text-medical-secondary hover:bg-medical-secondary/10 shadow-lg"
          data-testid="button-schedule-appointment"
        >
          <Calendar className="w-6 h-6" />
          <span className="text-sm font-medium">Agendar</span>
        </Button>
        
        <Button 
          size="lg" 
          variant="outline"
          className="h-20 flex flex-col items-center justify-center space-y-2 border-medical-accent text-medical-accent hover:bg-medical-accent/10 shadow-lg"
          data-testid="button-medical-chat"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-sm font-medium">Chat Médico</span>
        </Button>
        
        <Button 
          size="lg" 
          variant="outline"
          className="h-20 flex flex-col items-center justify-center space-y-2 border-medical-primary text-medical-primary hover:bg-medical-primary/10 shadow-lg"
          data-testid="button-exam-results"
        >
          <FileText className="w-6 h-6" />
          <span className="text-sm font-medium">Meus Exames</span>
        </Button>
      </div>

      {/* Next Appointments */}
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-medical-primary" />
              Próximas Consultas
            </h2>
            <Badge variant="secondary">{nextAppointments.length} agendadas</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextAppointments.map((appointment, index) => (
            <div key={appointment.id}>
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={appointment.doctorAvatar} />
                  <AvatarFallback>{appointment.doctorName.charAt(3)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">{appointment.doctorName}</h3>
                  <p className="text-sm text-muted-foreground">{appointment.specialty} • {appointment.type}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm font-medium text-medical-primary">
                      {appointment.date} {appointment.time}
                    </span>
                    <Badge 
                      variant={appointment.type === "Online" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {appointment.type}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" data-testid={`button-join-appointment-${appointment.id}`}>
                  Entrar
                </Button>
              </div>
              {index < nextAppointments.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Health Summary */}
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center">
              <Activity className="w-5 h-5 mr-2 text-medical-accent" />
              Resumo da Saúde
            </h2>
            <Button variant="ghost" size="sm" className="text-medical-accent">
              Ver tudo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {healthMetrics.map((metric, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-gray-100 ${metric.color}`}>
                <metric.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">{metric.name}</h3>
                  <span className="text-sm text-muted-foreground">Última medição: Hoje</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold">{metric.value}</span>
                  <Badge variant="outline" className={`text-xs ${metric.color}`}>
                    {metric.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Active Prescriptions */}
      <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center text-blue-800">
            <FileText className="w-5 h-5 mr-2" />
            Receitas Recentes
          </h2>
          <Button variant="ghost" size="sm" className="text-blue-600">
            Ver todas
          </Button>
        </CardHeader>
        <CardContent>
          <Card className="bg-white border border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-800">Losartana 50mg</h3>
                  <p className="text-sm text-blue-600">Dr. João Santos • 1x ao dia • 30 dias</p>
                  <Badge className="mt-2 bg-green-100 text-green-800">Ativa</Badge>
                </div>
                <div className="flex flex-col space-y-2">
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-300">
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-300">
                    <Share className="w-4 h-4 mr-1" />
                    Compartilhar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* TMC Wallet */}
      <Card className="shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center text-green-800">
            <Coins className="w-5 h-5 mr-2" />
            Carteira TMC
          </h2>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-green-700">{tmcWallet.balance} TMC</div>
            <div className="text-green-600">≈ R$ {tmcWallet.balanceInReais.toFixed(2)} disponível</div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-green-700">Cashback</span>
              <span className="font-medium">{tmcWallet.cashbackRate}% por consulta</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="sm" className="text-green-700 border-green-300">
                Comprar TMC
              </Button>
              <Button variant="outline" size="sm" className="text-green-700 border-green-300">
                Histórico
              </Button>
            </div>
          </div>
          
          {/* Recent Transactions */}
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-green-800">Últimas Transações</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-green-700">Consulta Dr. João Santos</span>
                <span className="text-red-600">-150 TMC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Cashback - Consulta</span>
                <span className="text-green-600">+7.5 TMC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Recarga via PIX</span>
                <span className="text-green-600">+500 TMC</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Button */}
      <Card className="shadow-lg bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
        <CardContent className="p-4">
          <Button 
            size="lg" 
            className="w-full h-16 bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:from-red-600 hover:to-red-700"
            data-testid="button-emergency"
          >
            <Phone className="w-6 h-6 mr-2" />
            <div className="text-left">
              <div className="font-bold">Emergência 24h</div>
              <div className="text-sm opacity-90">Atendimento imediato</div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}