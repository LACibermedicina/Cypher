import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_DOCTOR_ID, appointments } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";

type Appointment = typeof appointments.$inferSelect & {
  patient?: { name: string; id: string };
};

export default function TodaySchedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [newScheduledDate, setNewScheduledDate] = useState("");

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments/today', DEFAULT_DOCTOR_ID],
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/appointments/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate the today appointments query
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/today', DEFAULT_DOCTOR_ID] });
      // Also invalidate general appointments queries
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    },
  });

  const handleStartConsultation = (appointmentId: string) => {
    updateAppointmentMutation.mutate(
      {
        id: appointmentId,
        data: { status: 'in-progress' }
      },
      {
        onSuccess: () => {
          toast({
            title: "Consulta iniciada",
            description: "A consulta está agora em andamento.",
          });
        }
      }
    );
  };

  const handleCompleteConsultation = (appointmentId: string) => {
    updateAppointmentMutation.mutate(
      {
        id: appointmentId,
        data: { status: 'completed' }
      },
      {
        onSuccess: () => {
          toast({
            title: "Consulta finalizada",
            description: "A consulta foi concluída com sucesso.",
          });
        }
      }
    );
  };
  
  const handleEnterVideoCall = (appointment: any) => {
    // Navigate to video consultation page
    navigate(`/consultation/video/${appointment.patientId}`);
  };
  
  const handleOpenChat = (appointment: any) => {
    // Navigate to WhatsApp page (could be enhanced to pre-select patient)
    navigate('/whatsapp');
  };
  
  const handleOpenReschedule = (appointment: any) => {
    setSelectedAppointment(appointment);
    // Set default to 1 day ahead
    const defaultDate = format(addDays(new Date(appointment.scheduledAt), 1), "yyyy-MM-dd'T'HH:mm");
    setNewScheduledDate(defaultDate);
    setRescheduleDialogOpen(true);
  };
  
  const handleReschedule = () => {
    if (!selectedAppointment || !newScheduledDate) return;
    
    updateAppointmentMutation.mutate(
      {
        id: selectedAppointment.id,
        data: { scheduledAt: new Date(newScheduledDate).toISOString() }
      },
      {
        onSuccess: () => {
          setRescheduleDialogOpen(false);
          setSelectedAppointment(null);
          toast({
            title: "Consulta reagendada",
            description: "A consulta foi reagendada com sucesso.",
          });
        }
      }
    );
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
    <>
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
                        variant="default"
                        size="sm"
                        onClick={() => handleEnterVideoCall(appointment)}
                        data-testid={`button-enter-${appointment.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <i className="fas fa-video mr-1"></i>
                        Entrar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChat(appointment)}
                        data-testid={`button-chat-${appointment.id}`}
                      >
                        <i className="fas fa-comments mr-1"></i>
                        Chat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReschedule(appointment)}
                        data-testid={`button-reschedule-${appointment.id}`}
                      >
                        <i className="fas fa-calendar-alt mr-1"></i>
                        Reagendar
                      </Button>
                    </>
                  )}
                  
                  {appointment.status === 'in-progress' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChat(appointment)}
                        data-testid={`button-chat-inprogress-${appointment.id}`}
                      >
                        <i className="fas fa-comments mr-1"></i>
                        Chat
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleCompleteConsultation(appointment.id)}
                        data-testid={`button-complete-${appointment.id}`}
                      >
                        <i className="fas fa-check mr-1"></i>
                        Finalizar
                      </Button>
                    </>
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
    
    {/* Reschedule Dialog */}
    <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
      <DialogContent data-testid="dialog-reschedule">
        <DialogHeader>
          <DialogTitle>Reagendar Consulta</DialogTitle>
          <DialogDescription>
            Escolha uma nova data e horário para a consulta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newScheduledDate">Nova Data e Horário</Label>
            <Input
              id="newScheduledDate"
              type="datetime-local"
              value={newScheduledDate}
              onChange={(e) => setNewScheduledDate(e.target.value)}
              data-testid="input-reschedule-date"
            />
          </div>
          {selectedAppointment && (
            <div className="text-sm text-muted-foreground">
              <p>Paciente: {selectedAppointment.patient?.name}</p>
              <p>Data atual: {format(new Date(selectedAppointment.scheduledAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setRescheduleDialogOpen(false)}
            data-testid="button-cancel-reschedule"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleReschedule}
            disabled={updateAppointmentMutation.isPending}
            data-testid="button-confirm-reschedule"
          >
            {updateAppointmentMutation.isPending ? "Reagendando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
