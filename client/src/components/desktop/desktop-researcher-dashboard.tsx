import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BarChart3, Database, FileText, Shield, Download, Users, TrendingUp, Activity, Search, Filter, Calendar, Clock, Eye, ChartLine } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

interface ResearchMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

interface Dataset {
  id: string;
  name: string;
  description: string;
  records: number;
  lastUpdated: string;
  status: 'available' | 'processing' | 'restricted';
  category: string;
  size: string;
}

interface ResearchProject {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'pending';
  progress: number;
  lastActivity: string;
}

export function DesktopResearcherDashboard() {
  const { user } = useAuth();
  
  // Comprehensive research metrics
  const researchMetrics: ResearchMetric[] = [
    {
      id: "1",
      title: "Consultas Analisadas",
      value: "1,247",
      change: "+12.5%",
      trend: 'up',
      description: "Total de consultas processadas para análise"
    },
    {
      id: "2",
      title: "Pacientes Anonimizados",
      value: "856",
      change: "+8.2%",
      trend: 'up',
      description: "Registros de pacientes com dados anonimizados"
    },
    {
      id: "3",
      title: "Especialidades Médicas",
      value: "15",
      change: "0%",
      trend: 'stable',
      description: "Áreas médicas cobertas na base de dados"
    },
    {
      id: "4",
      title: "Taxa de Eficácia",
      value: "94.2%",
      change: "+1.8%",
      trend: 'up',
      description: "Percentual de sucessos em diagnósticos"
    },
    {
      id: "5",
      title: "Satisfação Média",
      value: "4.8/5",
      change: "+0.3",
      trend: 'up',
      description: "Avaliação média dos pacientes"
    },
    {
      id: "6",
      title: "Tempo Médio",
      value: "28 min",
      change: "-2 min",
      trend: 'up',
      description: "Duração média das consultas"
    }
  ];

  // Expanded datasets for desktop view
  const availableDatasets: Dataset[] = [
    {
      id: "1",
      name: "Sintomas & Diagnósticos",
      description: "Correlação entre sintomas relatados pelos pacientes e diagnósticos finais confirmados",
      records: 1247,
      lastUpdated: "2024-01-15",
      status: 'available',
      category: "Clínico",
      size: "2.4 MB"
    },
    {
      id: "2",
      name: "Eficácia por Especialidade",
      description: "Métricas de sucesso e satisfação do paciente por área médica especializada",
      records: 856,
      lastUpdated: "2024-01-14",
      status: 'available',
      category: "Especialidades",
      size: "1.8 MB"
    },
    {
      id: "3",
      name: "Satisfação do Paciente",
      description: "Avaliações, feedback qualitativo e quantitativo dos pacientes pós-consulta",
      records: 542,
      lastUpdated: "2024-01-13",
      status: 'processing',
      category: "Qualidade",
      size: "850 KB"
    },
    {
      id: "4",
      name: "Padrões de Uso da Plataforma",
      description: "Análise de comportamento de uso, horários de pico e preferências dos usuários",
      records: 2156,
      lastUpdated: "2024-01-12",
      status: 'available',
      category: "Comportamental",
      size: "3.2 MB"
    },
    {
      id: "5",
      name: "Indicadores de Saúde Pública",
      description: "Dados epidemiológicos e tendências de saúde da população atendida",
      records: 1834,
      lastUpdated: "2024-01-11",
      status: 'restricted',
      category: "Epidemiologia",
      size: "4.1 MB"
    }
  ];

  // Research projects
  const researchProjects: ResearchProject[] = [
    {
      id: "1",
      title: "Efetividade da Telemedicina em Cardiologia",
      description: "Análise comparativa entre consultas presenciais e virtuais",
      status: 'active',
      progress: 65,
      lastActivity: "Há 2 horas"
    },
    {
      id: "2",
      title: "Padrões de Sintomas em Consultas Remotas",
      description: "Identificação de padrões em relatopatologiacomprimidos",
      status: 'active',
      progress: 42,
      lastActivity: "Há 1 dia"
    },
    {
      id: "3",
      title: "Satisfação do Paciente - Estudo Longitudinal",
      description: "Acompanhamento da satisfação ao longo do tempo",
      status: 'completed',
      progress: 100,
      lastActivity: "Há 1 semana"
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'down':
        return <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Researcher Header */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              <div className="lg:col-span-2">
                <div className="flex items-center space-x-4 mb-4">
                  <Database className="w-12 h-12" />
                  <div>
                    <h1 className="text-3xl font-bold">{user?.name || "Dr. Pesquisador"}</h1>
                    <p className="text-purple-100">Pesquisador Clínico • Dados Anonimizados</p>
                  </div>
                  <Badge className="bg-white/20 text-white text-lg px-4 py-2">Pesquisador</Badge>
                </div>
                <p className="text-xl text-purple-100">
                  Acesso completo aos conjuntos de dados anonimizados para pesquisa clínica e análise epidemiológica
                </p>
              </div>
              <div className="text-center">
                <div className="bg-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4">Status de Acesso</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Nível de Acesso</span>
                      <Badge className="bg-green-500 text-white">Completo</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Datasets Disponíveis</span>
                      <span className="font-bold">{availableDatasets.filter(d => d.status === 'available').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Projetos Ativos</span>
                      <span className="font-bold">{researchProjects.filter(p => p.status === 'active').length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Research Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {researchMetrics.map((metric) => (
            <Card key={metric.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{metric.title}</h3>
                    <p className="text-sm text-muted-foreground">{metric.description}</p>
                  </div>
                  {getTrendIcon(metric.trend)}
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold">{metric.value}</div>
                  <div className={`text-sm font-medium mt-1 ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {metric.change} este mês
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Datasets */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold flex items-center">
                    <Database className="w-6 h-6 mr-2 text-purple-600" />
                    Conjuntos de Dados Disponíveis
                  </h2>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" data-testid="button-filter-datasets">
                      <Filter className="w-4 h-4 mr-2" />
                      Filtrar
                    </Button>
                    <Button size="sm" data-testid="button-export-all">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Tudo
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {availableDatasets.map((dataset) => (
                    <Card key={dataset.id} className={`border transition-all hover:shadow-md ${
                      dataset.status === 'available' ? 'border-purple-200' : 
                      dataset.status === 'processing' ? 'border-yellow-200' : 'border-red-200'
                    }`}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-lg" data-testid={`text-dataset-name-${dataset.id}`}>
                                {dataset.name}
                              </h3>
                              <Badge variant="outline">{dataset.category}</Badge>
                              <Badge 
                                variant={dataset.status === 'available' ? "default" : 
                                        dataset.status === 'processing' ? "secondary" : "destructive"}
                              >
                                {dataset.status === 'available' ? 'Disponível' : 
                                 dataset.status === 'processing' ? 'Processando' : 'Restrito'}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground mb-4">{dataset.description}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center">
                            <div className="font-bold text-lg">{dataset.records.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">Registros</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-lg">{dataset.size}</div>
                            <div className="text-sm text-muted-foreground">Tamanho</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-lg">{dataset.lastUpdated}</div>
                            <div className="text-sm text-muted-foreground">Atualizado</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-lg">{dataset.category}</div>
                            <div className="text-sm text-muted-foreground">Categoria</div>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <Button 
                            disabled={dataset.status !== 'available'}
                            data-testid={`button-access-${dataset.id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {dataset.status === 'available' ? 'Acessar Dataset' : 'Indisponível'}
                          </Button>
                          <Button variant="outline" disabled={dataset.status !== 'available'}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar
                          </Button>
                          <Button variant="outline" disabled={dataset.status !== 'available'}>
                            <ChartLine className="w-4 h-4 mr-2" />
                            Visualizar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Projects & Actions */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Search className="w-5 h-5 mr-2 text-purple-600" />
                  Ações Rápidas
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" data-testid="button-new-analysis">
                  <Search className="w-4 h-4 mr-2" />
                  Nova Análise
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-create-report">
                  <FileText className="w-4 h-4 mr-2" />
                  Criar Relatório
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-data-visualization">
                  <ChartLine className="w-4 h-4 mr-2" />
                  Visualização de Dados
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-export-findings">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Resultados
                </Button>
              </CardContent>
            </Card>

            {/* Active Research Projects */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-purple-600" />
                  Projetos de Pesquisa
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {researchProjects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium">{project.title}</h3>
                      <Badge 
                        variant={project.status === 'active' ? "default" : 
                                project.status === 'completed' ? "secondary" : "outline"}
                      >
                        {project.status === 'active' ? 'Ativo' : 
                         project.status === 'completed' ? 'Concluído' : 'Pendente'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Última atividade: {project.lastActivity}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Compliance Info */}
            <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader className="pb-4">
                <h2 className="text-xl font-semibold flex items-center text-blue-800">
                  <Shield className="w-5 h-5 mr-2" />
                  Conformidade LGPD
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Dados completamente anonimizados</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Acesso restrito e auditado</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Conformidade com CFM</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Aprovação do Comitê de Ética</span>
                  </div>
                </div>
                <Separator className="my-3" />
                <p className="text-xs text-blue-600">
                  Todos os dados são tratados conforme LGPD, diretrizes éticas de pesquisa médica e resoluções do Conselho Federal de Medicina.
                </p>
              </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </div>
  );
}