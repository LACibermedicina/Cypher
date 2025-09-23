import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/use-notifications';
import { useQuery } from '@tanstack/react-query';
import { Activity, Users, MessageCircle, Calendar, Wifi, WifiOff } from 'lucide-react';

interface SystemStatus {
  activeUsers: number;
  onlinePatients: number;
  pendingMessages: number;
  todayAppointments: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export default function RealTimeStatus() {
  const { isConnected, unreadCount } = useNotifications();
  
  const { data: systemStatus } = useQuery<SystemStatus>({
    queryKey: ['/api/system/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
    select: (data) => data || {
      activeUsers: 0,
      onlinePatients: 0,
      pendingMessages: 0,
      todayAppointments: 0,
      systemHealth: 'healthy' as const
    }
  });

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'critical':
        return 'text-destructive';
      case 'warning':
        return 'text-orange-500';
      default:
        return 'text-green-500';
    }
  };

  const getHealthLabel = (health: string) => {
    switch (health) {
      case 'critical':
        return 'Crítico';
      case 'warning':
        return 'Atenção';
      default:
        return 'Normal';
    }
  };

  return (
    <Card className="border-l-4 border-l-primary" data-testid="card-real-time-status">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-sm">Status em Tempo Real</h3>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <Badge 
              variant={isConnected ? "default" : "destructive"}
              className={isConnected ? "bg-green-500" : ""}
            >
              {isConnected ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Usuários Ativos</p>
              <p className="font-medium" data-testid="text-active-users">
                {systemStatus?.activeUsers || 0}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <MessageCircle className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Mensagens Pendentes</p>
              <p className="font-medium" data-testid="text-pending-messages">
                {(systemStatus?.pendingMessages || 0) + unreadCount}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Consultas Hoje</p>
              <p className="font-medium" data-testid="text-today-appointments">
                {systemStatus?.todayAppointments || 0}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Activity className={`h-4 w-4 ${getHealthColor(systemStatus?.systemHealth || 'healthy')}`} />
            <div>
              <p className="text-xs text-muted-foreground">Status Sistema</p>
              <p className={`font-medium ${getHealthColor(systemStatus?.systemHealth || 'healthy')}`} data-testid="text-system-health">
                {getHealthLabel(systemStatus?.systemHealth || 'healthy')}
              </p>
            </div>
          </div>
        </div>

        {!isConnected && (
          <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">
              Conexão com servidor perdida. Tentando reconectar...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}