import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  Stethoscope, 
  Calendar, 
  FileText, 
  Shield, 
  Users, 
  Clock, 
  DollarSign, 
  Star,
  Video,
  MessageSquare,
  Activity,
  TrendingUp,
  CheckCircle,
  Plus,
  Download,
  Eye,
  Edit,
  Phone
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { useAuth } from "@/contexts/AuthContext"

interface Patient {
  id: string;
  name: string;
  type: string;
  time: string;
  status: string;
  profilePicture?: string;
  condition?: string;
  urgency?: 'low' | 'medium' | 'high';
}

interface Prescription {
  id: string;
  patientName: string;
  medication: string;
  status: 'pending' | 'signed' | 'dispensed';
  date: string;
}

export function DesktopDoctorDashboard() {
  const { user } = useAuth();
  
  // Mock data for charts
  const weeklyData = [
    { day: 'Seg', consultations: 8, revenue: 1200 },
    { day: 'Ter', consultations: 12, revenue: 1800 },
    { day: 'Qua', consultations: 10, revenue: 1500 },
    { day: 'Qui', consultations: 15, revenue: 2250 },
    { day: 'Sex', consultations: 18, revenue: 2700 },
    { day: 'Sáb', consultations: 6, revenue: 900 },
    { day: 'Dom', consultations: 4, revenue: 600 },
  ];

  const tmcEarnings = [
    { month: 'Jan', earnings: 18500 },
    { month: 'Fev', earnings: 22300 },
    { month: 'Mar', earnings: 21800 },
    { month: 'Abr', earnings: 28450 },
    { month: 'Mai', earnings: 32100 },
  ];

  const activePatients: Patient[] = [
    {
      id: "1",
      name: "Maria Silva",
      type: "Retorno • Hipertensão",
      time: "14:30",
      status: "Online",
      condition: "Hipertensão",
      urgency: "medium",
      profilePicture: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg"
    },
    {
      id: "2", 
      name: "Carlos Oliveira",
      type: "Primeira consulta • Check-up",
      time: "15:00",
      status: "Online",
      condition: "Check-up",
      urgency: "low",
      profilePicture: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg"
    },
    {
      id: "3",
      name: "Ana Costa", 
      type: "Acompanhamento • Diabetes",
      time: "15:30",
      status: "Presencial",
      condition: "Diabetes",
      urgency: "high",
      profilePicture: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg"
    }
  ];

  const pendingPrescriptions: Prescription[] = [
    {
      id: "1",
      patientName: "Maria Silva",
      medication: "Losartana 50mg • 1x ao dia • 30 dias",
      status: "pending",
      date: "Hoje"
    },
    {
      id: "2",
      patientName: "Carlos Oliveira", 
      medication: "Metformina 850mg • 2x ao dia • 60 dias",
      status: "signed",
      date: "Ontem"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg" />
              <AvatarFallback>DS</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bom dia, Dr. João!</h1>
              <p className="text-gray-600">Você tem 8 consultas agendadas hoje e 5 videochamadas pendentes</p>
              <div className="flex items-center space-x-4 mt-2">
                <Badge className="bg-green-100 text-green-800">Sistema Seguro LGPD</Badge>
                <Badge className="bg-blue-100 text-blue-800">Assinatura Digital CFM</Badge>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">28,340 TMC</div>
            <div className="text-gray-600">≈ R$ 2,834.00</div>
            <div className="text-sm text-gray-500">Receita TMC Mensal</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            size="lg" 
            className="h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-medical-primary to-blue-600 text-white shadow-lg"
            data-testid="button-start-consultation"
          >
            <Video className="w-8 h-8" />
            <span className="font-medium">Iniciar Consulta</span>
            <span className="text-xs opacity-90">Atender pacientes online</span>
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            className="h-24 flex flex-col items-center justify-center space-y-2 border-medical-secondary text-medical-secondary hover:bg-medical-secondary/10 shadow-lg"
            data-testid="button-prescribe"
          >
            <FileText className="w-8 h-8" />
            <span className="font-medium">Prescrever</span>
            <span className="text-xs opacity-70">Criar receitas digitais</span>
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            className="h-24 flex flex-col items-center justify-center space-y-2 border-medical-accent text-medical-accent hover:bg-medical-accent/10 shadow-lg"
            data-testid="button-new-patient"
          >
            <Users className="w-8 h-8" />
            <span className="font-medium">Novo Paciente</span>
            <span className="text-xs opacity-70">Cadastrar prontuário</span>
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            className="h-24 flex flex-col items-center justify-center space-y-2 border-purple-600 text-purple-600 hover:bg-purple-50 shadow-lg"
            data-testid="button-reports"
          >
            <Activity className="w-8 h-8" />
            <span className="font-medium">Relatórios</span>
            <span className="text-xs opacity-70">Análises e métricas</span>
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Consultations */}
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-medical-primary" />
                  Consultas Ativas
                </div>
                <Badge variant="secondary">{activePatients.length} Aguardando</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activePatients.map((patient) => (
                  <Card key={patient.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={patient.profilePicture} />
                            <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{patient.name}</h3>
                            <p className="text-sm text-gray-600">{patient.type}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Clock className="w-4 h-4 text-medical-primary" />
                              <span className="text-sm font-medium text-medical-primary">{patient.time}</span>
                              {patient.urgency === 'high' && <Badge variant="destructive" className="text-xs">Alta</Badge>}
                              {patient.urgency === 'medium' && <Badge variant="secondary" className="text-xs">Média</Badge>}
                              {patient.urgency === 'low' && <Badge variant="outline" className="text-xs">Baixa</Badge>}
                              <Badge variant={patient.status === "Online" ? "default" : "secondary"} className="text-xs">
                                {patient.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-green-600">150 TMC</span>
                          <Button size="sm" data-testid={`button-attend-${patient.id}`}>
                            Atender
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Digital Prescriptions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Sistema de Prescrição
              </CardTitle>
              <Badge className="w-fit bg-green-100 text-green-800">CFM Certificado</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                data-testid="button-quick-prescription"
              >
                <Plus className="w-4 h-4 mr-2" />
                Receita Rápida
                <span className="text-xs ml-2">Prescrever & Assinar</span>
              </Button>
              
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Receitas Recentes</h3>
                {pendingPrescriptions.map((prescription) => (
                  <Card key={prescription.id} className="border border-gray-200">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{prescription.medication}</p>
                          <p className="text-xs text-gray-500">{prescription.patientName}</p>
                          <Badge 
                            variant={prescription.status === 'signed' ? 'default' : 'secondary'}
                            className="mt-1 text-xs"
                          >
                            {prescription.status === 'signed' ? 'Assinado' : 'Pendente'}
                          </Badge>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <Button size="sm" variant="outline" className="text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                          {prescription.status === 'pending' && (
                            <Button size="sm" variant="outline" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Assinar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Weekly Performance */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="w-5 h-5 mr-2 text-purple-600" />
                Performance Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="consultations" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* TMC Earnings */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Ganhos TMC
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={tmcEarnings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="earnings" stroke="#10B981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Patient Records & Security */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Patient Records */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                  Prontuários
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Novo
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activePatients.slice(0, 2).map((patient) => (
                  <Card key={patient.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={patient.profilePicture} />
                            <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-sm">{patient.name}</h3>
                            <p className="text-xs text-gray-500">Última consulta: 10/01/2025</p>
                            <div className="flex items-center space-x-1 mt-1">
                              <Badge variant="outline" className="text-xs">{patient.condition}</Badge>
                              <span className="text-xs text-gray-500">3 Medicações</span>
                              <span className="text-xs text-gray-500">Retorno em 30 dias</span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Security & Compliance */}
          <Card className="shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <Shield className="w-5 h-5 mr-2" />
                Segurança Médica
              </CardTitle>
              <Badge className="w-fit bg-green-100 text-green-800">Ativa</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-green-800">Certificado Digital</h3>
                <p className="text-sm text-green-600">Válido até: 15/12/2025</p>
                <p className="text-xs text-gray-600">ICP-Brasil A3</p>
                <Button size="sm" variant="outline" className="mt-2 text-green-700 border-green-300">
                  Renovar Certificado
                </Button>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-green-800">Autenticação Biométrica</p>
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-700">Digital</span>
                      <Badge className="text-xs bg-green-100 text-green-800">Ativa</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-700">Facial</span>
                      <Badge className="text-xs bg-green-100 text-green-800">Ativa</Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-green-800">Compliance</p>
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-700">LGPD</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-700">CFM</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-700">ICP-Brasil</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}