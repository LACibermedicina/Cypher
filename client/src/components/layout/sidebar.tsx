import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  className?: string;
}

// Navigation items will be generated inside the component using translations

// Quick actions will be generated inside the component using translations

function SidebarContent() {
  const [location] = useLocation();
  const { t } = useTranslation();

  const navItems = [
    {
      path: "/dashboard",
      label: t("navigation.dashboard"),
      icon: "fas fa-chart-line",
      description: t("dashboard.title")
    },
    {
      path: "/patients",
      label: t("navigation.patients"),
      icon: "fas fa-users",
      description: t("patients.title")
    },
    {
      path: "/schedule",
      label: t("navigation.schedule"),
      icon: "fas fa-calendar-alt",
      description: t("appointments.title")
    },
    {
      path: "/whatsapp",
      label: t("navigation.whatsapp"),
      icon: "fab fa-whatsapp",
      description: t("telemedicine.secure_messaging")
    },
    {
      path: "/records",
      label: t("navigation.records"),
      icon: "fas fa-file-medical",
      description: t("medical.medical_record")
    },
  ];

  const quickActions = [
    {
      label: t("dashboard.new_appointment"),
      icon: "fas fa-plus",
      action: "new-appointment",
      color: "bg-primary text-primary-foreground"
    },
    {
      label: t("medical.emergency"),
      icon: "fas fa-exclamation-triangle",
      action: "emergency",
      color: "bg-destructive text-destructive-foreground"
    },
    {
      label: t("medical.prescription_digital"),
      icon: "fas fa-prescription-bottle",
      action: "prescription",
      color: "bg-secondary text-secondary-foreground"
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Modern Logo and Brand */}
      <div className="flex items-center space-x-4 p-6 border-b border-border">
        <div className="w-12 h-12 flex items-center justify-center">
          <img 
            src="/attached_assets/logo icon_1759355903911.jpg" 
            alt="Telemed Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-medical-primary bg-clip-text text-transparent">
            {t("app.name")}
          </h2>
          <p className="text-xs text-muted-foreground font-medium">{t("app.subtitle")}</p>
        </div>
      </div>

      {/* Support and Emergency Access */}
      <div className="px-6 py-3 space-y-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs font-semibold hover:bg-accent/10 transition-colors"
          data-testid="sidebar-support"
        >
          <i className="fas fa-headset mr-2 text-accent"></i>
          Falar com Suporte
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          className="w-full text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
          data-testid="sidebar-emergency"
        >
          <i className="fas fa-ambulance mr-2"></i>
          Emergência Médica
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-4">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("navigation.dashboard")}
          </h3>
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                className={`nav-item flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  location === item.path || (location === "/" && item.path === "/dashboard")
                    ? "active bg-gradient-to-r from-primary to-medical-primary text-white shadow-md"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                }`}
                data-testid={`sidebar-nav-${item.path.slice(1) || 'dashboard'}`}
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
            {t("dashboard.quick_actions")}
          </h3>
          {quickActions.map((action) => (
            <Button
              key={action.action}
              variant="outline"
              size="sm"
              className="w-full justify-start h-12 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
              data-testid={`sidebar-action-${action.action}`}
            >
              <i className={`${action.icon} mr-3 text-primary`}></i>
              <span className="text-left font-medium">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* AI Status */}
        <div className="space-y-2 py-4">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("dashboard.system_status")}
          </h3>
          <div className="px-3 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-sm"></div>
                <span className="text-sm font-medium">Sistema de Suporte</span>
              </div>
              <Badge className="success-badge text-xs px-3 py-1">{t("dashboard.status_active")}</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-sm"></div>
                <span className="text-sm font-medium">{t("navigation.whatsapp")}</span>
              </div>
              <Badge className="success-badge text-xs px-3 py-1">{t("dashboard.status_online")}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-sm"></div>
                <span className="text-sm font-medium">{t("dashboard.database")}</span>
              </div>
              <Badge className="success-badge text-xs px-3 py-1">{t("dashboard.status_connected")}</Badge>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Modern User Info */}
      <div className="border-t border-border p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-secondary to-accent rounded-xl flex items-center justify-center shadow-md">
            <i className="fas fa-user text-white text-lg"></i>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" data-testid="sidebar-user-name">Dr. Carlos Silva</p>
            <p className="text-xs text-muted-foreground font-medium">CRM: 123456-SP</p>
          </div>
          <Button variant="ghost" size="sm" className="rounded-xl hover:bg-primary/10" data-testid="sidebar-user-menu">
            <i className="fas fa-cog text-primary"></i>
          </Button>
        </div>
      </div>

      {/* Modern Security Footer */}
      <div className="border-t border-border p-4">
        <div className="space-y-3 text-xs">
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-security-gradient/10 border border-accent/20">
            <i className="fas fa-lock text-accent text-sm"></i>
            <span className="font-medium text-muted-foreground">{t("security.encryption")}</span>
          </div>
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-security-gradient/10 border border-accent/20">
            <i className="fas fa-certificate text-accent text-sm"></i>
            <span className="font-medium text-muted-foreground">{t("security.iso_cert")}</span>
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
