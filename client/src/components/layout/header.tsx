import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import LanguageSelector from "@/components/ui/language-selector";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Header() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            <div className="security-badge px-4 py-2 rounded-full text-white text-xs font-semibold">
              <i className="fas fa-shield-alt mr-2"></i>
              {t("security.compliance")}
            </div>
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
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-secondary to-accent rounded-xl flex items-center justify-center shadow-sm">
                    <i className="fas fa-user text-white"></i>
                  </div>
                  <div>
                    <p className="font-semibold text-sm" data-testid="text-mobile-user-name">Dr. Carlos Silva</p>
                    <p className="text-xs text-muted-foreground">CRM: 123456-SP</p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <div className="ai-indicator px-4 py-2 rounded-full text-white text-xs font-semibold">
              <i className="fas fa-robot mr-2"></i>
              {t("dashboard.ai_medical")} - {t("dashboard.status_active")}
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-secondary to-accent rounded-xl flex items-center justify-center shadow-sm">
                <i className="fas fa-user text-white text-sm"></i>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold" data-testid="text-user-name">Dr. Carlos Silva</p>
                <p className="text-xs text-muted-foreground">CRM: 123456-SP</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}