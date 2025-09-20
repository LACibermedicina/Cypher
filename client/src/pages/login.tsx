import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { User, UserCheck, Stethoscope } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(1, "Nome completo é obrigatório"),
  role: z.enum(["doctor", "patient", "admin"] as const),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function Login() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { login, register: registerUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    setLocation("/");
    return null;
  }

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      role: "patient",
      email: "",
      phone: "",
    },
  });

  const handleLogin = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await login(data.username, data.password);
      toast({
        title: "Login realizado",
        description: "Bem-vindo ao Telemed!",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    setIsSubmitting(true);
    try {
      const registerData = {
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
      };
      await registerUser(registerData);
      toast({
        title: "Cadastro realizado",
        description: "Bem-vindo ao Telemed!",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Não foi possível criar a conta",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "doctor":
        return <Stethoscope className="h-4 w-4" />;
      case "admin":
        return <UserCheck className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Telemed
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistema de Telemedicina
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">
                Cadastrar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <CardHeader>
                <CardTitle>Fazer Login</CardTitle>
                <CardDescription>
                  Entre com suas credenciais para acessar o sistema
                </CardDescription>
              </CardHeader>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                  <CardContent className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de usuário</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Digite seu usuário"
                              data-testid="input-login-username"
                              className="mobile-input-enhanced"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Digite sua senha"
                              data-testid="input-login-password"
                              className="mobile-input-enhanced"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full mobile-touch-optimized bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                      disabled={isSubmitting}
                      data-testid="button-login-submit"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <CardHeader>
                <CardTitle>Criar Conta</CardTitle>
                <CardDescription>
                  Cadastre-se para acessar o sistema de telemedicina
                </CardDescription>
              </CardHeader>
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)}>
                  <CardContent className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome completo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Digite seu nome completo"
                              data-testid="input-register-name"
                              className="mobile-input-enhanced"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de usuário</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Escolha um nome de usuário"
                              data-testid="input-register-username"
                              className="mobile-input-enhanced"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Crie uma senha (mín. 6 caracteres)"
                              data-testid="input-register-password"
                              className="mobile-input-enhanced"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de usuário</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-register-role" className="mobile-input-enhanced">
                                <SelectValue placeholder="Selecione o tipo de usuário" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="patient" data-testid="option-role-patient">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon("patient")}
                                  Paciente
                                </div>
                              </SelectItem>
                              <SelectItem value="doctor" data-testid="option-role-doctor">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon("doctor")}
                                  Médico
                                </div>
                              </SelectItem>
                              <SelectItem value="admin" data-testid="option-role-admin">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon("admin")}
                                  Administrador
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="seu@email.com"
                              data-testid="input-register-email"
                              className="mobile-input-enhanced"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="(11) 99999-9999"
                              data-testid="input-register-phone"
                              className="mobile-input-enhanced"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full mobile-touch-optimized bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                      disabled={isSubmitting}
                      data-testid="button-register-submit"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                          Criando conta...
                        </>
                      ) : (
                        "Criar conta"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>
            Para demonstração, use:<br />
            <strong>Usuário:</strong> doctor | <strong>Senha:</strong> doctor123
          </p>
        </div>
      </div>
    </div>
  );
}