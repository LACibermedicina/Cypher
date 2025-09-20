import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments/doctor/doctor-id', selectedDate.toISOString()],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string, aiScheduled: boolean) => {
    if (aiScheduled) return "fas fa-robot text-purple-600";
    switch (type) {
      case 'consultation':
        return "fas fa-stethoscope text-blue-600";
      case 'followup':
        return "fas fa-redo text-green-600";
      case 'emergency':
        return "fas fa-exclamation text-red-600";
      default:
        return "fas fa-calendar text-gray-600";
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agenda Médica</h1>
          <p className="text-muted-foreground">
            Gerencie seus horários e consultas - {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button data-testid="button-new-appointment">
          <i className="fas fa-plus mr-2"></i>
          Nova Consulta
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calendário</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="w-full"
                data-testid="calendar-schedule"
              />
              <div className="mt-4 space-y-2">
                <div className="text-sm text-muted-foreground">Legenda:</div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Consultas</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>Agendamentos IA</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Retornos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Consultas do Dia</span>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <i className="fas fa-calendar text-primary"></i>
                  <span data-testid="text-appointment-count">
                    {appointments?.length || 0} consultas agendadas
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!appointments || appointments.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fas fa-calendar-day text-6xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    Nenhuma consulta agendada
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Não há consultas marcadas para este dia.
                  </p>
                  <Button variant="outline" data-testid="button-add-first-appointment">
                    <i className="fas fa-plus mr-2"></i>
                    Agendar primeira consulta
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appointment: any) => (
                    <div
                      key={appointment.id}
                      className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`card-appointment-${appointment.id}`}
                    >
                      <div className="flex-shrink-0">
                        <div className="text-primary font-bold text-lg">
                          {format(new Date(appointment.scheduledAt), "HH:mm")}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate" data-testid={`text-appointment-patient-${appointment.id}`}>
                            {appointment.patientName || "Paciente não identificado"}
                          </h3>
                          {appointment.aiScheduled && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                              <i className="fas fa-robot mr-1"></i>
                              IA
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <i className={getTypeIcon(appointment.type, appointment.aiScheduled)}></i>
                          <span data-testid={`text-appointment-type-${appointment.id}`}>
                            {appointment.type === 'consultation' ? 'Consulta' :
                             appointment.type === 'followup' ? 'Retorno' :
                             appointment.type === 'emergency' ? 'Emergência' : appointment.type}
                          </span>
                          {appointment.notes && (
                            <>
                              <span>•</span>
                              <span data-testid={`text-appointment-notes-${appointment.id}`}>
                                {appointment.notes}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={getStatusColor(appointment.status)}
                          data-testid={`badge-appointment-status-${appointment.id}`}
                        >
                          {appointment.status === 'scheduled' ? 'Agendado' :
                           appointment.status === 'completed' ? 'Concluído' :
                           appointment.status === 'cancelled' ? 'Cancelado' : appointment.status}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-start-consultation-${appointment.id}`}
                        >
                          <i className="fas fa-video mr-1"></i>
                          Iniciar
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-edit-appointment-${appointment.id}`}
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <i className="fas fa-clock text-3xl text-primary mb-3"></i>
                <h3 className="font-semibold mb-2">Horários Disponíveis</h3>
                <p className="text-sm text-muted-foreground">Configure seus horários de atendimento</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <i className="fas fa-robot text-3xl text-purple-600 mb-3"></i>
                <h3 className="font-semibold mb-2">Agendamentos IA</h3>
                <p className="text-sm text-muted-foreground">Configurações do agendamento automático</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <i className="fas fa-chart-bar text-3xl text-green-600 mb-3"></i>
                <h3 className="font-semibold mb-2">Relatórios</h3>
                <p className="text-sm text-muted-foreground">Visualize estatísticas de atendimento</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
