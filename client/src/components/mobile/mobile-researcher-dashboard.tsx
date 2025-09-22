import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BarChart3, Database, FileText, Shield, Download, Users, TrendingUp, Activity, Search, Filter } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

interface ResearchMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
}

interface Dataset {
  id: string;
  name: string;
  description: string;
  records: number;
  lastUpdated: string;
  status: 'available' | 'processing' | 'restricted';
}

export function MobileResearcherDashboard() {
  const { user } = useAuth();
  
  // Research metrics summary
  const researchMetrics: ResearchMetric[] = [
    {
      id: "1",
      title: "Consultas Analisadas",
      value: "1,247",
      change: "+12.5%",
      trend: 'up'
    },
    {
      id: "2",
      title: "Pacientes (Anonimizados)",
      value: "856",
      change: "+8.2%",
      trend: 'up'
    },
    {
      id: "3",
      title: "Especialidades",
      value: "15",
      change: "0%",
      trend: 'stable'
    },
    {
      id: "4",
      title: "Taxa de Eficácia",
      value: "94.2%",
      change: "+1.8%",
      trend: 'up'
    }
  ];

  // Available datasets for research
  const availableDatasets: Dataset[] = [
    {
      id: "1",
      name: "Sintomas & Diagnósticos",
      description: "Correlação entre sintomas relatados e diagnósticos finais",
      records: 1247,
      lastUpdated: "2024-01-15",
      status: 'available'
    },
    {
      id: "2",
      name: "Eficácia por Especialidade",
      description: "Métricas de sucesso por área médica",
      records: 856,
      lastUpdated: "2024-01-14",
      status: 'available'
    },
    {
      id: "3",
      name: "Satisfação do Paciente",
      description: "Avaliações e feedback dos pacientes",
      records: 542,
      lastUpdated: "2024-01-13",
      status: 'processing'
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 px-4 py-6 space-y-6">
      
      {/* Researcher Profile Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
        <CardContent className="p-6">
          <div className="text-center">
            <Database className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-2xl font-bold">{user?.name || "Dr. Pesquisador"}</h1>
            <p className="text-purple-100 mt-2">Acesso de Pesquisa • Dados Anonimizados</p>
            <div className="mt-4">
              <Badge className="bg-white/20 text-white">Pesquisador</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Research Metrics */}
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
            Métricas de Pesquisa
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {researchMetrics.map((metric) => (
              <div key={metric.id} className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">{metric.title}</div>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(metric.trend)}
                  <span className={`text-sm font-medium ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {metric.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Research Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          size="lg" 
          className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg"
          data-testid="button-new-analysis"
        >
          <Search className="w-6 h-6" />
          <span className="text-sm font-medium">Nova Análise</span>
        </Button>
        
        <Button 
          size="lg" 
          variant="outline"
          className="h-20 flex flex-col items-center justify-center space-y-2 border-purple-600 text-purple-600 hover:bg-purple-600/10 shadow-lg"
          data-testid="button-export-data"
        >
          <Download className="w-6 h-6" />
          <span className="text-sm font-medium">Exportar</span>
        </Button>
        
        <Button 
          size="lg" 
          variant="outline"
          className="h-20 flex flex-col items-center justify-center space-y-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600/10 shadow-lg"
          data-testid="button-filter-data"
        >
          <Filter className="w-6 h-6" />
          <span className="text-sm font-medium">Filtros</span>
        </Button>
        
        <Button 
          size="lg" 
          variant="outline"
          className="h-20 flex flex-col items-center justify-center space-y-2 border-gray-600 text-gray-600 hover:bg-gray-600/10 shadow-lg"
          data-testid="button-reports"
        >
          <FileText className="w-6 h-6" />
          <span className="text-sm font-medium">Relatórios</span>
        </Button>
      </div>

      {/* Available Datasets */}
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center">
              <Database className="w-5 h-5 mr-2 text-purple-600" />
              Conjuntos de Dados
            </h2>
            <Badge variant="secondary">{availableDatasets.length} disponíveis</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableDatasets.map((dataset, index) => (
            <div key={dataset.id}>
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <h3 className="font-medium" data-testid={`text-dataset-name-${dataset.id}`}>{dataset.name}</h3>
                  <p className="text-sm text-muted-foreground">{dataset.description}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="text-sm">
                      <span className="font-medium">{dataset.records.toLocaleString()}</span> registros
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Atualizado: {dataset.lastUpdated}
                    </div>
                  </div>
                  <Badge 
                    variant={dataset.status === 'available' ? "default" : dataset.status === 'processing' ? "secondary" : "destructive"}
                    className="mt-2 text-xs"
                  >
                    {dataset.status === 'available' ? 'Disponível' : 
                     dataset.status === 'processing' ? 'Processando' : 'Restrito'}
                  </Badge>
                </div>
                <Button 
                  size="sm" 
                  disabled={dataset.status !== 'available'}
                  data-testid={`button-access-${dataset.id}`}
                >
                  {dataset.status === 'available' ? 'Acessar' : 'Indisponível'}
                </Button>
              </div>
              {index < availableDatasets.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Research Compliance */}
      <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center text-blue-800">
            <Shield className="w-5 h-5 mr-2" />
            Conformidade LGPD
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Dados completamente anonimizados</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Acesso restrito a pesquisadores autorizados</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Auditoria completa de acesso</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Conformidade com resoluções do CFM</span>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-blue-600">
              Todos os dados são tratados conforme LGPD e diretrizes éticas de pesquisa médica
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center">
            <Activity className="w-5 h-5 mr-2 text-purple-600" />
            Atividade Recente
          </h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span>Análise de satisfação exportada</span>
              <span className="text-muted-foreground">2h atrás</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Dataset de sintomas acessado</span>
              <span className="text-muted-foreground">5h atrás</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Relatório mensal gerado</span>
              <span className="text-muted-foreground">1d atrás</span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}