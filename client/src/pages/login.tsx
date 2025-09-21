import { useState, useEffect } from "react";
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

// Create schemas using translation function
const createLoginSchema = (t: any) => z.object({
  username: z.string().min(1, t("forms.validation.username_required")),
  password: z.string().min(1, t("forms.validation.password_required")),
});

const createRegisterSchema = (t: any) => z.object({
  username: z.string().min(3, t("forms.validation.username_min_length")),
  password: z.string().min(6, t("forms.validation.password_min_length")),
  name: z.string().min(1, t("forms.validation.name_required")),
  role: z.enum(["doctor", "patient", "admin"] as const),
  email: z.string().email(t("forms.validation.email_invalid")).optional().or(z.literal("")),
  phone: z.string().optional(),
});

type LoginForm = z.infer<ReturnType<typeof createLoginSchema>>;
type RegisterForm = z.infer<ReturnType<typeof createRegisterSchema>>;

export default function Login() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const { login, register: registerUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    setLocation("/");
    return null;
  }

  // Create schemas with translations
  const loginSchema = createLoginSchema(t);
  const registerSchema = createRegisterSchema(t);

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

  // Update form resolvers when language changes
  useEffect(() => {
    const newLoginSchema = createLoginSchema(t);
    const newRegisterSchema = createRegisterSchema(t);
    
    // Update resolvers with new schemas
    loginForm.clearErrors();
    registerForm.clearErrors();
    
    // Reset and update the resolver
    loginForm.reset(loginForm.getValues(), {
      keepDirty: true,
      keepTouched: true
    });
    registerForm.reset(registerForm.getValues(), {
      keepDirty: true,
      keepTouched: true
    });
    
    // Force re-validation with new schema
    setTimeout(() => {
      if (loginForm.formState.isSubmitted) {
        loginForm.trigger();
      }
      if (registerForm.formState.isSubmitted) {
        registerForm.trigger();
      }
    }, 50);
  }, [i18n.language, t]);

  const handleLogin = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await login(data.username, data.password);
      toast({
        title: t("auth.login_success"),
        description: t("auth.login_success_desc"),
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: t("auth.login_error"),
        description: error.message || t("auth.login_error_desc"),
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
        title: t("auth.register_success"),
        description: t("auth.register_success_desc"),
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: t("auth.register_error"),
        description: error.message || t("auth.register_error_desc"),
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
    <div key={i18n.language} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
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
            {t("ui.app_subtitle")}
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <Tabs key={i18n.language} defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">
                {t("ui.login_tab")}
              </TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">
                {t("ui.register_tab")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <CardHeader>
                <CardTitle>{t("ui.login_title")}</CardTitle>
                <CardDescription>
                  {t("ui.login_description")}
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
                          <FormLabel>{t("ui.username")}</FormLabel>
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
                          <FormLabel>{t("ui.password")}</FormLabel>
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
                <CardTitle>{t("ui.register_title")}</CardTitle>
                <CardDescription>
                  {t("ui.register_description")}
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
                          <FormLabel>{t("ui.full_name")}</FormLabel>
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
                          <FormLabel>{t("ui.username")}</FormLabel>
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
                          <FormLabel>{t("ui.password")}</FormLabel>
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
                          <FormLabel>{t("ui.user_type")}</FormLabel>
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
                          <FormLabel>{t("ui.email_optional")}</FormLabel>
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
            <strong>Usuário:</strong> doctor | <strong>{t("ui.password")}:</strong> doctor123
          </p>
        </div>
      </div>
    </div>
  );
}