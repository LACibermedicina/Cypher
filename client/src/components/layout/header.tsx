import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LanguageSelector from "@/components/ui/language-selector";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LogOut, User, Settings } from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: t("auth.logout_success"),
        description: t("auth.logout_success_desc"),
      });
    } catch (error) {
      toast({
        title: t("auth.logout_error"),
        description: t("auth.logout_error_desc"),
        variant: "destructive",
      });
    }
  };

  const handleSupportContact = async () => {
    try {
      const response: any = await apiRequest('POST', '/api/support/contact', {
        message: 'Solicitação de suporte através da interface do sistema',
        userInfo: {
          name: user?.name,
          email: user?.email,
          phone: user?.phone
        },
        priority: 'medium'
      });

      toast({
        title: "Suporte Contactado",
        description: response.message || "Mensagem enviada com sucesso!",
      });

      if (response.method === 'whatsapp' && response.autoResponse) {
        setTimeout(() => {
          toast({
            title: "Resposta Automática",
            description: response.autoResponse,
          });
        }, 1000);
      }
    } catch (error) {
      toast({
        title: "Erro no Suporte",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEmergencyContact = async () => {
    try {
      // Try to get user's location for emergency
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const response: any = await apiRequest('POST', '/api/support/emergency', {
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            },
            userInfo: {
              name: user?.name,
              phone: user?.phone
            },
            type: 'samu_whatsapp'
          });

          if (response.phone) {
            const whatsappUrl = `https://wa.me/${response.phone}?text=Emergência médica - Solicito atendimento imediato`;
            window.open(whatsappUrl, '_blank');
          }

          toast({
            title: "Emergência Médica",
            description: response.message || "Contato de emergência acionado",
          });
        }, async () => {
          // Fallback without location
          const response: any = await apiRequest('POST', '/api/support/emergency', {
            userInfo: {
              name: user?.name,
              phone: user?.phone
            },
            type: 'samu_whatsapp'
          });

          if (response.phone) {
            const whatsappUrl = `https://wa.me/${response.phone}?text=Emergência médica - Solicito atendimento imediato`;
            window.open(whatsappUrl, '_blank');
          }

          toast({
            title: "Emergência Médica",
            description: response.message || "Contato de emergência acionado",
          });
        });
      } else {
        // No geolocation support
        const response: any = await apiRequest('POST', '/api/support/emergency', {
          userInfo: {
            name: user?.name,
            phone: user?.phone
          },
          type: 'samu_whatsapp'
        });

        if (response.phone) {
          const whatsappUrl = `https://wa.me/${response.phone}?text=Emergência médica - Solicito atendimento imediato`;
          window.open(whatsappUrl, '_blank');
        }

        toast({
          title: "Emergência Médica",
          description: response.message || "Contato de emergência acionado",
        });
      }
    } catch (error) {
      toast({
        title: "Erro na Emergência",
        description: "Não foi possível acionar o contato de emergência. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'doctor':
        return t('roles.doctor');
      case 'admin':
        return t('roles.admin');
      case 'patient':
        return t('roles.patient');
      default:
        return role;
    }
  };

  const navItems = [
    { path: "/dashboard", label: t("navigation.dashboard"), icon: "fas fa-chart-line" },
    { path: "/patients", label: t("navigation.patients"), icon: "fas fa-users" },
    { path: "/schedule", label: t("navigation.schedule"), icon: "fas fa-calendar-alt" },
    { path: "/whatsapp", label: t("navigation.whatsapp"), icon: "fab fa-whatsapp" },
    { path: "/records", label: t("navigation.records"), icon: "fas fa-file-medical" },
    { path: "/admin", label: t("navigation.admin"), icon: "fas fa-shield-alt" },
  ];

  return (
    <header className="bg-card/95 backdrop-blur-sm border-b border-border shadow-sm sticky top-0 z-50" data-testid="header-main">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" data-testid="link-logo">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-medical-primary flex items-center justify-center shadow-md">
                  <i className="fas fa-user-md text-white text-lg"></i>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-medical-primary bg-clip-text text-transparent">
                    {t("app.name")}
                  </h1>
                  <p className="text-xs text-muted-foreground font-medium">{t("app.subtitle")}</p>
                </div>
              </div>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              className="px-4 py-2 text-xs font-semibold hover:bg-accent/10 transition-colors"
              data-testid="button-support"
              onClick={handleSupportContact}
            >
              <i className="fas fa-headset mr-2 text-accent"></i>
              Falar com Suporte
            </Button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6" data-testid="nav-main">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                data-testid={`link-nav-${item.path.slice(1) || 'dashboard'}`}
              >
                {(() => {
                  const isActive = location === item.path || (location === "/" && item.path === "/dashboard");
                  return (
                    <span
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "text-white shadow-md"
                          : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                      }`}
                      style={{
                        background: isActive
                          ? "linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(213, 93%, 68%) 100%)"
                          : "transparent"
                      }}
                    >
                      <i className={`${item.icon} mr-2`}></i>
                      {item.label}
                    </span>
                  );
                })()}
              </Link>
            ))}
          </nav>

          {/* Mobile Navigation Sheet */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden w-10 h-10 p-0 hover:bg-primary/10"
                data-testid="button-mobile-menu"
              >
                <i className="fas fa-bars text-lg text-foreground"></i>
                <span className="sr-only">{t("navigation.menu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 px-0">
              <SheetHeader className="px-6 pb-6 border-b">
                <SheetTitle className="text-left">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-medical-primary flex items-center justify-center shadow-md">
                      <i className="fas fa-user-md text-white text-lg"></i>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-medical-primary bg-clip-text text-transparent">
                        {t("app.name")}
                      </h2>
                      <p className="text-xs text-muted-foreground font-medium">{t("app.subtitle")}</p>
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              
              <nav className="flex flex-col p-6 space-y-2">
                {navItems.map((item) => {
                  const isActive = location === item.path || (location === "/" && item.path === "/dashboard");
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      data-testid={`link-mobile-nav-${item.path.slice(1) || 'dashboard'}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div
                        className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 ${
                          isActive
                            ? "text-white shadow-lg"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                        }`}
                        style={{
                          background: isActive
                            ? "linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(213, 93%, 68%) 100%)"
                            : "transparent"
                        }}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isActive ? "bg-white/20" : "bg-muted"
                        }`}>
                          <i className={`${item.icon} ${isActive ? "text-white" : "text-muted-foreground"}`}></i>
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile User Info */}
              <div className="absolute bottom-6 left-6 right-6 p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-br from-secondary to-accent text-white font-semibold">
                        {user ? getUserInitials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm" data-testid="text-mobile-user-name">
                        {user?.name || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user?.role ? getRoleDisplay(user.role) : 'Usuário'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid="button-mobile-logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <Button 
              variant="destructive" 
              size="sm" 
              className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-emergency"
              onClick={handleEmergencyContact}
            >
              <i className="fas fa-ambulance mr-2"></i>
              Emergência Médica
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-primary/5 transition-colors"
                  data-testid="button-user-menu"
                >
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-gradient-to-br from-secondary to-accent text-white font-semibold text-sm">
                      {user ? getUserInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold" data-testid="text-user-name">
                      {user?.name || 'Usuário'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.role ? getRoleDisplay(user.role) : 'Usuário'}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-semibold">{user?.name || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      {user?.email || user?.username}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <User className="mr-2 h-4 w-4" />
                  {t("auth.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  {t("auth.settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                  data-testid="button-desktop-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("auth.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}