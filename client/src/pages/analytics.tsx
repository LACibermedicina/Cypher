import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  UserCheck, 
  Calendar,
  FileText,
  CreditCard,
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  DollarSign,
  Stethoscope,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardMetrics {
  overview: {
    totalPatients: number;
    totalDoctors: number;
    appointmentsThisPeriod: number;
    completedAppointments: number;
    prescriptionsThisPeriod: number;
    tmcCreditsUsed: number;
    completionRate: number;
  };
  activityTrend: Array<{
    date: string;
    count: number;
  }>;
  period: number;
}

interface PatientAnalytics {
  ageDistribution: Array<{
    ageGroup: string;
    count: number;
  }>;
  genderDistribution: Array<{
    gender: string;
    count: number;
  }>;
  registrationTrend: Array<{
    registrationDate: string;
    count: number;
  }>;
}

interface DoctorAnalytics {
  doctors: Array<{
    doctorId: string;
    doctorName: string;
    appointmentCount: number;
    completedCount: number;
    cancelledCount: number;
    completionRate: number;
    prescriptionCount: number;
    totalRevenue: number;
  }>;
  period: number;
}

interface PrescriptionAnalytics {
  prescriptionTrend: Array<{
    date: string;
    count: number;
  }>;
  topMedications: Array<{
    medicationName: string;
    prescriptionCount: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
  period: number;
}

interface FinancialAnalytics {
  revenueByType: Array<{
    transactionType: string;
    totalAmount: number;
    transactionCount: number;
  }>;
  tmcFlowTrend: Array<{
    date: string;
    totalRevenue: number;
  }>;
  topSpenders: Array<{
    userId: string;
    userName: string;
    totalSpent: number;
  }>;
  period: number;
}

interface SystemAnalytics {
  userActivity: Array<{
    date: string;
    activeUsers: number;
  }>;
  whatsappActivity: Array<{
    date: string;
    messageCount: number;
    aiMessages: number;
  }>;
  examResults: Array<{
    examType: string;
    count: number;
    aiAnalyzed: number;
  }>;
  aiUsage: {
    aiGeneratedRecords: number;
    totalRecords: number;
  };
  period: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Dashboard Overview
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/api/analytics/dashboard', { period: selectedPeriod }],
    queryFn: () => fetch(`/api/analytics/dashboard?period=${selectedPeriod}`).then(res => res.json()),
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Patient Analytics
  const { data: patientData, isLoading: patientLoading } = useQuery<PatientAnalytics>({
    queryKey: ['/api/analytics/patients'],
    queryFn: () => fetch('/api/analytics/patients').then(res => res.json()),
    enabled: activeTab === 'patients',
  });

  // Doctor Analytics
  const { data: doctorData, isLoading: doctorLoading } = useQuery<DoctorAnalytics>({
    queryKey: ['/api/analytics/doctors', { period: selectedPeriod }],
    queryFn: () => fetch(`/api/analytics/doctors?period=${selectedPeriod}`).then(res => res.json()),
    enabled: activeTab === 'doctors',
  });

  // Prescription Analytics
  const { data: prescriptionData, isLoading: prescriptionLoading } = useQuery<PrescriptionAnalytics>({
    queryKey: ['/api/analytics/prescriptions', { period: selectedPeriod }],
    queryFn: () => fetch(`/api/analytics/prescriptions?period=${selectedPeriod}`).then(res => res.json()),
    enabled: activeTab === 'prescriptions',
  });

  // Financial Analytics
  const { data: financialData, isLoading: financialLoading } = useQuery<FinancialAnalytics>({
    queryKey: ['/api/analytics/financial', { period: selectedPeriod }],
    queryFn: () => fetch(`/api/analytics/financial?period=${selectedPeriod}`).then(res => res.json()),
    enabled: activeTab === 'financial',
  });

  // System Analytics
  const { data: systemData, isLoading: systemLoading } = useQuery<SystemAnalytics>({
    queryKey: ['/api/analytics/system', { period: selectedPeriod }],
    queryFn: () => fetch(`/api/analytics/system?period=${selectedPeriod}`).then(res => res.json()),
    enabled: activeTab === 'system',
  });

