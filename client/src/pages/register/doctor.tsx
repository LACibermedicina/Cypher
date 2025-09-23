import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileText, Calendar, Users, Stethoscope, Shield, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

const registerSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(1, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  crm: z.string().min(1, "CRM é obrigatório para médicos"),
  specialty: z.string().min(1, "Especialidade é obrigatória"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function DoctorRegister() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      phone: "",
      crm: "",
      specialty: "",
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsSubmitting(true);
    try {
      await register({
        username: data.username,
        password: data.password,
        name: data.name,
        email: data.email,
        phone: data.phone,
        medicalLicense: data.crm, // Map CRM to medicalLicense
        specialization: data.specialty, // Map specialty to specialization
        role: "doctor" as const,
      });
      
      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo à plataforma Telemed. Você já pode fazer login.",
      });
    } catch (error) {
      toast({
        title: "Erro ao criar conta",
        description: "Ocorreu um erro ao criar sua conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const doctorBenefits = [
    {
      icon: Calendar,
      title: "Agenda Flexível",
      description: "Gerencie sua agenda de consultas de forma autônoma e eficiente"
    },
    {
      icon: Users,
      title: "Pacientes Online",
      description: "Atenda pacientes de todo o Brasil através da telemedicina"
    },
    {
      icon: TrendingUp,
      title: "Sistema TMC",
      description: "Receba pagamentos através do nosso sistema de créditos TMC"
    },
    {
      icon: FileText,
      title: "Prontuários Digitais",
      description: "Mantenha registros médicos organizados e seguros"
    },
    {
      icon: Shield,
      title: "Ferramentas Profissionais",
      description: "Acesso a prescrições digitais e assinatura eletrônica"
    },
    {
      icon: Clock,
      title: "Atendimento 24/7",
      description: "Flexibilidade para atender conforme sua disponibilidade"
    }
  ];

  const specialties = [
    "Clínica Geral",
    "Cardiologia",
    "Dermatologia",
    "Pediatria",
    "Ginecologia",
    "Psiquiatria",
    "Neurologia",
    "Ortopedia",
    "Oftalmologia",
    "Endocrinologia",
    "Urologia",
    "Gastroenterologia",
    "Pneumologia",
    "Outra"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back-home">
              ← Voltar para Início
            </Button>
          </Link>
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Stethoscope className="w-12 h-12 text-medical-secondary" />
            <h1 className="text-3xl font-bold text-medical-secondary">Registro de Médico</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Una-se à nossa rede de profissionais e ofereça seus serviços através da telemedicina
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Registration Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-medical-secondary/20">
              <CardHeader>
                <CardTitle className="text-center text-xl">Criar Conta de Médico</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Dr(a). Nome Completo"
                                data-testid="input-doctor-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="crm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CRM</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="CRM/UF (ex: 123456/SP)"
                                data-testid="input-doctor-crm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="specialty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Especialidade</FormLabel>
                          <FormControl>
                            <select 
                              {...field}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-medical-secondary focus:border-transparent"
                              data-testid="select-doctor-specialty"
                            >
                              <option value="">Selecione sua especialidade</option>
                              {specialties.map((specialty) => (
                                <option key={specialty} value={specialty}>
                                  {specialty}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome de Usuário</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Escolha um nome de usuário"
                                data-testid="input-doctor-username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                placeholder="Crie uma senha segura"
                                data-testid="input-doctor-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="seu@email.com"
                                data-testid="input-doctor-email"
                              />
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
                              <Input
                                {...field}
                                placeholder="(11) 99999-9999"
                                data-testid="input-doctor-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-medical-secondary hover:bg-medical-secondary/90"
                      disabled={isSubmitting}
                      data-testid="button-doctor-register"
                    >
                      {isSubmitting ? "Criando conta..." : "Criar Conta de Médico"}
                    </Button>
                  </form>
                </Form>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Já tem uma conta?{" "}
                    <Link href="/login" className="text-medical-secondary hover:underline">
                      Fazer login
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Benefits Section */}
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
                  Benefícios para Médicos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {doctorBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-medical-secondary/10 rounded-lg flex items-center justify-center">
                      <benefit.icon className="w-4 h-4 text-medical-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{benefit.title}</h3>
                      <p className="text-xs text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-bold text-green-800 mb-1 text-sm">Validação Profissional</h3>
                  <p className="text-xs text-green-600">
                    Todas as contas de médicos passam por validação de CRM e credenciais profissionais.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-bold text-blue-800 mb-1 text-sm">Oportunidade de Renda</h3>
                  <p className="text-xs text-blue-600">
                    Monetize seus conhecimentos médicos atendendo pacientes online.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}