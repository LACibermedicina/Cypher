import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  Users, 
  Coins, 
  DollarSign, 
  Hospital, 
  Building2, 
  Stethoscope,
  UserCheck,
  FileText,
  Beaker,
  BarChart3,
  Megaphone,
  Calendar,
  BookOpen,
  Headphones,
  AlertTriangle,
  CheckCircle,
  MapPin
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

interface SystemStat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
  color: string;
}

interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  time: string;
  action?: string;
}

export function MobileAdminDashboard() {
  const { user } = useAuth();
  
  // Mock data - replace with real API calls
  const systemStats: SystemStat[] = [
    {
      label: "Usuários Ativos",
      value: "2.8K",
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "text-blue-600"
    },
    {
      label: "TMC Tokens",
      value: "847K",
      change: "+15%", 
      trend: "up",
      icon: Coins,
      color: "text-green-600"
    },
    {
      label: "Receita Mensal",
      value: "R$ 125K",
      change: "+22%",
      trend: "up", 
      icon: DollarSign,
      color: "text-emerald-600"
    }
  ];

  const networkStats = [
    { label: "Investidores", sublabel: "Gestão de fundos", value: "125 ativos", icon: TrendingUp, color: "bg-blue-500" },
    { label: "TMC Tokens", sublabel: "Blockchain", value: "R$ 84.7K", icon: Coins, color: "bg-green-500" },
    { label: "Médicos", sublabel: "Profissionais", value: "45 online", icon: Stethoscope, color: "bg-purple-500" },
    { label: "Pacientes", sublabel: "Usuários", value: "2.8K ativos", icon: UserCheck, color: "bg-indigo-500" },
    { label: "Receitas", sublabel: "Digitais", value: "1.2K hoje", icon: FileText, color: "bg-pink-500" },
    { label: "Farmácias", sublabel: "Parceiros", value: "89 ativas", icon: Building2, color: "bg-orange-500" },
    { label: "Hospitais", sublabel: "Rede", value: "23 conectados", icon: Hospital, color: "bg-red-500" },
    { label: "Laboratórios", sublabel: "Exames", value: "67 parceiros", icon: Beaker, color: "bg-cyan-500" }
  ];

  const alerts: AlertItem[] = [
    {
      id: "1",
      type: "critical",
      title: "Tentativa de acesso suspeito detectada",
      description: "IP bloqueado automaticamente",
      time: "2 min",
      action: "Bloquear IP"
    },
    {
      id: "2", 
      type: "warning",
      title: "Alta latência no servidor de videochamadas",
      description: "Tempo de resposta acima do normal",
      time: "5 min",
      action: "Verificar"
    }
  ];

  const supportLocations = [
    { city: "São Paulo", units: 5 },
    { city: "Rio de Janeiro", units: 3 },
    { city: "Outros", units: 7 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 px-4 py-6 space-y-6">
      
      {/* Admin Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            <p className="text-white/90 text-sm mt-1">Sistema de Telemedicina TMC</p>
            <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4" />
                <span>Sistema Online</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4" />
                <span>Performance: 98.2%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 gap-4">
        {systemStats.map((stat, index) => (
          <Card key={index} className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gray-100 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={stat.trend === 'up' ? 'default' : 'secondary'}
                    className={stat.trend === 'up' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {stat.change}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">vs. mês anterior</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Network Statistics Grid */}
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
            Rede de Parceiros
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {networkStats.map((item, index) => (
              <Card key={index} className="border border-gray-200">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`p-1.5 rounded ${item.color} text-white`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI & Analytics */}
      <Card className="shadow-lg bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center text-purple-800">
            <BarChart3 className="w-5 h-5 mr-2" />
            IA & Analytics
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-purple-800">Análise Preditiva</h3>
              <p className="text-sm text-purple-600">Machine Learning em tempo real</p>
              <Badge className="mt-1 bg-green-100 text-green-800">94% precisão</Badge>
            </div>
            <div>
              <h3 className="font-medium text-purple-800">Dados Estatísticos</h3>
              <p className="text-sm text-purple-600">Relatórios em tempo real</p>
              <Badge className="mt-1 bg-blue-100 text-blue-800">2.4M registros</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marketing & Events */}
      <Card className="shadow-lg bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center text-orange-800">
            <Megaphone className="w-5 h-5 mr-2" />
            Marketing & Eventos
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium text-orange-800">Campanhas Online</h3>
            <p className="text-sm text-orange-600">12 ativas</p>
            <div className="flex space-x-2 text-xs mt-1">
              <Badge variant="outline" className="text-orange-700">CTR: 3.2%</Badge>
              <Badge variant="outline" className="text-orange-700">Alcance: 45K</Badge>
              <Badge variant="outline" className="text-orange-700">ROI: 180%</Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-orange-800">Congressos</h3>
              <p className="text-sm text-orange-600">3 próximos</p>
              <div className="text-xs text-muted-foreground">
                Participantes: 1.2K<br />
                Palestrantes: 45
              </div>
            </div>
            <div>
              <h3 className="font-medium text-orange-800">Revista Científica</h3>
              <p className="text-sm text-orange-600">Nova edição</p>
              <div className="text-xs text-muted-foreground">
                Artigos: 23<br />
                Downloads: 8.9K
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Network */}
      <Card className="shadow-lg bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center text-teal-800">
            <Headphones className="w-5 h-5 mr-2" />
            Suporte Técnico
          </h2>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <h3 className="font-medium text-teal-800">Pontos Físicos</h3>
            <Badge className="mt-1 bg-green-100 text-green-800">15 ativos</Badge>
          </div>
          
          <div className="space-y-3">
            {supportLocations.map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-medium text-teal-800">{location.city}</span>
                </div>
                <Badge variant="outline" className="text-teal-700">
                  {location.units} unidades
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Alerts */}
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            Alertas do Sistema
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className={`border-l-4 ${
              alert.type === 'critical' ? 'border-red-500 bg-red-50' :
              alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-blue-50'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={
                        alert.type === 'critical' ? 'destructive' :
                        alert.type === 'warning' ? 'secondary' : 'default'
                      }>
                        {alert.type === 'critical' ? 'Crítico' :
                         alert.type === 'warning' ? 'Atenção' : 'Info'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{alert.time}</span>
                    </div>
                    <h3 className="font-medium text-sm">{alert.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                  </div>
                  {alert.action && (
                    <Button size="sm" variant="outline" className="ml-2">
                      {alert.action}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Quick Admin Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          className="h-16 flex flex-col items-center justify-center space-y-1 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg"
          data-testid="button-user-management"
        >
          <Users className="w-6 h-6" />
          <span className="text-sm">Usuários</span>
        </Button>
        
        <Button 
          variant="outline"
          className="h-16 flex flex-col items-center justify-center space-y-1 border-indigo-600 text-indigo-600 hover:bg-indigo-50 shadow-lg"
          data-testid="button-tmc-config"
        >
          <Coins className="w-6 h-6" />
          <span className="text-sm">Config TMC</span>
        </Button>
        
        <Button 
          variant="outline"
          className="h-16 flex flex-col items-center justify-center space-y-1 border-purple-600 text-purple-600 hover:bg-purple-50 shadow-lg"
          data-testid="button-system-reports"
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-sm">Relatórios</span>
        </Button>
        
        <Button 
          variant="outline"
          className="h-16 flex flex-col items-center justify-center space-y-1 border-teal-600 text-teal-600 hover:bg-teal-50 shadow-lg"
          data-testid="button-chatbot-config"
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-sm">Chatbot IA</span>
        </Button>
      </div>
    </div>
  );
}