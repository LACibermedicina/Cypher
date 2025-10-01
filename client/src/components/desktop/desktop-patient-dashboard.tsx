import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
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
  TrendingUp,
  Clock,
  MapPin,
  Star,
  Plus,
  Eye,
  CheckCircle,
  AlertCircle,
  Shield,
  History
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { useQuery } from "@tanstack/react-query"
import { useLocation } from "wouter"

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  type: string;
  doctorAvatar: string;
  rating: number;
  cost: number;
}

interface HealthMetric {
  name: string;
  value: string;
  status: string;
  icon: any;
  color: string;
  trend: number[];
}

interface Prescription {
  id: string;
  medication: string;
  doctor: string;
  dosage: string;
  duration: string;
  status: 'active' | 'completed' | 'pending';
}

export function DesktopPatientDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Fetch patient health status
  const { data: patientData } = useQuery<any>({
    queryKey: ['/api/patients/me'],
    enabled: !!user && user.role === 'patient',
  });

  // Map health status to display text and color
  const getHealthStatusDisplay = (status: string | undefined) => {
    const statusMap = {
      'excelente': { text: 'Excelente', color: 'bg-green-100 text-green-800' },
      'bom': { text: 'Bom', color: 'bg-blue-100 text-blue-800' },
      'regular': { text: 'Regular', color: 'bg-yellow-100 text-yellow-800' },
      'critico': { text: 'Crítico', color: 'bg-red-100 text-red-800' },
      'a_determinar': { text: 'A Determinar', color: 'bg-gray-100 text-gray-800' },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap['a_determinar'];
  };

  const healthStatus = getHealthStatusDisplay(patientData?.healthStatus);
  
  // Mock data for charts
  const healthTrendData = [
    { date: '01/05', pressure: 120, weight: 65, heartRate: 72 },
    { date: '08/05', pressure: 118, weight: 64.5, heartRate: 70 },
    { date: '15/05', pressure: 122, weight: 64.8, heartRate: 74 },
    { date: '22/05', pressure: 119, weight: 64.2, heartRate: 69 },
    { date: '29/05', pressure: 121, weight: 63.9, heartRate: 71 },
  ];

  const tmcSpendingData = [
    { name: 'Consultas', value: 60, color: '#3B82F6' },
    { name: 'Exames', value: 25, color: '#10B981' },
    { name: 'Medicamentos', value: 15, color: '#F59E0B' },
  ];

  const nextAppointments: Appointment[] = [
    {
      id: "1",
      doctorName: "Dr. João Santos",
      specialty: "Cardiologista",
      date: "Hoje",
      time: "14:30",
      type: "Videoconsulta",
      rating: 4.9,
      cost: 150,
      doctorAvatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg"
    },
    {
      id: "2",
      doctorName: "Dra. Ana Costa", 
      specialty: "Endocrinologista",
      date: "22/01",
      time: "09:00",
      type: "Presencial",
      rating: 4.8,
      cost: 200,
      doctorAvatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-4.jpg"
    }
  ];

  const healthMetrics: HealthMetric[] = [
    {
      name: "Pressão Arterial",
      value: "120/80",
      status: "Normal",
      icon: Heart,
      color: "text-green-600",
      trend: [118, 120, 119, 121, 120]
    },
    {
      name: "Peso",
      value: "63.9kg",
      status: "Meta: 63kg",
      icon: Scale,
      color: "text-blue-600",
      trend: [65, 64.5, 64.8, 64.2, 63.9]
    },
    {
      name: "Freq. Cardíaca",
      value: "71 bpm",
      status: "Normal",
      icon: Activity,
      color: "text-green-600",
      trend: [72, 70, 74, 69, 71]
    }
  ];

  const activePrescriptions: Prescription[] = [
    {
      id: "1",
      medication: "Losartana 50mg",
      doctor: "Dr. João Santos",
      dosage: "1x ao dia",
      duration: "30 dias",
      status: "active"
    },
    {
      id: "2",
      medication: "Omeprazol 20mg",
      doctor: "Dra. Ana Costa",
      dosage: "Jejum",
      duration: "7 dias restantes",
      status: "active"
    },
    {
      id: "3",
      medication: "Vitamina D3",
      doctor: "Dr. João Santos",
      dosage: "1x semana",
      duration: "15 dias restantes",
      status: "active"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg" />
              <AvatarFallback>MS</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Olá, Maria!</h1>
              <p className="text-gray-600">Bem-vinda ao seu portal de saúde digital</p>
              <div className="flex items-center space-x-4 mt-2">
                <Badge className="bg-green-100 text-green-800 flex items-center space-x-1">
                  <Shield className="w-4 h-4" />
                  <span>Dados Protegidos</span>
                </Badge>
                <Badge className="bg-blue-100 text-blue-800">Assinatura Digital</Badge>
                <Badge className="bg-yellow-100 text-yellow-800">Blockchain TMC</Badge>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <Badge className={`${healthStatus.color} text-lg px-3 py-1 mb-2`} data-testid="badge-health-status">
              Status de Saúde: {healthStatus.text}
            </Badge>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            size="lg" 
            className="h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-medical-primary to-blue-600 text-white shadow-lg"
            data-testid="button-online-consultation"
            onClick={() => navigate('/schedule')}
          >
            <Video className="w-8 h-8" />
            <span className="font-medium">Consulta Online</span>
            <span className="text-xs opacity-90">Agende sua consulta</span>
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            className="h-24 flex flex-col items-center justify-center space-y-2 border-medical-secondary text-medical-secondary hover:bg-medical-secondary/10 shadow-lg"
            data-testid="button-my-schedule"
            onClick={() => navigate('/patient-agenda')}
          >
            <Calendar className="w-8 h-8" />
            <span className="font-medium">Minha Agenda</span>
            <span className="text-xs opacity-70">Anota\u00E7\u00F5es pessoais</span>
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            className="h-24 flex flex-col items-center justify-center space-y-2 border-medical-accent text-medical-accent hover:bg-medical-accent/10 shadow-lg"
            data-testid="button-prescriptions"
            onClick={() => navigate('/patient-prescriptions')}
          >
            <FileText className="w-8 h-8" />
            <span className="font-medium">Receitas</span>
            <span className="text-xs opacity-70">Prescrições digitais</span>
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            className="h-24 flex flex-col items-center justify-center space-y-2 border-purple-600 text-purple-600 hover:bg-purple-50 shadow-lg"
            data-testid="button-medical-chat"
            onClick={() => {
              if (patientData?.whatsappNumber) {
                window.open(`https://wa.me/${patientData.whatsappNumber.replace(/\D/g, '')}`, '_blank');
              } else {
                window.open('https://wa.me/5511999999999', '_blank');
              }
            }}
          >
            <MessageCircle className="w-8 h-8" />
            <span className="font-medium">Chat Médico</span>
            <span className="text-xs opacity-70">WhatsApp</span>
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Next Appointments */}
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-medical-primary" />
                  Próximas Consultas
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Nova Consulta
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nextAppointments.map((appointment) => (
                  <Card key={appointment.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={appointment.doctorAvatar} />
                            <AvatarFallback>{appointment.doctorName.charAt(3)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-lg font-semibold">{appointment.doctorName}</h3>
                            <p className="text-gray-600">{appointment.specialty}</p>
                            <p className="text-sm text-gray-500">CRM: 12345-SP</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <div className="flex items-center space-x-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{appointment.rating}</span>
                              </div>
                              <Badge 
                                variant={appointment.type === "Videoconsulta" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {appointment.type}
                              </Badge>
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                Segura
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-medical-primary">
                            {appointment.date}
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {appointment.time}
                          </div>
                          <div className="text-sm text-green-600 font-medium">
                            {appointment.cost} TMC
                          </div>
                          <div className="flex space-x-2 mt-3">
                            <Button size="sm" data-testid={`button-join-${appointment.id}`}>
                              Entrar
                            </Button>
                            <Button size="sm" variant="outline">
                              Chat
                            </Button>
                            <Button size="sm" variant="outline">
                              Reagendar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* TMC Wallet */}
          <Card className="shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <Coins className="w-5 h-5 mr-2" />
                Carteira TMC
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-green-700">15,750 TMC</div>
                <div className="text-green-600 text-lg">≈ R$ 1,575.00</div>
                <div className="flex justify-center space-x-2 mt-4">
                  <Button size="sm" className="bg-green-600 text-white">
                    Comprar
                  </Button>
                  <Button size="sm" variant="outline" className="text-green-700 border-green-300">
                    Enviar
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium text-green-800">Últimas Transações</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-700">Consulta Dr. João Santos</span>
                    <span className="text-red-600 font-medium">-150 TMC</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-700">Cashback - Consulta</span>
                    <span className="text-green-600 font-medium">+7.5 TMC</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-700">Recarga via PIX</span>
                    <span className="text-green-600 font-medium">+500 TMC</span>
                  </div>
                </div>
              </div>

              {/* TMC Spending Chart */}
              <div className="mt-6">
                <h3 className="font-medium text-green-800 mb-3">Gastos por Categoria</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={tmcSpendingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      dataKey="value"
                    >
                      {tmcSpendingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Metrics & History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Health Summary */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-medical-accent" />
                  Resumo da Saúde
                </div>
                <Button variant="ghost" size="sm" className="text-medical-accent">
                  Ver tudo
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {healthMetrics.map((metric, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg bg-gray-100 ${metric.color}`}>
                            <metric.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{metric.name}</h3>
                              <span className="text-xs text-gray-500">Última medição: Hoje</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xl font-bold">{metric.value}</span>
                              <Badge variant="outline" className={`text-xs ${metric.color}`}>
                                {metric.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="w-24 h-12">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metric.trend.map((value, i) => ({ value }))}>
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke={metric.color.includes('green') ? '#10B981' : '#3B82F6'} 
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="w-5 h-5 mr-2 text-indigo-600" />
                Histórico Médico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Consulta Cardiológica</p>
                      <p className="text-xs text-gray-500">Dr. João Santos • 10 Jan 2025</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">Receita Digital</p>
                      <p className="text-xs text-gray-500">Losartana 50mg • 08 Jan 2025</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-sm">Exame de Sangue</p>
                      <p className="text-xs text-gray-500">Lab. Central • 05 Jan 2025</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Prescriptions */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Medicamentos em Uso
              </div>
              <Badge variant="secondary">{activePrescriptions.length} ativas</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activePrescriptions.map((prescription) => (
                <Card key={prescription.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-blue-800">{prescription.medication}</h3>
                        <p className="text-sm text-blue-600">{prescription.doctor}</p>
                        <p className="text-xs text-gray-500">{prescription.dosage} • {prescription.duration}</p>
                      </div>
                      
                      <Badge className="bg-green-100 text-green-800">
                        {prescription.status === 'active' ? 'Ativa' : 'Finalizada'}
                      </Badge>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="flex-1 text-blue-600 border-blue-300">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-300">
                          <Share className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Button */}
        <Card className="shadow-lg bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-red-800">Emergência 24h</h2>
                <p className="text-red-600">Atendimento médico imediato disponível a qualquer momento</p>
              </div>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:from-red-600 hover:to-red-700"
                data-testid="button-emergency"
              >
                <Phone className="w-6 h-6 mr-2" />
                Ligar para Emergência
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}