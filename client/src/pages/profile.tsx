import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Mail, Phone, CreditCard, Shield, Save } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Profile() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    whatsappNumber: user?.whatsappNumber || "",
    medicalLicense: user?.medicalLicense || "",
    specialization: user?.specialization || "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/auth/profile', data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Perfil Atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      
      // Update user in context
      if (data.user) {
        updateUser(data.user);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplay = (role?: string) => {
    if (!role) return '';
    const roleMap: Record<string, string> = {
      admin: t("roles.admin"),
      doctor: t("roles.doctor"),
      patient: t("roles.patient"),
      visitor: t("roles.visitor"),
      researcher: t("roles.researcher"),
    };
    return roleMap[role] || role;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground" data-testid="title-profile">
          {t("auth.profile")}
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas informações pessoais e configurações da conta
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Summary Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Informações do usuário</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="bg-gradient-to-br from-secondary to-accent text-white font-semibold text-2xl">
                {user ? getUserInitials(user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-semibold text-lg" data-testid="text-profile-name">
                {user?.name}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-profile-username">
                @{user?.username}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {getRoleDisplay(user?.role)}
              </p>
            </div>
            
            <Separator />
            
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Créditos TMC</span>
                </div>
                <span className="font-semibold" data-testid="text-tmc-credits">
                  {user?.tmcCredits || 0}
                </span>
              </div>
              
              {user?.digitalCertificate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Certificado Digital</span>
                  </div>
                  <span className="text-xs text-green-600 font-semibold">
                    FIPS Ativo
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Edit Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Editar Informações</CardTitle>
            <CardDescription>
              Atualize seus dados pessoais e de contato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Informações Pessoais
                </h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Seu nome completo"
                      required
                      data-testid="input-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="seu@email.com"
                        className="pl-10"
                        data-testid="input-email"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Informações de Contato
                </h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(00) 00000-0000"
                      data-testid="input-phone"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsappNumber">WhatsApp</Label>
                    <Input
                      id="whatsappNumber"
                      name="whatsappNumber"
                      value={formData.whatsappNumber}
                      onChange={handleInputChange}
                      placeholder="(00) 00000-0000"
                      data-testid="input-whatsapp"
                    />
                  </div>
                </div>
              </div>

              {/* Doctor-specific fields */}
              {user?.role === 'doctor' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Informações Profissionais
                    </h3>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="medicalLicense">CRM</Label>
                        <Input
                          id="medicalLicense"
                          name="medicalLicense"
                          value={formData.medicalLicense}
                          onChange={handleInputChange}
                          placeholder="CRM/UF 000000"
                          data-testid="input-medical-license"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specialization">Especialização</Label>
                        <Input
                          id="specialization"
                          name="specialization"
                          value={formData.specialization}
                          onChange={handleInputChange}
                          placeholder="Ex: Cardiologia"
                          data-testid="input-specialization"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
