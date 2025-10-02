import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
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
import telemedLogo from "@/assets/logo-fundo.png";
import { formatErrorForToast } from "@/lib/error-handler";

// Create schemas using translation function
const createLoginSchema = (t: any) => z.object({
  username: z.string().min(1, t("forms.validation.username_required")),
  password: z.string().min(1, t("forms.validation.password_required")),
});

const createRegisterSchema = (t: any) => z.object({
  username: z.string().min(3, t("forms.validation.username_min_length")),
  password: z.string().min(6, t("forms.validation.password_min_length")),
  name: z.string().min(1, t("forms.validation.name_required")),
  role: z.enum(["doctor", "patient", "admin", "researcher"] as const),
  email: z.string().email(t("forms.validation.email_invalid")).optional().or(z.literal("")),
  phone: z.string().optional(),
  // Doctor fields
  medicalLicense: z.string().optional(),
  specialization: z.string().optional(),
  // Patient fields
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
});

type LoginForm = z.infer<ReturnType<typeof createLoginSchema>>;
type RegisterForm = z.infer<ReturnType<typeof createRegisterSchema>>;

// Subcomponent for login form with its own useForm hook
function LoginFormSection({ defaultValues, onSubmit, isSubmitting, formRef }: {
  defaultValues: LoginForm;
  onSubmit: (data: LoginForm) => void;
  isSubmitting: boolean;
  formRef: React.MutableRefObject<{ getValues: () => LoginForm } | null>;
}) {
  const { t } = useTranslation();
  const loginSchema = createLoginSchema(t);
  
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues,
  });
  
  // Expose getValues to parent via ref
  useEffect(() => {
    formRef.current = { getValues: form.getValues };
  }, [form.getValues, formRef]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("ui.username")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("ui.username_placeholder")}
                    data-testid="input-login-username"
                    className="mobile-input-enhanced"
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
                <FormLabel>{t("ui.password")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder={t("ui.password_placeholder")}
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
                {t("ui.logging_in")}
              </>
            ) : (
              t("ui.login_button")
            )}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}

