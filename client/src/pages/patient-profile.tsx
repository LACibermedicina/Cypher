import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Phone, Mail, User, Droplets, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Patient, Appointment, MedicalRecord } from "@shared/schema";

export default function PatientProfile() {
  const { id } = useParams();

  const { data: patient, isLoading, error } = useQuery<Patient>({
    queryKey: ['/api/patients', id],
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments/patient', id],
  });

  const { data: medicalRecords, isLoading: recordsLoading } = useQuery<MedicalRecord[]>({
    queryKey: ['/api/medical-records', id],
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-2">Paciente não encontrado</h2>
              <p className="text-muted-foreground mb-4">
                Não foi possível encontrar as informações do paciente.
              </p>
              <Link href="/patients">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para Lista de Pacientes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/patients">
            <Button variant="outline" size="sm" data-testid="button-back-to-patients">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-patient-name">
              {patient.name}
            </h1>
            <p className="text-muted-foreground">Perfil do Paciente</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" data-testid="button-edit-patient">
            <User className="h-4 w-4 mr-2" />
            Editar Perfil
          </Button>
          <Button variant="outline" data-testid="button-new-appointment">
            <Calendar className="h-4 w-4 mr-2" />
            Nova Consulta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                <p className="text-sm" data-testid="text-patient-full-name">{patient.name}</p>
              </div>
              
              {patient.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm" data-testid="text-patient-email">{patient.email}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm" data-testid="text-patient-phone">{patient.phone}</p>
                </div>
              </div>

              {patient.dateOfBirth && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                  <p className="text-sm" data-testid="text-patient-birth-date">
                    {format(new Date(patient.dateOfBirth), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}

              {patient.gender && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gênero</label>
                  <p className="text-sm" data-testid="text-patient-gender">{patient.gender}</p>
                </div>
              )}

              {patient.bloodType && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo Sanguíneo</label>
                  <div className="flex items-center space-x-2">
                    <Droplets className="h-4 w-4 text-red-500" />
                    <Badge variant="outline" data-testid="badge-blood-type">{patient.bloodType}</Badge>
                  </div>
                </div>
              )}

              {patient.allergies && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Alergias</label>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm" data-testid="text-patient-allergies">{patient.allergies}</p>
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">Cadastrado em</label>
                <p className="text-sm" data-testid="text-patient-created-at">
                  {format(new Date(patient.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments and Medical Records */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Consultas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : !(appointments || []).length ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma consulta encontrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(appointments || []).slice(0, 5).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`appointment-${appointment.id}`}
                    >
                      <div>
                        <p className="font-medium">{appointment.type || 'Consulta'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(appointment.scheduledAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge 
                        variant={appointment.status === 'completed' ? 'default' : 'secondary'}
                        data-testid={`badge-status-${appointment.id}`}
                      >
                        {appointment.status === 'scheduled' && 'Agendada'}
                        {appointment.status === 'completed' && 'Concluída'}
                        {appointment.status === 'cancelled' && 'Cancelada'}
                        {appointment.status === 'in-progress' && 'Em Andamento'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medical Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-file-medical mr-2"></i>
                Prontuário Médico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : !(medicalRecords || []).length ? (
                <div className="text-center py-8">
                  <i className="fas fa-file-medical text-4xl text-muted-foreground mb-4"></i>
                  <p className="text-muted-foreground">Nenhum registro médico encontrado</p>
                  <Button variant="outline" className="mt-4" data-testid="button-create-record">
                    Criar Primeiro Registro
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(medicalRecords || []).slice(0, 3).map((record) => (
                    <div
                      key={record.id}
                      className="p-4 border rounded-lg"
                      data-testid={`medical-record-${record.id}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium">{record.diagnosis || 'Registro Médico'}</p>
                        <Badge variant="outline" data-testid={`badge-record-type-${record.id}`}>
                          Consulta
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(record.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      {record.symptoms && (
                        <p className="text-sm mt-2" data-testid={`text-record-symptoms-${record.id}`}>
                          <strong>Sintomas:</strong> {record.symptoms.slice(0, 100)}...
                        </p>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" data-testid="button-view-all-records">
                    Ver Todos os Registros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}