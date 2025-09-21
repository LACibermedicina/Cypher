import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import PatientProfile from "@/pages/patient-profile";
import Schedule from "@/pages/schedule";
import WhatsApp from "@/pages/whatsapp";
import MedicalRecords from "@/pages/medical-records";
import AdminPage from "@/pages/admin";
import Login from "@/pages/login";
import PatientJoin from "@/pages/patient-join";
import NotFound from "@/pages/not-found";
import Header from "@/components/layout/header";
import FloatingChatbot from "@/components/ui/floating-chatbot";

function Router() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        {/* Public routes */}
        <Route path="/login">
          <Header />
          <Login />
        </Route>
        <Route path="/join/:token" component={PatientJoin} />
        
        {/* Protected routes with different role requirements */}
        <Route path="/">
          <ProtectedRoute>
            <Header />
            <Dashboard />
          </ProtectedRoute>
        </Route>
        
        <Route path="/dashboard">
          <ProtectedRoute>
            <Header />
            <Dashboard />
          </ProtectedRoute>
        </Route>
        
        <Route path="/patients/:id">
          <ProtectedRoute requiredRoles={['doctor', 'admin']}>
            <Header />
            <PatientProfile />
          </ProtectedRoute>
        </Route>
        
        <Route path="/patients">
          <ProtectedRoute requiredRoles={['doctor', 'admin']}>
            <Header />
            <Patients />
          </ProtectedRoute>
        </Route>
        
        <Route path="/schedule">
          <ProtectedRoute requiredRoles={['doctor', 'admin']}>
            <Header />
            <Schedule />
          </ProtectedRoute>
        </Route>
        
        <Route path="/whatsapp">
          <ProtectedRoute requiredRoles={['doctor', 'admin']}>
            <Header />
            <WhatsApp />
          </ProtectedRoute>
        </Route>
        
        <Route path="/records">
          <ProtectedRoute>
            <Header />
            <MedicalRecords />
          </ProtectedRoute>
        </Route>
        
        <Route path="/admin">
          <ProtectedRoute requiredRoles={['admin']}>
            <Header />
            <AdminPage />
          </ProtectedRoute>
        </Route>
        
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
      
      {/* Floating AI Chatbot - Available on all pages */}
      <FloatingChatbot />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
