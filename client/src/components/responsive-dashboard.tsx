import { useDeviceType } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

// Mobile Components
import { MobileDoctorDashboard } from "@/components/mobile/mobile-doctor-dashboard";
import { MobilePatientDashboard } from "@/components/mobile/mobile-patient-dashboard";
import { MobileAdminDashboard } from "@/components/mobile/mobile-admin-dashboard";
import { MobileVisitorDashboard } from "@/components/mobile/mobile-visitor-dashboard";
import { MobileResearcherDashboard } from "@/components/mobile/mobile-researcher-dashboard";

// Desktop Components  
import { DesktopDoctorDashboard } from "@/components/desktop/desktop-doctor-dashboard";
import { DesktopPatientDashboard } from "@/components/desktop/desktop-patient-dashboard";
import { DesktopAdminDashboard } from "@/components/desktop/desktop-admin-dashboard";
import { DesktopVisitorDashboard } from "@/components/desktop/desktop-visitor-dashboard";
import { DesktopResearcherDashboard } from "@/components/desktop/desktop-researcher-dashboard";

// Fallback component for non-mobile interfaces
import Dashboard from "@/pages/dashboard";

export function ResponsiveDashboard() {
  const deviceType = useDeviceType();
  const { user } = useAuth();
  
  // Get user role, default to 'visitor' if not authenticated
  const userRole = user?.role || 'visitor';
  
  // For mobile devices
  if (deviceType === 'mobile') {
    switch (userRole) {
      case 'admin':
        return <MobileAdminDashboard />;
      case 'doctor':
        return <MobileDoctorDashboard />;
      case 'patient':
        return <MobilePatientDashboard />;
      case 'visitor':
        return <MobileVisitorDashboard />;
      case 'researcher':
        return <MobileResearcherDashboard />;
      default:
        // Default to visitor interface for unknown roles
        return <MobileVisitorDashboard />;
    }
  }
  
  // For desktop and tablet devices
  if (deviceType === 'desktop' || deviceType === 'tablet') {
    switch (userRole) {
      case 'admin':
        return <DesktopAdminDashboard />;
      case 'doctor':
        return <DesktopDoctorDashboard />;
      case 'patient':
        return <DesktopPatientDashboard />;
      case 'visitor':
        return <DesktopVisitorDashboard />;
      case 'researcher':
        return <DesktopResearcherDashboard />;
      default:
        // Default to visitor interface for unknown roles
        return <DesktopVisitorDashboard />;
    }
  }
  
  // Fallback to original dashboard if device type detection fails
  return <Dashboard />;
}