import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  className?: string;
}

const navItems = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: "fas fa-chart-line",
    description: "Visão geral do sistema"
  },
  {
    path: "/patients",
    label: "Pacientes",
    icon: "fas fa-users",
    description: "Gestão de pacientes"
  },
  {
    path: "/schedule",
    label: "Agenda",
    icon: "fas fa-calendar-alt",
    description: "Agendamentos e consultas"
  },
  {
    path: "/whatsapp",
    label: "WhatsApp IA",
    icon: "fab fa-whatsapp",
    description: "Mensagens inteligentes"
  },
  {
    path: "/records",
    label: "Prontuários",
    icon: "fas fa-file-medical",
    description: "Registros médicos seguros"
  },
];

const quickActions = [
  {
    label: "Nova Consulta",
    icon: "fas fa-plus",
    action: "new-appointment",
    color: "bg-primary text-primary-foreground"
  },
  {
    label: "Emergência",
    icon: "fas fa-exclamation-triangle",
    action: "emergency",
    color: "bg-destructive text-destructive-foreground"
  },
  {
    label: "Receita Digital",
    icon: "fas fa-prescription-bottle",
    action: "prescription",
    color: "bg-secondary text-secondary-foreground"
  },
];

function SidebarContent() {
  const [location] = useLocation();

  return (
    <div className="flex h-full flex-col">
      {/* Logo and Brand */}
      <div className="flex items-center space-x-3 p-6 border-b border-border">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
          <i className="fas fa-user-md text-primary-foreground"></i>
        </div>
        <div>
          <h2 className="text-lg font-bold text-primary">Telemed</h2>
          <p className="text-xs text-muted-foreground">Sistema de Telemedicina</p>
        </div>
      </div>

      {/* Security Badge */}
      <div className="px-6 py-3">
        <div className="security-badge px-3 py-2 rounded-lg text-white text-xs font-medium text-center">
          <i className="fas fa-shield-alt mr-2"></i>
          FIPS 140-2 Compliant
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-4">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Navegação
          </h3>
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                  location === item.path || (location === "/" && item.path === "/dashboard")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
                data-testid={`sidebar-nav-${item.label.toLowerCase()}`}
              >
                <i className={`${item.icon} w-5 text-center`}></i>
                <div className="flex-1">
                  <div>{item.label}</div>
                  <div className="text-xs opacity-80">{item.description}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 py-4">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ações Rápidas
          </h3>
          {quickActions.map((action) => (
            <Button
              key={action.action}
              variant="outline"
              size="sm"
              className="w-full justify-start h-12"
              data-testid={`sidebar-action-${action.action}`}
            >
              <i className={`${action.icon} mr-3`}></i>
              <span className="text-left">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* AI Status */}
        <div className="space-y-2 py-4">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Status do Sistema
          </h3>
          <div className="px-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="ai-indicator w-3 h-3 rounded-full"></div>
                <span className="text-sm">IA Médica</span>
              </div>
              <Badge className="bg-green-100 text-green-800 text-xs">Ativa</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">WhatsApp</span>
              </div>
              <Badge className="bg-green-100 text-green-800 text-xs">Online</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Banco de Dados</span>
              </div>
              <Badge className="bg-green-100 text-green-800 text-xs">Conectado</Badge>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* User Info */}
      <div className="border-t border-border p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
            <i className="fas fa-user text-muted-foreground"></i>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" data-testid="sidebar-user-name">Dr. Carlos Silva</p>
            <p className="text-xs text-muted-foreground">CRM: 123456-SP</p>
          </div>
          <Button variant="ghost" size="sm" data-testid="sidebar-user-menu">
            <i className="fas fa-cog"></i>
          </Button>
        </div>
      </div>

      {/* Security Footer */}
      <div className="border-t border-border p-4">
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <i className="fas fa-lock text-accent"></i>
            <span>Criptografia AES-256</span>
          </div>
          <div className="flex items-center space-x-2">
            <i className="fas fa-certificate text-accent"></i>
            <span>ISO 27001:2013</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ className }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 md:hidden"
            data-testid="sidebar-trigger-mobile"
          >
            <i className="fas fa-bars"></i>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className={`w-80 border-r border-border bg-card ${className}`} data-testid="sidebar-desktop">
      <SidebarContent />
    </div>
  );
}
