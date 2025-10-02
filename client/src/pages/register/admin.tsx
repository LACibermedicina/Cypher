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
import { Shield, Settings, Users, FileText, TrendingUp, CheckCircle, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatErrorForToast } from "@/lib/error-handler";

const registerSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  name: z.string().min(1, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(1, "Telefone é obrigatório"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function AdminRegister() {
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
        role: "admin" as const,
      });
      
      toast({
        title: "Conta de administrador criada com sucesso!",
        description: "Bem-vindo à plataforma Telemed. Você já pode fazer login.",
      });
    } catch (error) {
      const errorInfo = formatErrorForToast(error);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const adminBenefits = [
    {
      icon: Settings,
      title: "Controle Total",
      description: "Gerencie toda a plataforma e configure parâmetros do sistema"
    },
    {
      icon: Users,
      title: "Gestão de Usuários",
      description: "Administre médicos, pacientes e outros administradores"
    },
    {
      icon: TrendingUp,
      title: "Análises e Relatórios",
      description: "Acesse estatísticas e relatórios detalhados do sistema"
    },
    {
      icon: FileText,
      title: "Sistema TMC",
      description: "Controle de créditos, recargas e transações financeiras"
    },
    {
      icon: Shield,
      title: "Segurança Avançada",
      description: "Ferramentas de segurança e conformidade LGPD"
    },
    {
      icon: Lock,
      title: "Acesso Privilegiado",
      description: "Permissões especiais para todas as funcionalidades"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back-home">
              ← Voltar para Início
            </Button>
          </Link>
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Shield className="w-12 h-12 text-slate-700" />
            <h1 className="text-3xl font-bold text-slate-700">Registro de Administrador</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Crie uma conta com privilégios administrativos completos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Registration Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-slate-300">
              <CardHeader>
                <CardTitle className="text-center text-xl">Criar Conta de Administrador</CardTitle>
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
                              data-testid="input-admin-name"
                            />
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
                                data-testid="input-admin-username"
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
                                placeholder="Senha forte (mín. 8 caracteres)"
                                data-testid="input-admin-password"
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
                                data-testid="input-admin-email"
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
                                data-testid="input-admin-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-slate-700 hover:bg-slate-800"
                      disabled={isSubmitting}
                      data-testid="button-admin-register"
                    >
                      {isSubmitting ? "Criando conta..." : "Criar Conta de Administrador"}
                    </Button>
                  </form>
                </Form>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Já tem uma conta?{" "}
                    <Link href="/login" className="text-slate-700 hover:underline">
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
                  Recursos de Administrador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {adminBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <benefit.icon className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{benefit.title}</h3>
                      <p className="text-xs text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-lg bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <Lock className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                  <h3 className="font-bold text-amber-800 mb-1 text-sm">Acesso Restrito</h3>
                  <p className="text-xs text-amber-600">
                    Contas de administrador têm acesso completo a todas as funcionalidades e dados sensíveis do sistema.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-bold text-blue-800 mb-1 text-sm">Responsabilidade</h3>
                  <p className="text-xs text-blue-600">
                    Como administrador, você é responsável pela segurança e integridade dos dados da plataforma.
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
