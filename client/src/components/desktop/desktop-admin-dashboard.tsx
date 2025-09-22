import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  TrendingUp, 
  Users, 
  Coins, 
  DollarSign, 
  Activity, 
  Calendar,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Zap,
  Shield,
  Database,
  Video,
  Bot,
  Settings,
  UserPlus,
  FileText,
  MessageSquare
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { useAuth } from "@/contexts/AuthContext"

interface DashboardMetric {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: any;
  color: string;
}

interface RealtimeActivity {
  id: string;
  type: string;
  description: string;
  time: string;
  status: 'success' | 'warning' | 'error';
}

export function DesktopAdminDashboard() {
  const { user } = useAuth();
  
  // Mock data for charts
  const consultationData = [
    { name: 'Seg', consultations: 45, revenue: 6750 },
    { name: 'Ter', consultations: 62, revenue: 9300 },
    { name: 'Qua', consultations: 58, revenue: 8700 },
    { name: 'Qui', consultations: 71, revenue: 10650 },
    { name: 'Sex', consultations: 89, revenue: 13350 },
    { name: 'Sáb', consultations: 35, revenue: 5250 },
    { name: 'Dom', consultations: 28, revenue: 4200 },
  ];

  const tmcData = [
    { name: 'Jan', entrada: 45000, saida: 32000 },
    { name: 'Fev', entrada: 52000, saida: 38000 },
    { name: 'Mar', entrada: 48000, saida: 35000 },
    { name: 'Abr', entrada: 67000, saida: 42000 },
    { name: 'Mai', entrada: 72000, saida: 48000 },
  ];

  const metrics: DashboardMetric[] = [
    {
      title: "Usuários Ativos",
      value: "2,847",
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "bg-blue-500"
    },
    {
      title: "Consultas Hoje",
      value: "1,523",
      change: "+8%",
      trend: "up",
      icon: Activity,
      color: "bg-green-500"
    },
    {
      title: "TMC em Circulação",
      value: "847K",
      change: "+15%",
      trend: "up",
      icon: Coins,
      color: "bg-yellow-500"
    },
    {
      title: "Receita Mensal",
      value: "R$ 125K",
      change: "+22%",
      trend: "up",
      icon: DollarSign,
      color: "bg-emerald-500"
    }
  ];

  const realtimeActivities: RealtimeActivity[] = [
    {
      id: "1",
      type: "consultation",
      description: "Nova consulta iniciada - Dr. João Santos com Maria Silva • Cardiologia",
      time: "Agora",
      status: "success"
    },
    {
      id: "2",
      type: "user",
      description: "Novo usuário registrado - Pedro Santos • Verificação pendente",
      time: "2 min",
      status: "warning"
    },
    {
      id: "3",
      type: "transaction",
      description: "Transação TMC - Ana Costa comprou 500 TMC via PIX",
      time: "5 min",
      status: "success"
    },
    {
      id: "4",
      type: "prescription",
      description: "Receita digital emitida - Dra. Ana Costa • Prescrição validada blockchain",
      time: "8 min",
      status: "success"
    }
  ];

  const serviceStatus = [
    { name: "API Principal", status: "online", uptime: "99.9%" },
    { name: "Blockchain TMC", status: "online", uptime: "99.8%" },
    { name: "Videochamadas", status: "warning", uptime: "98.5%" },
    { name: "WhatsApp Bot", status: "online", uptime: "99.7%" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
            <p className="text-gray-600">Sistema de Telemedicina TMC - Controle Central</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className="bg-green-100 text-green-800 flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" />
              <span>Sistema Online</span>
            </Badge>
            <Button variant="outline" data-testid="button-system-settings">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <p className="text-sm text-gray-500">125 novos esta semana</p>
                  </div>
                  <div className={`p-3 rounded-full ${metric.color} text-white`}>
                    <metric.icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <Badge 
                    variant={metric.trend === 'up' ? 'default' : 'secondary'}
                    className={metric.trend === 'up' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {metric.change}
                  </Badge>
                  <span className="text-sm text-gray-500 ml-2">vs. mês anterior</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Consultation Analytics */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                Consultas por Período
              </CardTitle>
              <div className="flex space-x-4 text-sm">
                <Button variant="ghost" size="sm" className="text-blue-600">Últimos 7 dias</Button>
                <Button variant="ghost" size="sm">Últimos 30 dias</Button>
                <Button variant="ghost" size="sm">Últimos 3 meses</Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={consultationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="consultations" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* TMC Transactions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Coins className="w-5 h-5 mr-2 text-green-600" />
                TMC Transações
              </CardTitle>
              <div className="flex space-x-2 text-sm">
                <Badge className="bg-green-100 text-green-800">Entrada</Badge>
                <Badge variant="outline">Saída</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={tmcData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="entrada" stroke="#10B981" strokeWidth={2} />
                  <Line type="monotone" dataKey="saida" stroke="#EF4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Activity & System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Real-time Activity */}
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-purple-600" />
                Atividade em Tempo Real
              </CardTitle>
              <Badge className="w-fit bg-green-100 text-green-800">Ao vivo</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {realtimeActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                    <div className={`p-1 rounded-full ${
                      activity.status === 'success' ? 'bg-green-100' :
                      activity.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-green-500' :
                        activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-green-600" />
                Status dos Serviços
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceStatus.map((service, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{service.name}</p>
                      <p className="text-xs text-gray-500">Uptime: {service.uptime}</p>
                    </div>
                    <Badge variant={
                      service.status === 'online' ? 'default' :
                      service.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {service.status === 'online' ? 'Online' :
                       service.status === 'warning' ? 'Atenção' : 'Offline'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Alerts */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
              Alertas do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-l-4 border-red-500 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="destructive" className="mb-2">Alto</Badge>
                      <h3 className="font-medium text-sm">Tentativa de acesso suspeito</h3>
                      <p className="text-xs text-gray-500 mt-1">IP: 192.168.1.100 • 3 tentativas</p>
                    </div>
                    <Button size="sm" variant="outline" data-testid="button-block-ip">
                      Bloquear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-yellow-500 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="secondary" className="mb-2">Médio</Badge>
                      <h3 className="font-medium text-sm">Servidor com alta latência</h3>
                      <p className="text-xs text-gray-500 mt-1">Servidor-02 • 850ms resposta</p>
                    </div>
                    <Button size="sm" variant="outline" data-testid="button-check-server">
                      Verificar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                data-testid="button-user-management"
              >
                <Users className="w-6 h-6" />
                <span className="text-sm">Usuários</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                data-testid="button-tmc-config"
              >
                <Coins className="w-6 h-6" />
                <span className="text-sm">TMC Config</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                data-testid="button-chatbot-config"
              >
                <Bot className="w-6 h-6" />
                <span className="text-sm">Chatbot IA</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                data-testid="button-reports"
              >
                <BarChart3 className="w-6 h-6" />
                <span className="text-sm">Relatórios</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                data-testid="button-video-system"
              >
                <Video className="w-6 h-6" />
                <span className="text-sm">Videochamadas</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                data-testid="button-backup-system"
              >
                <Database className="w-6 h-6" />
                <span className="text-sm">Backup</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}