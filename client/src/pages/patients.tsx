import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { z } from "zod";

const patientFormSchema = insertPatientSchema.extend({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
});

type PatientFormData = z.infer<typeof patientFormSchema>;

export default function Patients() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: patients, isLoading } = useQuery({
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
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar paciente. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PatientFormData) => {
    createPatientMutation.mutate(data);
  };

  const filteredPatients = (patients || []).filter((patient: any) =>
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
            <Button data-testid="button-new-patient">
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
            <Card key={patient.id} className="hover:shadow-md transition-shadow" data-testid={`card-patient-${patient.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-primary"></i>
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
                  <Button variant="outline" size="sm" data-testid={`button-schedule-patient-${patient.id}`}>
                    <i className="fas fa-calendar-plus mr-2"></i>
                    Agendar
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
