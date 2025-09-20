import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/ui/language-selector";

export default function Header() {
  const [location] = useLocation();
  const { t } = useTranslation();

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