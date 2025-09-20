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
    <header className="bg-card border-b border-border shadow-sm" data-testid="header-main">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" data-testid="link-logo">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <i className="fas fa-user-md text-primary-foreground text-sm"></i>
                </div>
                <h1 className="text-xl font-bold text-primary">{t("app.name")}</h1>
              </div>
            </Link>
            <div className="security-badge px-3 py-1 rounded-full text-white text-xs font-medium">
              <i className="fas fa-shield-alt mr-1"></i>
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
                <span
                  className={`${
                    location === item.path || (location === "/" && item.path === "/dashboard")
                      ? "text-primary font-medium border-b-2 border-primary pb-1"
                      : "text-muted-foreground hover:text-primary transition-colors"
                  }`}
                >
                  <i className={`${item.icon} mr-2`}></i>
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <div className="ai-indicator px-3 py-1 rounded-full text-white text-xs font-medium">
              <i className="fas fa-robot mr-1"></i>
              {t("dashboard.ai_medical")} - {t("dashboard.status_active")}
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <i className="fas fa-user text-muted-foreground text-sm"></i>
              </div>
              <span className="text-sm font-medium" data-testid="text-user-name">Dr. Carlos Silva</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
