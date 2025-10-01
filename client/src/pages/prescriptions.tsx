import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, FileText, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import CreatePrescriptionForm from '@/components/prescriptions/create-prescription-form';
import PrescriptionDetail from '@/components/prescriptions/prescription-detail';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Prescription {
  id: string;
  prescriptionNumber: string;
  diagnosis: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  doctorName: string;
  patientName?: string;
}

export default function PrescriptionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isPatient = user?.role === 'patient';

  // Get recent prescriptions
  const { data: recentPrescriptions, isLoading, refetch } = useQuery<Prescription[]>({
    queryKey: ['/api/prescriptions/recent'],
    select: (data) => data || []
  });

  const filteredPrescriptions = recentPrescriptions?.filter(prescription => {
    const matchesSearch = !searchTerm || 
      prescription.prescriptionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || prescription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'dispensed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'dispensed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativa';
      case 'dispensed':
        return 'Dispensada';
      case 'cancelled':
        return 'Cancelada';
      case 'expired':
        return 'Expirada';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isPatient ? 'Minhas Prescrições' : 'Sistema de Prescrições'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isPatient 
              ? 'Visualize e baixe suas prescrições médicas' 
              : 'Gerencie prescrições médicas com validação e integração farmácia'
            }
          </p>
        </div>
        
        {!isPatient && (
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2" data-testid="button-create-prescription">
                <Plus className="h-4 w-4" />
                <span>Nova Prescrição</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Prescrição</DialogTitle>
              </DialogHeader>
              <CreatePrescriptionForm 
                onSuccess={() => {
                  setIsCreateModalOpen(false);
                  refetch();
                }} 
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número da prescrição ou diagnóstico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-prescription"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                data-testid="filter-all"
              >
                Todas
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                data-testid="filter-active"
              >
                Ativas
              </Button>
              <Button
                variant={statusFilter === 'dispensed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('dispensed')}
                data-testid="filter-dispensed"
              >
                Dispensadas
              </Button>
              <Button
                variant={statusFilter === 'expired' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('expired')}
                data-testid="filter-expired"
              >
                Expiradas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredPrescriptions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma prescrição encontrada
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Crie sua primeira prescrição para começar'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Prescrição
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPrescriptions.map((prescription) => (
            <Card 
              key={prescription.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedPrescription(prescription.id)}
              data-testid={`prescription-card-${prescription.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(prescription.status)}
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {prescription.prescriptionNumber}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {prescription.diagnosis || 'Sem diagnóstico especificado'}
                      </p>
                    </div>
                  </div>
                  
                  <Badge className={`${getStatusColor(prescription.status)} border`}>
                    {getStatusLabel(prescription.status)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Criada em</p>
                    <p className="font-medium">
                      {format(new Date(prescription.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Expira em</p>
                    <p className="font-medium">
                      {format(new Date(prescription.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Médico</p>
                    <p className="font-medium">{prescription.doctorName || 'Não informado'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Prescription Detail Modal */}
      {selectedPrescription && (
        <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Prescrição</DialogTitle>
            </DialogHeader>
            <PrescriptionDetail 
              prescriptionId={selectedPrescription}
              onClose={() => setSelectedPrescription(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}