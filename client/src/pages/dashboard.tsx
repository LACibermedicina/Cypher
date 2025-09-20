import TodaySchedule from "@/components/dashboard/today-schedule";
import WhatsAppIntegration from "@/components/dashboard/whatsapp-integration";
import PatientQuickInfo from "@/components/dashboard/patient-quick-info";
import AIClinicalAssistant from "@/components/dashboard/ai-clinical-assistant";
import DigitalSignature from "@/components/dashboard/digital-signature";
import MedicalCollaborators from "@/components/dashboard/medical-collaborators";
import ExamResults from "@/components/dashboard/exam-results";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_DOCTOR_ID, type DashboardStats } from "@shared/schema";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats', DEFAULT_DOCTOR_ID],
  });

  if (statsLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm" data-testid="card-today-consultations">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Consultas Hoje</p>
              <p className="text-2xl font-bold text-primary" data-testid="text-today-consultations">
                {stats?.todayConsultations || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <i className="fas fa-calendar-day text-primary text-lg"></i>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 shadow-sm" data-testid="card-whatsapp-messages">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Mensagens WhatsApp</p>
              <p className="text-2xl font-bold text-accent" data-testid="text-whatsapp-messages">
                {stats?.whatsappMessages || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <i className="fab fa-whatsapp text-accent text-lg"></i>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 shadow-sm" data-testid="card-ai-scheduling">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Agendamentos IA</p>
              <p className="text-2xl font-bold text-secondary" data-testid="text-ai-scheduling">
                {stats?.aiScheduling || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
              <i className="fas fa-robot text-secondary text-lg"></i>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 shadow-sm" data-testid="card-secure-records">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Prontuários Seguros</p>
              <p className="text-2xl font-bold text-primary" data-testid="text-secure-records">
                {stats?.secureRecords || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <i className="fas fa-file-medical text-primary text-lg"></i>
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
