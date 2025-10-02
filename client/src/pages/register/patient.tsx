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
import { Users, Heart, Calendar, FileText, Shield, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const registerSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(1, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().min(1, "Telefone é obrigatório"),
  dateOfBirth: z.string().min(1, "Data de nascimento é obrigatória"),
  gender: z.string().min(1, "Gênero é obrigatório"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function PatientRegister() {
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
      dateOfBirth: "",
      gender: "",
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
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        role: "patient" as const,
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

  const patientBenefits = [
    {
      icon: Calendar,
      title: "Consultas Online",
      description: "Agende e participe de consultas médicas no conforto da sua casa"
    },
    {
      icon: FileText,
      title: "Histórico Digital",
      description: "Mantenha todo seu histórico médico organizado e acessível"
    },
    {
      icon: Heart,
      title: "Cuidado Personalizado",
      description: "Receba atendimento médico personalizado e de qualidade"
    },
    {
      icon: Shield,
      title: "Dados Protegidos",
      description: "Suas informações médicas protegidas conforme LGPD"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back-home">
              ← Voltar para Início
            </Button>
          </Link>
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Users className="w-12 h-12 text-medical-primary" />
            <h1 className="text-3xl font-bold text-medical-primary">Registro de Paciente</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Crie sua conta e tenha acesso completo aos serviços de telemedicina
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Registration Form */}
          <Card className="shadow-xl border-medical-primary/20">
            <CardHeader>
              <CardTitle className="text-center text-xl">Criar Conta de Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Digite seu nome completo"
                            data-testid="input-patient-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                            data-testid="input-patient-username"
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
                            data-testid="input-patient-password"
                          />
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
                        <FormLabel>Email (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="seu@email.com"
                            data-testid="input-patient-email"
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
                            data-testid="input-patient-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="date"
                              data-testid="input-patient-dob"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gênero</FormLabel>
                          <FormControl>
                            <select 
                              {...field}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-medical-primary focus:border-transparent"
                              data-testid="select-patient-gender"
                            >
                              <option value="">Selecione o gênero</option>
                              <option value="masculino">Masculino</option>
                              <option value="feminino">Feminino</option>
                              <option value="outro">Outro</option>
                              <option value="prefiro_nao_informar">Prefiro não informar</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-medical-primary hover:bg-medical-primary/90"
                    disabled={isSubmitting}
                    data-testid="button-patient-register"
                  >
                    {isSubmitting ? "Criando conta..." : "Criar Conta de Paciente"}
                  </Button>
                </form>
              </Form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Já tem uma conta?{" "}
                  <Link href="/login" className="text-medical-primary hover:underline">
                    Fazer login
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Benefits Section */}
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
                  Benefícios para Pacientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patientBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-medical-primary/10 rounded-lg flex items-center justify-center">
                      <benefit.icon className="w-5 h-5 text-medical-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-green-600" />
                  <h3 className="font-bold text-green-800 mb-2">Segurança Garantida</h3>
                  <p className="text-sm text-green-600">
                    Seus dados médicos são protegidos com criptografia avançada e seguem todas as normas da LGPD.
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