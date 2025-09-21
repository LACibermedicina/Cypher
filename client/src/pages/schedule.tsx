import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_DOCTOR_ID } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, startOfDay, endOfDay, isToday, addMinutes, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Calendar as CalendarIcon, Users, AlertCircle, Bell, CheckCircle2, Video, Plus, MoreHorizontal } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VideoConsultation from "@/components/video-consultation/VideoConsultation";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<string>("consultation");
  const [editAppointmentType, setEditAppointmentType] = useState<string>("consultation");
  const [editNotes, setEditNotes] = useState<string>("");
  const [isVideoConsultationOpen, setIsVideoConsultationOpen] = useState(false);
  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [upcomingNotifications, setUpcomingNotifications] = useState<any[]>([]);
  const [quickBookMode, setQuickBookMode] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery<any[]>({
    queryKey: ['/api/appointments/doctor', DEFAULT_DOCTOR_ID, selectedDate.toISOString()],
  });

  // Real-time notification system with interval updates
  useEffect(() => {
    const updateNotifications = () => {
      const now = new Date();
      let upcoming: any[] = [];
      
      if (appointments && appointments.length > 0) {
        upcoming = appointments.filter((apt: any) => {
          const aptTime = new Date(apt.scheduledAt);
          const minutesUntil = differenceInMinutes(aptTime, now);
          return minutesUntil > 0 && minutesUntil <= 30; // Next 30 minutes
        });
      }
      
      // Always update notifications, even if empty
      setUpcomingNotifications(upcoming);
    };

    // Initial update
    updateNotifications();

    // Update every minute for real-time notifications
    const notificationInterval = setInterval(updateNotifications, 60000);

    return () => clearInterval(notificationInterval);
  }, [appointments]);

  // Fetch available slots for appointment creation
  const { data: availableSlots, isLoading: slotsLoading } = useQuery<any[]>({
    queryKey: ['/api/scheduling/available-slots', DEFAULT_DOCTOR_ID],
    enabled: isCreateModalOpen, // Only fetch when modal is open
  });

  // Fetch patients for selection
  const { data: patients } = useQuery<any[]>({
    queryKey: ['/api/patients'],
    enabled: isCreateModalOpen, // Only fetch when modal is open  
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: (appointmentData: any) => apiRequest('POST', '/api/appointments', appointmentData),
    onSuccess: (response, appointmentData) => {
      // Navigate to the appointment's date so user can see the created appointment
      const appointmentDate = new Date(appointmentData.scheduledAt);
      setSelectedDate(appointmentDate);
      
      toast({
        title: "Consulta agendada",
        description: "A consulta foi agendada com sucesso.",
      });
      setIsCreateModalOpen(false);
      setSelectedPatientId("");
      setSelectedSlot("");
      setAppointmentType("consultation");
      // Invalidate and refetch appointments
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/doctor'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao agendar",
        description: error.message || "Não foi possível agendar a consulta.",
        variant: "destructive",
      });
    },
  });

  // Create video consultation mutation
  const createVideoConsultationMutation = useMutation({
    mutationFn: (consultationData: any) => apiRequest('POST', '/api/video-consultations', consultationData),
    onSuccess: (consultation: any) => {
      toast({
        title: "Videochamada iniciada",
        description: "A videochamada foi iniciada com sucesso.",
      });
      setActiveConsultationId(consultation.id);
      setIsVideoConsultationOpen(true);
      queryClient.invalidateQueries({ queryKey: ['/api/video-consultations'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a videochamada.",
        variant: "destructive",
      });
    },
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest('PATCH', `/api/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/doctor'] });
      toast({
        title: "Consulta atualizada",
        description: "A consulta foi atualizada com sucesso.",
      });
      setIsEditModalOpen(false);
      setEditingAppointment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível atualizar a consulta.",
        variant: "destructive",
      });
    },
  });

  const handleStartConsultation = async (appointment: any) => {
    if (!appointment) return;

    try {
      // Create a video consultation session linked to the appointment
      const consultationData = {
        patientId: appointment.patientId,
        doctorId: DEFAULT_DOCTOR_ID,
        appointmentId: appointment.id,
      };

      setSelectedAppointment(appointment);
      createVideoConsultationMutation.mutate(consultationData);
    } catch (error) {
      console.error('Error starting consultation:', error);
    }
  };

  // Handle appointment creation
  const handleCreateAppointment = () => {
    if (!selectedPatientId || !selectedSlot) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um paciente e um horário.",
        variant: "destructive",
      });
      return;
    }

    // Find the selected slot to get proper date/time
    const slot = (availableSlots || []).find((s: any) => s.formatted === selectedSlot);
    if (!slot) {
      toast({
        title: "Horário inválido",
        description: "O horário selecionado não é válido.",
        variant: "destructive",
      });
      return;
    }

    const appointmentData = {
      patientId: selectedPatientId,
      doctorId: DEFAULT_DOCTOR_ID,
      scheduledAt: new Date(`${slot.date} ${slot.time}`),
      type: appointmentType,
      status: 'scheduled',
      aiScheduled: false,
    };

    createAppointmentMutation.mutate(appointmentData);
  };

  // Handle edit appointment
  const handleEditAppointment = (appointment: any) => {
    setEditingAppointment(appointment);
    setEditAppointmentType(appointment.type || 'consultation');
    setEditNotes(appointment.notes || '');
    setIsEditModalOpen(true);
  };

  // Handle update appointment
  const handleUpdateAppointment = () => {
    if (!editingAppointment) return;

    const updateData = {
      type: editAppointmentType,
      notes: editNotes,
    };

    updateAppointmentMutation.mutate({
      id: editingAppointment.id,
      data: updateData,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 dark:from-blue-900/30 dark:to-cyan-900/30 dark:text-blue-300';
      case 'completed':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-300';
      case 'cancelled':
        return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 dark:from-red-900/30 dark:to-rose-900/30 dark:text-red-300';
      case 'in-progress':
        return 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 dark:from-orange-900/30 dark:to-amber-900/30 dark:text-orange-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 dark:from-gray-900/30 dark:to-slate-900/30 dark:text-gray-300';
    }
  };

  const getTimeBasedStyling = (scheduledAt: string) => {
    const now = new Date();
    const aptTime = new Date(scheduledAt);
    const minutesUntil = differenceInMinutes(aptTime, now);
    
    if (minutesUntil <= 0) {
      return 'border-l-4 border-orange-500 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20';
    } else if (minutesUntil <= 30) {
      return 'border-l-4 border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 animate-pulse';
    } else if (isToday(aptTime)) {
      return 'border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20';
    }
    return 'border-l-4 border-gray-300 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20';
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-black dark:to-purple-950">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-primary/20 border-t-primary mx-auto"></div>
          <p className="text-lg font-medium text-muted-foreground">Carregando agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-black dark:to-purple-950"
      data-testid="schedule-page-background"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Modern Header with Notifications */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Agenda Telemed
                </h1>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>
          
          {/* Notification Badge & Actions */}
          <div className="flex items-center gap-3">
            {upcomingNotifications.length > 0 && (
              <div className="relative" data-testid="notification-badge">
                <Button variant="outline" size="sm" className="relative backdrop-blur-lg bg-white/20 border-orange-200 hover:bg-orange-50 dark:bg-black/20 dark:border-orange-800 dark:hover:bg-orange-950/20">
                  <Bell className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
                </Button>
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 min-w-[1rem] h-5 flex items-center justify-center">
                  {upcomingNotifications.length}
                </Badge>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant={viewMode === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('day');
                  // Refresh appointments for current day
                  queryClient.invalidateQueries({ queryKey: ['/api/appointments/doctor'] });
                }}
                data-testid="button-view-day"
                className={`backdrop-blur-lg border-white/20 hover:bg-white/20 dark:border-white/10 dark:hover:bg-black/20 ${
                  viewMode === 'day' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                    : 'bg-white/10 dark:bg-black/10'
                }`}
              >
                Dia
              </Button>
              <Button 
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('week');
                  // Future: implement week view logic
                  toast({ title: 'Visualização Semanal', description: 'Em breve - visualização semanal completa' });
                }}
                data-testid="button-view-week"
                className={`backdrop-blur-lg border-white/20 hover:bg-white/20 dark:border-white/10 dark:hover:bg-black/20 ${
                  viewMode === 'week' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                    : 'bg-white/10 dark:bg-black/10'
                }`}
              >
                Semana
              </Button>
            </div>
            
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              data-testid="button-new-appointment"
              className="btn-medical-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Consulta
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Enhanced Calendar Sidebar */}
          <div className="lg:col-span-1">
            <Card className="backdrop-blur-xl bg-white/80 dark:bg-black/40 border-white/20 dark:border-white/10 shadow-xl">
              <CardHeader className="border-b border-white/10 dark:border-white/5">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Calendário
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  className="w-full backdrop-blur-sm bg-white/50 dark:bg-black/20 rounded-lg p-2"
                  data-testid="calendar-schedule"
                />
                
                {/* Enhanced Legend with Modern Styling */}
                <div className="mt-6 space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">Status dos Agendamentos</div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 text-xs">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-sm"></div>
                      <span className="text-muted-foreground">Consultas agendadas</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs">
                      <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-sm animate-pulse"></div>
                      <span className="text-muted-foreground">Agendamentos IA</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs">
                      <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-sm"></div>
                      <span className="text-muted-foreground">Retornos</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs">
                      <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-sm"></div>
                      <span className="text-muted-foreground">Em andamento</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Appointments List */}
          <div className="lg:col-span-3">
            <Card className="backdrop-blur-xl bg-white/80 dark:bg-black/40 border-white/20 dark:border-white/10 shadow-xl">
              <CardHeader className="border-b border-white/10 dark:border-white/5">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white">
                      <Users className="h-4 w-4" />
                    </div>
                    <span>Consultas do Dia</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {upcomingNotifications.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-800 dark:text-orange-200">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {upcomingNotifications.length} próxima{upcomingNotifications.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <span data-testid="text-appointment-count">
                        {(appointments || []).length} consultas agendadas
                      </span>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
            <CardContent>
              {!(appointments || []).length ? (
                <div className="text-center py-12">
                  <i className="fas fa-calendar-day text-6xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    Nenhuma consulta agendada
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Não há consultas marcadas para este dia.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(true)}
                    data-testid="button-add-first-appointment"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Agendar primeira consulta
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(appointments || []).map((appointment: any) => (
                    <div
                      key={appointment.id}
                      className={`flex items-center space-x-4 p-6 rounded-2xl transition-all duration-300 hover:shadow-lg backdrop-blur-sm ${getTimeBasedStyling(appointment.scheduledAt)}`}
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
                          onClick={() => handleStartConsultation(appointment)}
                          disabled={createVideoConsultationMutation.isPending}
                          data-testid={`button-start-consultation-${appointment.id}`}
                        >
                          <i className="fas fa-video mr-1"></i>
                          {createVideoConsultationMutation.isPending ? 'Iniciando...' : 'Iniciar'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-edit-appointment-${appointment.id}`}
                          onClick={() => handleEditAppointment(appointment)}
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

      {/* Appointment Creation Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md" data-testid="modal-create-appointment">
          <DialogHeader>
            <DialogTitle>Nova Consulta</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Patient Selection */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Paciente
              </label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger data-testid="select-patient">
                  <SelectValue placeholder="Selecione um paciente" />
                </SelectTrigger>
                <SelectContent>
                  {(patients || []).map((patient: any) => (
                    <SelectItem 
                      key={patient.id} 
                      value={patient.id}
                      data-testid={`option-patient-${patient.id}`}
                    >
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Available Slots */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Horário Disponível
              </label>
              <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                <SelectTrigger data-testid="select-available-slot">
                  <SelectValue placeholder="Selecione um horário" />
                </SelectTrigger>
                <SelectContent>
                  {slotsLoading ? (
                    <SelectItem value="loading" disabled>
                      Carregando horários...
                    </SelectItem>
                  ) : (
                    (availableSlots || []).map((slot: any, index: number) => (
                      <SelectItem 
                        key={index} 
                        value={slot.formatted}
                        data-testid={`option-slot-${index}`}
                      >
                        {slot.formatted}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Appointment Type */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Tipo de Consulta
              </label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger data-testid="select-appointment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation" data-testid="option-type-consultation">
                    Consulta
                  </SelectItem>
                  <SelectItem value="followup" data-testid="option-type-followup">
                    Retorno
                  </SelectItem>
                  <SelectItem value="emergency" data-testid="option-type-emergency">
                    Emergência
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateModalOpen(false)}
                data-testid="button-cancel-appointment"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateAppointment}
                disabled={createAppointmentMutation.isPending || !selectedPatientId || !selectedSlot}
                data-testid="button-confirm-appointment"
              >
                {createAppointmentMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Agendando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check mr-2"></i>
                    Agendar Consulta
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md" data-testid="modal-edit-appointment">
          <DialogHeader>
            <DialogTitle>Editar Consulta</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {editingAppointment && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Paciente: <span className="font-medium">{editingAppointment.patientName}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Data/Hora: <span className="font-medium">
                    {format(new Date(editingAppointment.scheduledAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Consulta</label>
              <Select value={editAppointmentType} onValueChange={setEditAppointmentType}>
                <SelectTrigger data-testid="select-edit-appointment-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consulta</SelectItem>
                  <SelectItem value="followup">Retorno</SelectItem>
                  <SelectItem value="emergency">Emergência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Observações</label>
              <Textarea 
                placeholder="Observações sobre a consulta..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                data-testid="textarea-edit-notes"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1"
                data-testid="button-cancel-edit"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdateAppointment}
                disabled={updateAppointmentMutation.isPending}
                className="flex-1"
                data-testid="button-save-edit"
              >
                {updateAppointmentMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Consultation Dialog */}
      <Dialog open={isVideoConsultationOpen} onOpenChange={setIsVideoConsultationOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden" data-testid="dialog-video-consultation">
          <DialogHeader>
            <DialogTitle>
              Videochamada - {selectedAppointment?.patientName || 'Consulta'}
            </DialogTitle>
          </DialogHeader>
          {activeConsultationId && selectedAppointment && (
            <VideoConsultation
              appointmentId={selectedAppointment.id}
              patientId={selectedAppointment.patientId}
              doctorId={DEFAULT_DOCTOR_ID}
              patientName={selectedAppointment.patientName || 'Paciente'}
              onCallEnd={() => {
                setIsVideoConsultationOpen(false);
                setActiveConsultationId(null);
                setSelectedAppointment(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Actions Cards - Only show on main page */}
      {!isCreateModalOpen && !isVideoConsultationOpen && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="quick-actions-grid">
          <Card 
            className="hover:shadow-lg transition-all duration-300 backdrop-blur-xl bg-white/80 dark:bg-black/40 border-white/20 dark:border-white/10 cursor-pointer group" 
            data-testid="quick-action-schedule"
          >
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Horários Disponíveis</h3>
              <p className="text-sm text-muted-foreground">Configure seus horários de atendimento</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all duration-300 backdrop-blur-xl bg-white/80 dark:bg-black/40 border-white/20 dark:border-white/10 cursor-pointer group" 
            data-testid="quick-action-ai"
          >
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <i className="fas fa-robot text-white"></i>
              </div>
              <h3 className="font-semibold mb-2">Agendamentos IA</h3>
              <p className="text-sm text-muted-foreground">Configurações do agendamento automático</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all duration-300 backdrop-blur-xl bg-white/80 dark:bg-black/40 border-white/20 dark:border-white/10 cursor-pointer group" 
            data-testid="quick-action-reports"
          >
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <i className="fas fa-chart-bar text-white"></i>
              </div>
              <h3 className="font-semibold mb-2">Relatórios</h3>
              <p className="text-sm text-muted-foreground">Visualize estatísticas de atendimento</p>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