  const handleExportReport = async (reportType: string) => {
    try {
      const response = await fetch(`/api/analytics/export/${reportType}?period=${selectedPeriod}&format=csv`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${reportType}-report-${selectedPeriod}days.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100); // Assuming values are in cents
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Analytics e Relatórios Avançados
          </h1>
          <p className="text-muted-foreground mt-2">
            Insights detalhados do sistema de telemedicina
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={() => handleExportReport(activeTab)}
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="patients" data-testid="tab-patients">
            <Users className="h-4 w-4 mr-2" />
            Pacientes
          </TabsTrigger>
          <TabsTrigger value="doctors" data-testid="tab-doctors">
            <Stethoscope className="h-4 w-4 mr-2" />
            Médicos
          </TabsTrigger>
          <TabsTrigger value="prescriptions" data-testid="tab-prescriptions">
            <FileText className="h-4 w-4 mr-2" />
            Prescrições
          </TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">
            <DollarSign className="h-4 w-4 mr-2" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">
            <Activity className="h-4 w-4 mr-2" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Overview */}
        <TabsContent value="dashboard" className="space-y-6">
          {dashboardLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-8 bg-muted rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Total de Pacientes
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">
                        {dashboardData?.overview.totalPatients.toLocaleString() || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Total de Médicos
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">
                        {dashboardData?.overview.totalDoctors.toLocaleString() || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Consultas ({selectedPeriod} dias)
                      </span>
                    </div>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-2xl font-bold">
                        {dashboardData?.overview.appointmentsThisPeriod.toLocaleString() || 0}
                      </span>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {dashboardData?.overview.completionRate || 0}% concluídas
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-medium text-muted-foreground">
                        TMC Utilizados
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">
                        {dashboardData?.overview.tmcCreditsUsed.toLocaleString() || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Atividade do Sistema (Últimos {selectedPeriod} dias)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dashboardData?.activityTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Patient Analytics */}
        <TabsContent value="patients" className="space-y-6">
          {patientLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Age Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Idade</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={patientData?.ageDistribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {(patientData?.ageDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gender Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Gênero</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={patientData?.genderDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="gender" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Registration Trend */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Tendência de Cadastros (Últimos 12 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={patientData?.registrationTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="registrationDate"
                        tickFormatter={(value) => format(new Date(value), 'MMM/yy', { locale: ptBR })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'MMMM yyyy', { locale: ptBR })}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Doctor Performance */}
        <TabsContent value="doctors" className="space-y-6">
          {doctorLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Performance dos Médicos (Últimos {selectedPeriod} dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Médico</th>
                        <th className="text-center p-3 font-medium">Consultas</th>
                        <th className="text-center p-3 font-medium">Concluídas</th>
                        <th className="text-center p-3 font-medium">Taxa (%)</th>
                        <th className="text-center p-3 font-medium">Prescrições</th>
                        <th className="text-center p-3 font-medium">Receita TMC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(doctorData?.doctors || []).map((doctor, index) => (
                        <tr key={doctor.doctorId} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{doctor.doctorName}</td>
                          <td className="text-center p-3">{doctor.appointmentCount}</td>
                          <td className="text-center p-3">{doctor.completedCount}</td>
                          <td className="text-center p-3">
                            <Badge 
                              variant={doctor.completionRate >= 80 ? "default" : "secondary"}
                              className={doctor.completionRate >= 80 ? "bg-green-600" : ""}
                            >
                              {doctor.completionRate}%
                            </Badge>
                          </td>
                          <td className="text-center p-3">{doctor.prescriptionCount}</td>
                          <td className="text-center p-3">{doctor.totalRevenue.toLocaleString()} TMC</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Prescription Analytics */}
        <TabsContent value="prescriptions" className="space-y-6">
          {prescriptionLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prescription Trend */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Tendência de Prescrições</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={prescriptionData?.prescriptionTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#00C49F" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Medications */}
              <Card>
                <CardHeader>
                  <CardTitle>Medicamentos Mais Prescritos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(prescriptionData?.topMedications || []).slice(0, 8).map((med, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate flex-1">
                          {med.medicationName || 'Medicamento Personalizado'}
                        </span>
                        <Badge variant="outline">{med.prescriptionCount}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Status das Prescrições</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={prescriptionData?.statusDistribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {(prescriptionData?.statusDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Financial Analytics */}
        <TabsContent value="financial" className="space-y-6">
          {financialLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Fluxo de TMC (Últimos {selectedPeriod} dias)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={financialData?.tmcFlowTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                        formatter={(value) => [`${value} TMC`, 'Receita']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalRevenue" 
                        stroke="#FF8042" 
                        fill="#FF8042" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Revenue by Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Receita por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(financialData?.revenueByType || []).map((type, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {type.transactionType}
                        </span>
                        <div className="text-right">
                          <div className="font-medium">{type.totalAmount.toLocaleString()} TMC</div>
                          <div className="text-xs text-muted-foreground">
                            {type.transactionCount} transações
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Spenders */}
              <Card>
                <CardHeader>
                  <CardTitle>Maiores Usuários TMC</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(financialData?.topSpenders || []).slice(0, 8).map((spender, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate flex-1">
                          {spender.userName || 'Usuário não identificado'}
                        </span>
                        <Badge variant="outline">{spender.totalSpent.toLocaleString()} TMC</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* System Analytics */}
        <TabsContent value="system" className="space-y-6">
          {systemLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Uso de IA no Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Registros com IA</span>
                      <Badge variant="outline">
                        {systemData?.aiUsage.aiGeneratedRecords || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total de Registros</span>
                      <Badge variant="outline">
                        {systemData?.aiUsage.totalRecords || 0}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Taxa de Uso IA</span>
                      <Badge variant="default" className="bg-blue-600">
                        {systemData?.aiUsage.totalRecords > 0 
                          ? Math.round((systemData.aiUsage.aiGeneratedRecords / systemData.aiUsage.totalRecords) * 100)
                          : 0}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Exam Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Exames por IA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(systemData?.examResults || []).map((exam, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {exam.examType}
                        </span>
                        <div className="text-right">
                          <div className="font-medium">{exam.count} exames</div>
                          <div className="text-xs text-muted-foreground">
                            {exam.aiAnalyzed} analisados por IA
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp Activity */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Atividade WhatsApp</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={systemData?.whatsappActivity || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                      />
                      <Bar dataKey="messageCount" fill="#25D366" name="Total de Mensagens" />
                      <Bar dataKey="aiMessages" fill="#128C7E" name="Mensagens da IA" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}