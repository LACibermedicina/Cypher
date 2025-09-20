import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_DOCTOR_ID } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TodaySchedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments/today', DEFAULT_DOCTOR_ID],
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest('PATCH', `/api/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Consulta atualizada",
        description: "Status da consulta foi atualizado com sucesso.",
      });
    },
  });

  const handleStartConsultation = (appointmentId: string) => {
    updateAppointmentMutation.mutate({
      id: appointmentId,
      data: { status: 'in-progress' }
    });
  };

  const handleCompleteConsultation = (appointmentId: string) => {
    updateAppointmentMutation.mutate({
      id: appointmentId,
      data: { status: 'completed' }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agenda de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-today-schedule">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle>Agenda de Hoje</CardTitle>
          <Button data-testid="button-new-appointment">
            <i className="fas fa-plus mr-2"></i>
            Nova Consulta
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {!(appointments || []).length ? (
          <div className="text-center py-8">
            <i className="fas fa-calendar-day text-4xl text-muted-foreground mb-3"></i>
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Nenhuma consulta hoje
            </h3>
            <p className="text-muted-foreground">
              Sua agenda está livre para hoje.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(appointments || []).map((appointment: any) => (
              <div
                key={appointment.id}
                className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                data-testid={`appointment-item-${appointment.id}`}
              >
                <div className="text-primary font-medium text-lg min-w-[60px]">
                  {format(new Date(appointment.scheduledAt), "HH:mm")}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-medium" data-testid={`appointment-patient-${appointment.id}`}>
                      {appointment.patient?.name || "Paciente não identificado"}
                    </p>
                    {appointment.aiScheduled && (
                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                        <i className="fas fa-robot mr-1"></i>
                        IA
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid={`appointment-type-${appointment.id}`}>
                    {appointment.type === 'consultation' ? 'Consulta de Rotina' :
                     appointment.type === 'followup' ? 'Retorno' :
                     appointment.type === 'emergency' ? 'Emergência' : appointment.type}
                  </p>
                  {appointment.notes && (
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`appointment-notes-${appointment.id}`}>
                      {appointment.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {appointment.status === 'scheduled' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartConsultation(appointment.id)}
                        data-testid={`button-start-${appointment.id}`}
                      >
                        <i className="fas fa-video mr-1"></i>
                        Videochamada
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-medical-record-${appointment.id}`}
                      >
                        <i className="fas fa-file-medical mr-1"></i>
                        Prontuário
                      </Button>
                    </>
                  )}
                  
                  {appointment.status === 'in-progress' && (
                    <Button
                      size="sm"
                      onClick={() => handleCompleteConsultation(appointment.id)}
                      data-testid={`button-complete-${appointment.id}`}
                    >
                      <i className="fas fa-check mr-1"></i>
                      Finalizar
                    </Button>
                  )}

                  {appointment.status === 'completed' && (
                    <Badge className="bg-green-100 text-green-800">
                      <i className="fas fa-check mr-1"></i>
                      Concluído
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
