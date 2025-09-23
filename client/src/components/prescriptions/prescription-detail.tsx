import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Calendar, User, Pill, AlertTriangle, Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PrescriptionDetailProps {
  prescriptionId: string;
  onClose: () => void;
}

interface PrescriptionItem {
  id: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
  customMedication?: string;
  isGenericAllowed: boolean;
  priority: number;
  notes?: string;
  medication?: {
    id: string;
    name: string;
    genericName: string;
    activeIngredient: string;
    dosageForm: string;
    strength: string;
  };
}

interface PrescriptionDetail {
  id: string;
  prescriptionNumber: string;
  diagnosis: string;
  notes?: string;
  status: string;
  isElectronic: boolean;
  isUrgent: boolean;
  allowGeneric: boolean;
  specialInstructions?: string;
  expiresAt: string;
  dispensedAt?: string;
  tmcCostPaid: number;
  createdAt: string;
  updatedAt: string;
  patientId: string;
  doctorId: string;
  items: PrescriptionItem[];
}

export default function PrescriptionDetail({ prescriptionId, onClose }: PrescriptionDetailProps) {
  const { data: prescription, isLoading, error } = useQuery<PrescriptionDetail>({
    queryKey: ['/api/prescriptions', prescriptionId],
    enabled: !!prescriptionId,
  });

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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Erro ao carregar prescrição
        </h3>
        <p className="text-muted-foreground mb-4">
          Não foi possível carregar os detalhes da prescrição.
        </p>
        <Button onClick={onClose} variant="outline">
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {prescription.prescriptionNumber}
            </h2>
            <p className="text-sm text-muted-foreground">
              Prescrição Médica Eletrônica
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className={`${getStatusColor(prescription.status)} border`}>
            {getStatusLabel(prescription.status)}
          </Badge>
          {prescription.isUrgent && (
            <Badge variant="destructive">
              Urgente
            </Badge>
          )}
          {prescription.isElectronic && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              Digital
            </Badge>
          )}
        </div>
      </div>

      {/* Prescription Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Informações da Prescrição</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Diagnóstico</p>
              <p className="font-medium">{prescription.diagnosis}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Número da Prescrição</p>
              <p className="font-medium font-mono">{prescription.prescriptionNumber}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Data de Criação</p>
              <p className="font-medium">
                {format(new Date(prescription.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Data de Expiração</p>
              <p className="font-medium">
                {format(new Date(prescription.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
            
            {prescription.dispensedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Data de Dispensação</p>
                <p className="font-medium">
                  {format(new Date(prescription.dispensedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-muted-foreground">Genérico Permitido</p>
              <p className="font-medium">{prescription.allowGeneric ? 'Sim' : 'Não'}</p>
            </div>
          </div>
          
          {prescription.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Observações</p>
              <p className="text-sm bg-muted p-3 rounded-lg">{prescription.notes}</p>
            </div>
          )}
          
          {prescription.specialInstructions && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Instruções Especiais</p>
              <p className="text-sm bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800">
                {prescription.specialInstructions}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Pill className="h-5 w-5" />
            <span>Medicamentos Prescritos ({prescription.items.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prescription.items
            .sort((a, b) => a.priority - b.priority)
            .map((item, index) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      #{item.priority}
                    </Badge>
                    <h4 className="font-medium">
                      {item.medication?.name || item.customMedication}
                    </h4>
                  </div>
                  
                  {item.isGenericAllowed && (
                    <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                      Genérico OK
                    </Badge>
                  )}
                </div>
                
                {item.medication && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nome Genérico: </span>
                      <span className="font-medium">{item.medication.genericName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Forma: </span>
                      <span className="font-medium">{item.medication.dosageForm}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Concentração: </span>
                      <span className="font-medium">{item.medication.strength}</span>
                    </div>
                  </div>
                )}
                
                <Separator className="my-3" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Dosagem</span>
                    <span className="font-medium">{item.dosage}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Frequência</span>
                    <span className="font-medium">{item.frequency}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Duração</span>
                    <span className="font-medium">{item.duration}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Quantidade</span>
                    <span className="font-medium">{item.quantity} unidades</span>
                  </div>
                </div>
                
                <div className="mt-3">
                  <span className="text-muted-foreground text-sm block mb-1">Instruções de Uso</span>
                  <p className="text-sm bg-blue-50 border border-blue-200 p-2 rounded text-blue-800">
                    {item.instructions}
                  </p>
                </div>
                
                {item.notes && (
                  <div className="mt-2">
                    <span className="text-muted-foreground text-sm block mb-1">Observações</span>
                    <p className="text-sm text-muted-foreground italic">
                      {item.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" data-testid="button-download-pdf">
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
            
            <Button variant="outline" data-testid="button-share-pharmacy">
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar com Farmácia
            </Button>
            
            <Button variant="outline" data-testid="button-view-history">
              <Calendar className="h-4 w-4 mr-2" />
              Ver Histórico
            </Button>
            
            {prescription.status === 'active' && (
              <>
                <Button variant="outline" className="text-orange-600 border-orange-600">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Cancelar Prescrição
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* TMC Cost Information */}
      {prescription.tmcCostPaid > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-amber-800">
              <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
              <span className="text-sm font-medium">
                Custo TMC: {prescription.tmcCostPaid} créditos
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}