import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PatientQuickInfo() {
  const [currentPatientId] = useState("current-patient-id"); // This would come from context

  const { data: currentPatient, isLoading } = useQuery({
    queryKey: ['/api/patients', currentPatientId],
    enabled: !!currentPatientId,
  });

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
          <Button 
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
            data-testid="button-start-video-call"
          >
            <i className="fas fa-video mr-2"></i>
            Iniciar Videochamada
          </Button>
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
