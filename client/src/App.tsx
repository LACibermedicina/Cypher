import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import PatientProfile from "@/pages/patient-profile";
import Schedule from "@/pages/schedule";
import WhatsApp from "@/pages/whatsapp";
import MedicalRecords from "@/pages/medical-records";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";
import Header from "@/components/layout/header";

function Router() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/patients/:id" component={PatientProfile} />
        <Route path="/patients" component={Patients} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/whatsapp" component={WhatsApp} />
        <Route path="/records" component={MedicalRecords} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
      
      {/* Security Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <i className="fas fa-shield-alt text-accent"></i>
                <span>{t("security.compliance")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-lock text-accent"></i>
                <span>{t("security.encryption")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-certificate text-accent"></i>
                <span>{t("security.iso_cert")}</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {t("footer.copyright")}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
