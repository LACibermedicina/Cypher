import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import PatientProfile from "@/pages/patient-profile";
import Profile from "@/pages/profile";
import Schedule from "@/pages/schedule";
import WhatsApp from "@/pages/whatsapp";
import MedicalRecords from "@/pages/medical-records";
import Prescriptions from "@/pages/prescriptions";
import Analytics from "@/pages/analytics";
import AdminPage from "@/pages/admin";
import Login from "@/pages/login";
import PatientJoin from "@/pages/patient-join";
import VideoConsultation from "@/pages/video-consultation";
import NotFound from "@/pages/not-found";
import Features from "@/pages/features";
import RegisterSelect from "@/pages/register/index";
import PatientRegister from "@/pages/register/patient";
import DoctorRegister from "@/pages/register/doctor";
import Header from "@/components/layout/header";
import FloatingChatbot from "@/components/ui/floating-chatbot";
import CommandPalette from "@/components/command-palette";
import QuickActionsBar from "@/components/quick-actions-bar";

// Responsive Dashboard Components
import { ResponsiveDashboard } from "@/components/responsive-dashboard";

// Global shortcuts hooks
import { useGlobalShortcuts, useCommandEvents, useApplicationShortcuts } from "@/hooks/use-shortcuts";

function Router() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isCommandPaletteOpen, setIsCommandPaletteOpen } = useGlobalShortcuts();
  
  // Enable command events and global shortcuts
  useCommandEvents();
  useApplicationShortcuts();

  return (
    <div className="min-h-screen bg-background">
      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)}
        userRole={user?.role}
      />

      {/* Quick Actions Bar */}
      {user && <QuickActionsBar userRole={user.role} />}

      <Switch>
        {/* Public routes */}
        <Route path="/login">
          <Header />
          <Login />
        </Route>
        <Route path="/join/:token" component={PatientJoin} />
        
        {/* Registration routes - public */}
        <Route path="/register">
          <RegisterSelect />
        </Route>
        <Route path="/register/patient">
          <PatientRegister />
        </Route>
        <Route path="/register/doctor">
          <DoctorRegister />
        </Route>
        
        {/* Features page - public */}
        <Route path="/features">
          <Features />
        </Route>
        
        {/* Public homepage - accessible to all including visitors */}
        <Route path="/">
          <Header />
          <ResponsiveDashboard />
        </Route>
        
        <Route path="/dashboard">
          <ProtectedRoute>
            <Header />
            <ResponsiveDashboard />
          </ProtectedRoute>
        </Route>
        
        <Route path="/profile">
          <ProtectedRoute>
            <Header />
            <Profile />
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
        
        <Route path="/prescriptions">
          <ProtectedRoute requiredRoles={['doctor', 'admin']}>
            <Header />
            <Prescriptions />
          </ProtectedRoute>
        </Route>
        
        <Route path="/analytics">
          <ProtectedRoute requiredRoles={['admin']}>
            <Header />
            <Analytics />
          </ProtectedRoute>
        </Route>
        
        <Route path="/admin">
          <ProtectedRoute requiredRoles={['admin']}>
            <Header />
            <AdminPage />
          </ProtectedRoute>
        </Route>
        
        <Route path="/consultation/video/:patientId">
          <ProtectedRoute requiredRoles={['doctor', 'admin']}>
            <VideoConsultation />
          </ProtectedRoute>
        </Route>
        
        <Route component={NotFound} />
      </Switch>
      
      {/* Enhanced Footer with Quick Access */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <i className="fas fa-video text-accent"></i>
                <span>Teleconsultas Ativas</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-heartbeat text-accent"></i>
                <span>Sistema de Monitoramento</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-users-cog text-accent"></i>
                <span>Gestão Integrada</span>
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
        <NavigationProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </NavigationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
