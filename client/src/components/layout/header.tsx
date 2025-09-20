import { Link, useLocation } from "wouter";

export default function Header() {
  const [location] = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: "fas fa-chart-line" },
    { path: "/patients", label: "Pacientes", icon: "fas fa-users" },
    { path: "/schedule", label: "Agenda", icon: "fas fa-calendar-alt" },
    { path: "/whatsapp", label: "WhatsApp IA", icon: "fab fa-whatsapp" },
    { path: "/records", label: "Prontuários", icon: "fas fa-file-medical" },
    { path: "/admin", label: "Admin", icon: "fas fa-shield-alt" },
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
                <h1 className="text-xl font-bold text-primary">Telemed</h1>
              </div>
            </Link>
            <div className="security-badge px-3 py-1 rounded-full text-white text-xs font-medium">
              <i className="fas fa-shield-alt mr-1"></i>
              FIPS 140-2 Compliant
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6" data-testid="nav-main">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                data-testid={`link-nav-${item.label.toLowerCase()}`}
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
            <div className="ai-indicator px-3 py-1 rounded-full text-white text-xs font-medium">
              <i className="fas fa-robot mr-1"></i>
              IA Ativa
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
