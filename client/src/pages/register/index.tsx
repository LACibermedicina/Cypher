import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, Stethoscope, ArrowRight, CheckCircle, Shield, Heart, Settings } from "lucide-react";

export default function RegisterSelect() {
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
          <h1 className="text-4xl font-bold text-primary mb-4">Escolha seu Tipo de Conta</h1>
          <p className="text-lg text-muted-foreground">
            Selecione o tipo de conta que melhor se adequa ao seu perfil
          </p>
        </div>

        {/* Registration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Patient Card */}
          <Card className="shadow-xl border-medical-primary/20 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-medical-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-medical-primary" />
              </div>
              <CardTitle className="text-xl text-medical-primary">Sou Paciente</CardTitle>
              <p className="text-muted-foreground">
                Acesse consultas médicas online e gerencie sua saúde
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Consultas médicas online</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Histórico médico digital</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Prescrições eletrônicas</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Agendamento flexível</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">WhatsApp integrado</span>
                </li>
              </ul>
              
              <Link href="/register/patient">
                <Button className="w-full bg-medical-primary hover:bg-medical-primary/90" data-testid="button-register-patient-select">
                  Registrar como Paciente
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Doctor Card */}
          <Card className="shadow-xl border-medical-secondary/20 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-medical-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8 text-medical-secondary" />
              </div>
              <CardTitle className="text-xl text-medical-secondary">Sou Médico</CardTitle>
              <p className="text-muted-foreground">
                Una-se à nossa rede de profissionais de saúde
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Agenda flexível</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Sistema TMC de pagamentos</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Ferramentas profissionais</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Assinatura digital</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Atendimento 24/7</span>
                </li>
              </ul>
              
              <Link href="/register/doctor">
                <Button 
                  variant="outline" 
                  className="w-full border-medical-secondary text-medical-secondary hover:bg-medical-secondary/10"
                  data-testid="button-register-doctor-select"
                >
                  Registrar como Médico
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Card */}
          <Card className="shadow-xl border-slate-300 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-slate-700" />
              </div>
              <CardTitle className="text-xl text-slate-700">Sou Administrador</CardTitle>
              <p className="text-muted-foreground">
                Gerencie toda a plataforma com acesso completo
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Controle total do sistema</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Gestão de usuários</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Análises e relatórios</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Configuração de TMC</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Segurança avançada</span>
                </li>
              </ul>
              
              <Link href="/register/admin">
                <Button 
                  variant="outline" 
                  className="w-full border-slate-300 text-slate-700 hover:bg-slate-100"
                  data-testid="button-register-admin-select"
                >
                  Registrar como Administrador
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Security & Trust Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Shield className="w-12 h-12 text-green-600" />
                <div>
                  <h3 className="font-bold text-green-800">Segurança Garantida</h3>
                  <p className="text-sm text-green-600">
                    Dados protegidos com criptografia avançada e conformidade LGPD
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Heart className="w-12 h-12 text-blue-600" />
                <div>
                  <h3 className="font-bold text-blue-800">Cuidado Humanizado</h3>
                  <p className="text-sm text-blue-600">
                    Tecnologia a serviço do cuidado médico personalizado
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Already have account */}
        <div className="text-center mt-8">
          <p className="text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}