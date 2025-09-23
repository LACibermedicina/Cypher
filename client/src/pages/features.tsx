import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Video, 
  Shield, 
  MessageCircle, 
  Bot, 
  Calendar, 
  FileText, 
  Smartphone, 
  Cloud, 
  Lock,
  Zap,
  Globe,
  Users,
  TrendingUp,
  Database,
  Wifi,
  Check
} from "lucide-react";

export default function Features() {
  const technicalFeatures = [
    {
      icon: Video,
      title: "Videochamadas HD",
      description: "Consultas médicas por vídeo com qualidade profissional",
      technical: "WebRTC, resolução até 1080p, baixa latência",
      details: [
        "Tecnologia WebRTC para conexão direta",
        "Qualidade adaptativa baseada na conexão",
        "Criptografia end-to-end",
        "Suporte a múltiplos dispositivos"
      ]
    },
    {
      icon: Bot,
      title: "Assistente Virtual IA",
      description: "Inteligência artificial para triagem e orientações médicas",
      technical: "OpenAI GPT-5, processamento de linguagem natural",
      details: [
        "Análise inteligente de sintomas",
        "Agendamento automatizado",
        "Base de conhecimento médico",
        "Integração com prontuários"
      ]
    },
    {
      icon: Shield,
      title: "Segurança LGPD",
      description: "Proteção de dados conforme legislação brasileira",
      technical: "Criptografia AES-256, conformidade LGPD/GDPR",
      details: [
        "Criptografia de dados em repouso e trânsito",
        "Controle granular de acesso",
        "Auditoria completa de ações",
        "Backup automatizado seguro"
      ]
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Integrado",
      description: "Comunicação direta via WhatsApp Business API",
      technical: "WhatsApp Business API, webhooks em tempo real",
      details: [
        "Notificações automáticas",
        "Status de consultas",
        "Lembretes de agendamento",
        "Suporte 24/7"
      ]
    },
    {
      icon: FileText,
      title: "Assinatura Digital",
      description: "Prescrições e documentos com assinatura eletrônica",
      technical: "FIPS 140-2 Level 3, certificados digitais A1/A3",
      details: [
        "Validade jurídica garantida",
        "Certificação ICP-Brasil",
        "Timestamping seguro",
        "Geração de PDFs assinados"
      ]
    },
    {
      icon: Database,
      title: "Prontuários Digitais",
      description: "Histórico médico completo e organizado",
      technical: "PostgreSQL, backup em nuvem, versionamento",
      details: [
        "Histórico versionado",
        "Busca inteligente",
        "Anexos seguros",
        "Compartilhamento controlado"
      ]
    }
  ];

  const architectureSpecs = [
    {
      category: "Frontend",
      technologies: [
        { name: "React 18", description: "Interface moderna e responsiva" },
        { name: "TypeScript", description: "Tipagem forte e segurança" },
        { name: "Tailwind CSS", description: "Design system consistente" },
        { name: "Wouter", description: "Roteamento otimizado" }
      ]
    },
    {
      category: "Backend", 
      technologies: [
        { name: "Node.js", description: "Runtime de alta performance" },
        { name: "Express.js", description: "Framework web robusto" },
        { name: "PostgreSQL", description: "Banco de dados relacional" },
        { name: "Drizzle ORM", description: "ORM type-safe" }
      ]
    },
    {
      category: "Infraestrutura",
      technologies: [
        { name: "Neon Database", description: "PostgreSQL serverless" },
        { name: "WebSocket", description: "Comunicação em tempo real" },
        { name: "CDN Global", description: "Entrega de conteúdo otimizada" },
        { name: "SSL/TLS", description: "Criptografia de transporte" }
      ]
    },
    {
      category: "Integrações",
      technologies: [
        { name: "OpenAI API", description: "Inteligência artificial médica" },
        { name: "WhatsApp Business", description: "Comunicação via WhatsApp" },
        { name: "TMC Payment", description: "Sistema de pagamentos próprio" },
        { name: "Digital Certificates", description: "Assinatura eletrônica" }
      ]
    }
  ];

  const performanceMetrics = [
    { metric: "Uptime", value: "99.9%", description: "Disponibilidade garantida" },
    { metric: "Latência", value: "<200ms", description: "Resposta ultra-rápida" },
    { metric: "Segurança", value: "A+", description: "Classificação SSL Labs" },
    { metric: "LGPD", value: "100%", description: "Conformidade total" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <Link href="/">
            <Button variant="ghost" className="mb-6 text-white hover:bg-white/10" data-testid="button-back-home">
              ← Voltar para Início
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Recursos Técnicos da Plataforma</h1>
            <p className="text-xl text-blue-100 mb-8">
              Tecnologia de ponta para cuidados médicos digitais
            </p>
            <div className="flex justify-center space-x-4">
              <Badge className="bg-white/20 text-white text-lg px-4 py-2">
                <Zap className="w-4 h-4 mr-2" />
                Alta Performance
              </Badge>
              <Badge className="bg-white/20 text-white text-lg px-4 py-2">
                <Shield className="w-4 h-4 mr-2" />
                Segurança Máxima
              </Badge>
              <Badge className="bg-white/20 text-white text-lg px-4 py-2">
                <Cloud className="w-4 h-4 mr-2" />
                Cloud Native
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">

        {/* Main Features */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">Funcionalidades Principais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {technicalFeatures.map((feature, index) => (
              <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                  <Badge variant="outline" className="w-fit">{feature.technical}</Badge>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="flex items-center space-x-2 text-sm">
                        <Check className="w-3 h-3 text-green-600" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">Arquitetura Técnica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {architectureSpecs.map((category, index) => (
              <Card key={index} className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg text-center">{category.category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.technologies.map((tech, i) => (
                    <div key={i} className="border-l-2 border-blue-200 pl-3">
                      <h4 className="font-semibold text-sm">{tech.name}</h4>
                      <p className="text-xs text-muted-foreground">{tech.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Performance Metrics */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">Métricas de Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {performanceMetrics.map((metric, index) => (
              <Card key={index} className="shadow-lg text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-primary mb-2">{metric.value}</div>
                  <div className="font-semibold">{metric.metric}</div>
                  <div className="text-sm text-muted-foreground">{metric.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Security & Compliance */}
        <section>
          <Card className="shadow-xl bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-center text-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 mr-3 text-green-600" />
                Segurança & Conformidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <Lock className="w-12 h-12 mx-auto mb-3 text-green-600" />
                  <h3 className="font-bold text-green-800">Criptografia Avançada</h3>
                  <p className="text-sm text-green-600">
                    AES-256 para dados, TLS 1.3 para transporte, chaves gerenciadas por HSM
                  </p>
                </div>
                <div className="text-center">
                  <Globe className="w-12 h-12 mx-auto mb-3 text-green-600" />
                  <h3 className="font-bold text-green-800">Conformidade LGPD</h3>
                  <p className="text-sm text-green-600">
                    Compliance total com LGPD/GDPR, auditoria contínua, direitos do titular
                  </p>
                </div>
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-green-600" />
                  <h3 className="font-bold text-green-800">Controle de Acesso</h3>
                  <p className="text-sm text-green-600">
                    RBAC granular, autenticação multifator, sessões seguras
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Scalability */}
        <section>
          <Card className="shadow-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-center text-2xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 mr-3 text-blue-600" />
                Escalabilidade & Disponibilidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-blue-800 mb-4">Infraestrutura Cloud</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Auto-scaling baseado em demanda</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Load balancer com failover</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Backup automatizado multi-região</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">CDN global para baixa latência</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-blue-800 mb-4">Monitoramento 24/7</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Alertas em tempo real</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Métricas de performance contínuas</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Log aggregation e análise</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">SLA 99.9% de uptime</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Mobile Responsive */}
        <section>
          <Card className="shadow-xl bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-center text-2xl flex items-center justify-center">
                <Smartphone className="w-8 h-8 mr-3 text-purple-600" />
                Experiência Mobile-First
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-purple-700 mb-6">
                  Interface otimizada para todos os dispositivos, com foco na experiência mobile
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <Smartphone className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <div className="font-semibold">Mobile</div>
                    <div className="text-sm text-muted-foreground">iOS & Android</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="w-8 h-8 mx-auto mb-2 bg-purple-100 rounded flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-xs">TAB</span>
                    </div>
                    <div className="font-semibold">Tablet</div>
                    <div className="text-sm text-muted-foreground">iPad & Android</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="w-8 h-8 mx-auto mb-2 bg-purple-100 rounded flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-xs">PC</span>
                    </div>
                    <div className="font-semibold">Desktop</div>
                    <div className="text-sm text-muted-foreground">Windows & Mac</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <Wifi className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <div className="font-semibold">PWA</div>
                    <div className="text-sm text-muted-foreground">Offline-first</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="shadow-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-4">Pronto para Começar?</h2>
              <p className="text-xl text-blue-100 mb-6">
                Experimente toda essa tecnologia na sua prática médica
              </p>
              <div className="flex justify-center space-x-4">
                <Link href="/register/patient">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                    Sou Paciente
                  </Button>
                </Link>
                <Link href="/register/doctor">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                    Sou Médico
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}