// Subcomponent for register form with its own useForm hook
function RegisterFormSection({ defaultValues, onSubmit, isSubmitting, getRoleIcon, formRef }: {
  defaultValues: RegisterForm;
  onSubmit: (data: RegisterForm) => void;
  isSubmitting: boolean;
  getRoleIcon: (role: string) => JSX.Element;
  formRef: React.MutableRefObject<{ getValues: () => RegisterForm } | null>;
}) {
  const { t } = useTranslation();
  const registerSchema = createRegisterSchema(t);
  
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues,
  });
  
  // Watch for role changes to show/hide conditional fields
  const selectedRole = form.watch("role");
  
  // Expose getValues to parent via ref
  useEffect(() => {
    formRef.current = { getValues: form.getValues };
  }, [form.getValues, formRef]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("ui.user_type")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-register-role" className="mobile-input-enhanced">
                      <SelectValue placeholder={t("ui.user_type_placeholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="patient" data-testid="option-role-patient">
                      <div className="flex items-center gap-2">
                        {getRoleIcon("patient")}
                        {t("roles.patient")}
                      </div>
                    </SelectItem>
                    <SelectItem value="doctor" data-testid="option-role-doctor">
                      <div className="flex items-center gap-2">
                        {getRoleIcon("doctor")}
                        {t("roles.doctor")}
                      </div>
                    </SelectItem>
                    <SelectItem value="admin" data-testid="option-role-admin">
                      <div className="flex items-center gap-2">
                        {getRoleIcon("admin")}
                        {t("roles.admin")}
                      </div>
                    </SelectItem>
                    <SelectItem value="researcher" data-testid="option-role-researcher">
                      <div className="flex items-center gap-2">
                        {getRoleIcon("researcher")}
                        {t("roles.researcher")}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("ui.full_name")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("ui.fullname_placeholder")}
                    data-testid="input-register-name"
                    className="mobile-input-enhanced"
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
                <FormLabel>{t("ui.username")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("ui.username_register_placeholder")}
                    data-testid="input-register-username"
                    className="mobile-input-enhanced"
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
                <FormLabel>{t("ui.password")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder={t("ui.password_register_placeholder")}
                    data-testid="input-register-password"
                    className="mobile-input-enhanced"
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
                <FormLabel>{t("ui.email_optional")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder={t("ui.email_placeholder")}
                    data-testid="input-register-email"
                    className="mobile-input-enhanced"
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
                <FormLabel>{t("ui.phone_optional")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("ui.phone_placeholder")}
                    data-testid="input-register-phone"
                    className="mobile-input-enhanced"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Doctor-specific fields */}
          {selectedRole === "doctor" && (
            <>
              <FormField
                control={form.control}
                name="medicalLicense"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CRM (Registro Médico) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: CRM-SP 123456"
                        data-testid="input-register-medical-license"
                        className="mobile-input-enhanced"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialização *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Cardiologia, Pediatria"
                        data-testid="input-register-specialization"
                        className="mobile-input-enhanced"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          
          {/* Patient-specific fields */}
          {selectedRole === "patient" && (
            <>
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
                        data-testid="input-register-dob"
                        className="mobile-input-enhanced"
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-register-gender" className="mobile-input-enhanced">
                          <SelectValue placeholder="Selecione o gênero" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                        <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-register-blood-type" className="mobile-input-enhanced">
                          <SelectValue placeholder="Selecione o tipo sanguíneo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allergies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alergias</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Penicilina, Dipirona"
                        data-testid="input-register-allergies"
                        className="mobile-input-enhanced"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
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
                {t("ui.creating_account")}
              </>
            ) : (
              t("ui.register_button")
            )}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}

export default function Login() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const { login, register: registerUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  // Form state hoisted to parent to preserve across language changes
  const [loginValues, setLoginValues] = useState<LoginForm>({ username: "", password: "" });
  const [registerValues, setRegisterValues] = useState<RegisterForm>({
    username: "", password: "", name: "", role: "patient", email: "", phone: ""
  });
  
  // Refs to access current form values before remount
  const loginFormRef = useRef<{ getValues: () => LoginForm } | null>(null);
  const registerFormRef = useRef<{ getValues: () => RegisterForm } | null>(null);
  
  // Capture form values before language change remount
  useEffect(() => {
    const captureFormValues = () => {
      if (loginFormRef.current) {
        setLoginValues(loginFormRef.current.getValues());
      }
      if (registerFormRef.current) {
        setRegisterValues(registerFormRef.current.getValues());
      }
    };
    
    // Capture values before language change
    captureFormValues();
  }, [i18n.language]);

  // Form submission handlers
  const handleLogin = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await login(data.username, data.password);
      toast({
        title: t("auth.login_success"),
        description: t("auth.login_success_desc"),
      });
    } catch (error: any) {
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
    } catch (error: any) {
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

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 flex items-center justify-center">
              <img 
                src={telemedLogo} 
                alt="Telemed Logo" 
                className="w-full h-full object-contain dark:invert dark:brightness-0 dark:contrast-200"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t("ui.app_title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("ui.app_subtitle")}
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
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
              <LoginFormSection 
                key={i18n.language}
                defaultValues={loginValues}
                onSubmit={handleLogin}
                isSubmitting={isSubmitting}
                formRef={loginFormRef}
              />
            </TabsContent>

            <TabsContent value="register">
              <CardHeader>
                <CardTitle>{t("ui.register_title")}</CardTitle>
                <CardDescription>
                  {t("ui.register_description")}
                </CardDescription>
              </CardHeader>
              <RegisterFormSection 
                key={i18n.language}
                defaultValues={registerValues}
                onSubmit={handleRegister}
                isSubmitting={isSubmitting}
                getRoleIcon={getRoleIcon}
                formRef={registerFormRef}
              />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Registration Links */}
        <div className="mt-6 space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Não tem uma conta? Cadastre-se como:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/register/patient">
              <Button 
                variant="outline" 
                className="w-full"
                data-testid="link-register-patient"
              >
                <User className="w-4 h-4 mr-2" />
                Paciente
              </Button>
            </Link>
            <Link href="/register/doctor">
              <Button 
                variant="outline" 
                className="w-full"
                data-testid="link-register-doctor"
              >
                <Stethoscope className="w-4 h-4 mr-2" />
                Médico
              </Button>
            </Link>
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>
            {t("ui.demo_text")}<br />
            <strong>{t("ui.demo_user")}</strong> doctor | <strong>{t("ui.demo_password")}</strong> doctor123
          </p>
        </div>
      </div>
    </div>
  );
}