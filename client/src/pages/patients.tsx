import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type Patient } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { z } from "zod";
import { formatErrorForToast } from "@/lib/error-handler";

const patientFormSchema = insertPatientSchema.extend({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
});

type PatientFormData = z.infer<typeof patientFormSchema>;

export default function Patients() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      gender: "",
      bloodType: "",
      allergies: "",
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: (data: PatientFormData) => apiRequest('POST', '/api/patients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({
        title: "Sucesso",
        description: "Paciente cadastrado com sucesso!",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      const errorInfo = formatErrorForToast(error);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
      });
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: PatientFormData }) => apiRequest('PUT', `/api/patients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({
        title: "Sucesso",
        description: "Paciente atualizado com sucesso!",
      });
      setIsEditDialogOpen(false);
      setEditingPatient(null);
      editForm.reset();
    },
    onError: (error) => {
      const errorInfo = formatErrorForToast(error);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
      });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/patients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({
        title: "Sucesso",
        description: "Paciente removido com sucesso!",
      });
    },
    onError: (error) => {
      const errorInfo = formatErrorForToast(error);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
      });
    },
  });

  const editForm = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      gender: "",
      bloodType: "",
      allergies: "",
    },
  });

  const onSubmit = (data: PatientFormData) => {
    createPatientMutation.mutate(data);
  };

  const onEditSubmit = (data: PatientFormData) => {
    if (editingPatient) {
      updatePatientMutation.mutate({ id: editingPatient.id, data });
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    editForm.reset({
      name: patient.name,
      email: patient.email || "",
      phone: patient.phone,
      gender: patient.gender || "",
      bloodType: patient.bloodType || "",
      allergies: patient.allergies || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeletePatient = (patient: Patient) => {
    if (confirm(`Tem certeza que deseja remover o paciente ${patient.name}? Esta ação não pode ser desfeita.`)) {
      deletePatientMutation.mutate(patient.id);
    }
  };

  const filteredPatients = (patients || []).filter((patient: Patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

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
          <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground">Gerencie os dados dos seus pacientes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-medical-primary" data-testid="button-new-patient">
              <i className="fas fa-plus mr-2"></i>
              Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome completo" {...field} value={field.value || ""} data-testid="input-patient-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} data-testid="input-patient-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@exemplo.com" {...field} value={field.value || ""} data-testid="input-patient-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gênero</FormLabel>
                        <FormControl>
                          <Input placeholder="Masculino/Feminino" {...field} value={field.value || ""} data-testid="input-patient-gender" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bloodType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Sanguíneo</FormLabel>
                        <FormControl>
                          <Input placeholder="O+, A-, etc." {...field} value={field.value || ""} data-testid="input-patient-blood-type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alergias</FormLabel>
                      <FormControl>
                        <Input placeholder="Liste as alergias conhecidas" {...field} value={field.value || ""} data-testid="input-patient-allergies" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-patient"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPatientMutation.isPending}
                    data-testid="button-save-patient"
                  >
                    {createPatientMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Patient Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Paciente</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome completo" {...field} value={field.value || ""} data-testid="input-edit-patient-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} data-testid="input-edit-patient-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@exemplo.com" {...field} value={field.value || ""} data-testid="input-edit-patient-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gênero</FormLabel>
                        <FormControl>
                          <Input placeholder="Masculino/Feminino" {...field} value={field.value || ""} data-testid="input-edit-patient-gender" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="bloodType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Sanguíneo</FormLabel>
                        <FormControl>
                          <Input placeholder="O+, A-, etc." {...field} value={field.value || ""} data-testid="input-edit-patient-blood-type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alergias</FormLabel>
                      <FormControl>
                        <Input placeholder="Liste as alergias conhecidas" {...field} value={field.value || ""} data-testid="input-edit-patient-allergies" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingPatient(null);
                    }}
                    data-testid="button-cancel-edit-patient"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updatePatientMutation.isPending}
                    data-testid="button-save-edit-patient"
                  >
                    {updatePatientMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Buscar pacientes por nome ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
          data-testid="input-search-patients"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <i className="fas fa-users text-6xl text-muted-foreground mb-4"></i>
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">Nenhum paciente encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Tente um termo diferente." : "Cadastre seu primeiro paciente para começar."}
            </p>
          </div>
        ) : (
          filteredPatients.map((patient: any) => (
            <Card key={patient.id} className="patient-card" data-testid={`card-patient-${patient.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'hsl(210, 85%, 95%)' }}>
                    <i className="fas fa-user text-lg" style={{ color: 'var(--medical-primary)' }}></i>
                  </div>
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-patient-name-${patient.id}`}>{patient.name}</CardTitle>
                    <p className="text-sm text-muted-foreground" data-testid={`text-patient-phone-${patient.id}`}>{patient.phone}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {patient.email && (
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-envelope text-muted-foreground"></i>
                      <span data-testid={`text-patient-email-${patient.id}`}>{patient.email}</span>
                    </div>
                  )}
                  {patient.gender && (
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-venus-mars text-muted-foreground"></i>
                      <span data-testid={`text-patient-gender-${patient.id}`}>{patient.gender}</span>
                    </div>
                  )}
                  {patient.bloodType && (
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-tint text-muted-foreground"></i>
                      <span data-testid={`text-patient-blood-type-${patient.id}`}>{patient.bloodType}</span>
                    </div>
                  )}
                  {patient.allergies && (
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-exclamation-triangle text-destructive"></i>
                      <span className="text-destructive" data-testid={`text-patient-allergies-${patient.id}`}>{patient.allergies}</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setLocation(`/patients/${patient.id}`)}
                    data-testid={`button-view-patient-${patient.id}`}
                  >
                    <i className="fas fa-eye mr-2"></i>
                    Ver Detalhes
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditPatient(patient)}
                    data-testid={`button-edit-patient-${patient.id}`}
                  >
                    <i className="fas fa-edit mr-2"></i>
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDeletePatient(patient)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`button-delete-patient-${patient.id}`}
                  >
                    <i className="fas fa-trash mr-2"></i>
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
