import TodaySchedule from "@/components/dashboard/today-schedule";
import WhatsAppIntegration from "@/components/dashboard/whatsapp-integration";
import PatientQuickInfo from "@/components/dashboard/patient-quick-info";
import AIClinicalAssistant from "@/components/dashboard/ai-clinical-assistant";
import DigitalSignature from "@/components/dashboard/digital-signature";
import MedicalCollaborators from "@/components/dashboard/medical-collaborators";
import ExamResults from "@/components/dashboard/exam-results";
import RealTimeStatus from "@/components/dashboard/real-time-status";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { type DashboardStats } from "@shared/schema";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: user?.id ? ['/api/dashboard/stats', user.id] : ['dashboard-stats-placeholder'],
    enabled: !!user?.id,
  });

  if (statsLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Quick Stats Section - Enhanced Healthcare Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="medical-card p-6" data-testid="card-today-consultations">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("dashboard.today_appointments")}</p>
              <p className="text-2xl font-bold text-foreground" data-testid="text-today-consultations">
                {stats?.todayConsultations || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center">
              <i className="fas fa-calendar-day text-lg text-muted-foreground"></i>
            </div>
          </div>
        </div>

        <div className="medical-card p-6" data-testid="card-whatsapp-messages">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("dashboard.whatsapp_messages")}</p>
              <p className="text-2xl font-bold text-foreground" data-testid="text-whatsapp-messages">
                {stats?.whatsappMessages || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center">
              <i className="fab fa-whatsapp text-lg text-muted-foreground"></i>
            </div>
          </div>
        </div>

        <div className="medical-card p-6" data-testid="card-ai-scheduling">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("dashboard.ai_scheduling")}</p>
              <p className="text-2xl font-bold text-foreground" data-testid="text-ai-scheduling">
                {stats?.aiScheduling || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center">
              <i className="fas fa-robot text-lg text-muted-foreground"></i>
            </div>
          </div>
        </div>

        <div className="medical-card p-6" data-testid="card-secure-records">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("dashboard.secure_records")}</p>
              <p className="text-2xl font-bold text-foreground" data-testid="text-secure-records">
                {stats?.secureRecords || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center">
              <i className="fas fa-shield-alt text-lg text-muted-foreground"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Schedule & WhatsApp */}
        <div className="lg:col-span-2 space-y-6">
          <TodaySchedule />
          <WhatsAppIntegration />
        </div>

        {/* Right Column - Patient Info & AI Tools */}
        <div className="space-y-6">
          <RealTimeStatus />
          <PatientQuickInfo />
          <AIClinicalAssistant />
          <DigitalSignature />
        </div>
      </div>

      {/* Bottom Section - Recent Activity & Collaborators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <MedicalCollaborators />
        <ExamResults />
      </div>
    </div>
  );
}
