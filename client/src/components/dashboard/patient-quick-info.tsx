import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PatientQuickInfo() {
  const [currentPatientId] = useState("current-patient-id"); // This would come from context
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const { toast } = useToast();

  const { data: currentPatient, isLoading } = useQuery({
    queryKey: ['/api/patients', currentPatientId],
    enabled: !!currentPatientId,
  });

  // Get all patients for selection
  const { data: allPatients = [] } = useQuery({
    queryKey: ['/api/patients'],
  });

  const handleStartVideoCall = async (patientId?: string) => {
    try {
      const targetPatientId = patientId || currentPatientId;
      const selectedPatient = allPatients.find(p => p.id === targetPatientId) || mockPatient;

      // Send notifications to patient
      try {
        // WhatsApp notification
        await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedPatient.phone || '5511900000000',
            message: `🩺 *Telemed* - Consulta Iniciada\n\nOlá ${selectedPatient.name}!\n\nSeu médico está iniciando a consulta agora. Entre na sala de videochamada através do link que será enviado em breve.\n\n⏰ Horário: ${format(new Date(), 'HH:mm', { locale: ptBR })}`
          })
        });

        // SMS notification if enabled
        if (selectedPatient.smsEnabled) {
          await fetch('/api/notifications/sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: selectedPatient.phone,
              message: `Telemed: Seu médico está iniciando a consulta. Acesse o link que será enviado por WhatsApp.`
            })
          });
        }
      } catch (notificationError) {
        console.warn('Failed to send notifications:', notificationError);
      }

      // Redirect to video consultation page
      window.location.href = `/consultation/video/${targetPatientId}`;

      toast({
        title: "Videochamada Iniciada",
        description: `Consulta com ${selectedPatient.name} foi iniciada. Notificações enviadas!`,
      });

      setShowPatientSelector(false);
    } catch (error) {
      toast({
        title: "Erro ao Iniciar Videochamada",
        description: "Não foi possível iniciar a consulta. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Paciente Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentPatient) {
    return (
      <Card data-testid="card-patient-quick-info">
        <CardHeader>
          <CardTitle>Paciente Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <i className="fas fa-user text-4xl text-muted-foreground mb-3"></i>
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Nenhum paciente selecionado
            </h3>
            <p className="text-muted-foreground">
              Selecione um paciente para ver as informações
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mock current patient data based on design
  const mockPatient = {
    id: "patient-1",
    name: "Maria Santos",
    age: 45,
    gender: "Feminino",
    patientId: "#MS2024001",
    lastVisit: "15/12/2023",
    bloodType: "O+",
    allergies: "Penicilina",
    photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100"
  };

  return (
    <Card data-testid="card-patient-quick-info">
      <CardHeader className="border-b border-border">
        <CardTitle>Paciente Atual</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <img 
            src={mockPatient.photoUrl}
            alt="Patient photo" 
            className="w-16 h-16 rounded-full object-cover"
            data-testid="img-patient-photo"
          />
          <div>
            <h3 className="font-semibold" data-testid="text-patient-name">
              {mockPatient.name}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid="text-patient-details">
              {mockPatient.age} anos • {mockPatient.gender}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-patient-id">
              ID: {mockPatient.patientId}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Última Consulta:</span>
            <span className="text-sm font-medium" data-testid="text-last-visit">
              {mockPatient.lastVisit}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Tipo Sanguíneo:</span>
            <span className="text-sm font-medium" data-testid="text-blood-type">
              {mockPatient.bloodType}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Alergias:</span>
            <Badge variant="destructive" className="text-xs" data-testid="badge-allergies">
              {mockPatient.allergies}
            </Badge>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <Dialog open={showPatientSelector} onOpenChange={setShowPatientSelector}>
            <DialogTrigger asChild>
              <Button 
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                data-testid="button-start-video-call"
              >
                <i className="fas fa-video mr-2"></i>
                Iniciar Videochamada
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Selecionar Paciente para Videochamada</DialogTitle>
                <DialogDescription>
                  Escolha um paciente para iniciar a consulta por videochamada. Notificações serão enviadas automaticamente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {/* Current patient option */}
                {mockPatient && (
                  <div 
                    className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleStartVideoCall(mockPatient.id)}
                    data-testid="patient-option-current"
                  >
                    <img 
                      src={mockPatient.photoUrl}
                      alt="Patient" 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{mockPatient.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {mockPatient.age} anos • ID: {mockPatient.patientId}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Atual</Badge>
                  </div>
                )}

                {/* Other patients */}
                {allPatients.slice(0, 5).map((patient: any) => (
                  <div 
                    key={patient.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleStartVideoCall(patient.id)}
                    data-testid={`patient-option-${patient.id}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <i className="fas fa-user text-primary text-sm"></i>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{patient.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {patient.age || 'N/A'} anos • {patient.email || 'Email não informado'}
                      </div>
                    </div>
                    <i className="fas fa-video text-muted-foreground"></i>
                  </div>
                ))}

                {allPatients.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <i className="fas fa-users text-3xl mb-3"></i>
                    <p>Nenhum paciente disponível</p>
                    <p className="text-sm">Cadastre pacientes para iniciar videochamadas</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline" 
            className="w-full"
            data-testid="button-open-medical-record"
          >
            <i className="fas fa-file-medical mr-2"></i>
            Abrir Prontuário
          </Button>
        </div>

        {/* Additional quick actions */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" data-testid="button-send-message">
              <i className="fab fa-whatsapp mr-1 text-green-600"></i>
              Mensagem
            </Button>
            <Button variant="outline" size="sm" data-testid="button-schedule-appointment">
              <i className="fas fa-calendar-plus mr-1"></i>
              Agendar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
