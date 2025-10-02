import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, FileText, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import TodaySchedule from "@/components/dashboard/today-schedule";
import { type DashboardStats } from "@shared/schema";

export function DesktopAdminDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: user?.id ? ['/api/dashboard/stats', user.id] : [],
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card data-testid="card-today-appointments">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Consultas Hoje</p>
                    <p className="text-2xl font-bold" data-testid="text-today-appointments">
                      {stats.todayConsultations || 0}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-patients">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Pacientes</p>
                    <p className="text-2xl font-bold" data-testid="text-total-patients">
                      {stats.totalPatients || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-records">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Prontuários</p>
                    <p className="text-2xl font-bold" data-testid="text-records">
                      {stats.secureRecords || 0}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Acesso Rápido</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Link href="/schedule">
              <Button
                className="w-full h-24 flex flex-col items-center justify-center gap-2 bg-medical-primary hover:bg-medical-primary/90"
                data-testid="button-schedule"
              >
                <Calendar className="w-6 h-6" />
                <span className="font-medium">Agenda</span>
              </Button>
            </Link>

            <Link href="/patients">
              <Button
                className="w-full h-24 flex flex-col items-center justify-center gap-2"
                variant="outline"
                data-testid="button-patients"
              >
                <Users className="w-6 h-6" />
                <span className="font-medium">Pacientes</span>
              </Button>
            </Link>

            <Link href="/records">
              <Button
                className="w-full h-24 flex flex-col items-center justify-center gap-2"
                variant="outline"
                data-testid="button-records"
              >
                <FileText className="w-6 h-6" />
                <span className="font-medium">Prontuários</span>
              </Button>
            </Link>

            <Link href="/admin">
              <Button
                className="w-full h-24 flex flex-col items-center justify-center gap-2"
                variant="outline"
                data-testid="button-admin"
              >
                <i className="fas fa-cog text-2xl"></i>
                <span className="font-medium">Administração</span>
              </Button>
            </Link>

            <Link href="/analytics">
              <Button
                className="w-full h-24 flex flex-col items-center justify-center gap-2"
                variant="outline"
                data-testid="button-analytics"
              >
                <BarChart3 className="w-6 h-6" />
                <span className="font-medium">Análises</span>
              </Button>
            </Link>

            <Link href="/whatsapp">
              <Button
                className="w-full h-24 flex flex-col items-center justify-center gap-2"
                variant="outline"
                data-testid="button-whatsapp"
              >
                <i className="fab fa-whatsapp text-2xl"></i>
                <span className="font-medium">WhatsApp</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Today's Schedule */}
        <TodaySchedule />
      </div>
    </div>
  );
}
