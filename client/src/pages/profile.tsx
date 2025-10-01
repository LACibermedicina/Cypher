import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Mail, Phone, CreditCard, Shield, Save, Upload, Trash2, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch doctor rating statistics (only for doctors)
  const { data: ratingStats } = useQuery<RatingStats>({
    queryKey: user?.id ? [`/api/doctors/${user.id}/rating-stats`] : ['rating-stats-placeholder'],
    enabled: !!user?.id && user?.role === 'doctor',
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

  const uploadPictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      const response = await fetch('/api/users/upload-profile-picture', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setSelectedFile(null);
      setPreviewUrl(null);
      toast({
        title: "Sucesso!",
        description: "Foto de perfil atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao fazer upload da foto. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const deletePictureMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', '/api/users/delete-profile-picture');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Sucesso!",
        description: "Foto de perfil removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover foto. Tente novamente.",
        variant: "destructive",
      });
    }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadPictureMutation.mutate(selectedFile);
    }
  };

  const handleDeletePicture = () => {
    if (confirm('Tem certeza que deseja remover sua foto de perfil?')) {
      deletePictureMutation.mutate();
    }
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
              <AvatarImage 
                src={previewUrl || user?.profilePicture || undefined} 
                alt={user?.name}
              />
              <AvatarFallback className="bg-gradient-to-br from-secondary to-accent text-white font-semibold text-2xl">
                {user ? getUserInitials(user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="w-full space-y-2">
              <Input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                disabled={uploadPictureMutation.isPending || deletePictureMutation.isPending}
                data-testid="input-profile-picture"
                className="text-sm"
              />
              
              {selectedFile && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={uploadPictureMutation.isPending}
                    data-testid="button-upload-picture"
                    className="flex-1"
                  >
                    {uploadPictureMutation.isPending ? (
                      <>
                        <div className="animate-spin mr-2 h-3 w-3 border-2 border-white/30 border-t-white rounded-full" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    disabled={uploadPictureMutation.isPending}
                    data-testid="button-cancel-upload"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
              
              {user?.profilePicture && !selectedFile && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeletePicture}
                  disabled={deletePictureMutation.isPending}
                  data-testid="button-delete-picture"
                  className="w-full"
                >
                  {deletePictureMutation.isPending ? (
                    <>
                      <div className="animate-spin mr-2 h-3 w-3 border-2 border-white/30 border-t-white rounded-full" />
                      Removendo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3 mr-2" />
                      Remover Foto
                    </>
                  )}
                </Button>
              )}
            </div>
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
              
              {user?.role === 'doctor' && ratingStats && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm">Avaliação Média</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="font-semibold text-lg" data-testid="text-average-rating">
                          {ratingStats.averageRating > 0 ? ratingStats.averageRating.toFixed(1) : 'N/A'}
                        </span>
                        {ratingStats.averageRating > 0 && (
                          <i className="fas fa-star text-yellow-500 text-sm"></i>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {ratingStats.totalRatings} {ratingStats.totalRatings === 1 ? 'avaliação' : 'avaliações'}
                    </div>
                  </div>
                </>
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
