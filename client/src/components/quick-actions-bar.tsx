import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Command,
  Calendar, 
  Users, 
  FileText, 
  MessageSquare, 
  Brain, 
  Shield, 
  CreditCard,
  Search,
  Zap,
  ChevronUp,
  ChevronDown
} from "lucide-react";

interface QuickActionsBarProps {
  userRole: string;
}

export default function QuickActionsBar({ userRole }: QuickActionsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Quick actions based on user role
  const getQuickActions = () => {
    const commonActions = [
      {
        id: 'command-palette',
        title: 'Comandos',
        icon: <Command className="w-4 h-4" />,
        shortcut: 'Ctrl+K',
        action: () => {
          const event = new KeyboardEvent('keydown', {
            key: 'k',
            ctrlKey: true,
            bubbles: true
          });
          document.dispatchEvent(event);
        }
      },
      {
        id: 'search',
        title: 'Buscar',
        icon: <Search className="w-4 h-4" />,
        shortcut: 'Ctrl+/',
        action: () => {
          const event = new CustomEvent('quick-search');
          window.dispatchEvent(event);
        }
      }
    ];

    const doctorActions = [
      {
        id: 'ai-analysis',
        title: 'Análise IA',
        icon: <Brain className="w-4 h-4" />,
        shortcut: 'Ctrl+I',
        action: () => {
          const event = new CustomEvent('open-ai-analysis');
          window.dispatchEvent(event);
        }
      },
      {
        id: 'new-prescription',
        title: 'Nova Receita',
        icon: <FileText className="w-4 h-4" />,
        shortcut: 'Ctrl+R',
        action: () => {
          const event = new CustomEvent('create-prescription');
          window.dispatchEvent(event);
        }
      },
      {
        id: 'schedule',
        title: 'Agenda',
        icon: <Calendar className="w-4 h-4" />,
        shortcut: 'Ctrl+A',
        action: () => {
          window.location.href = '/schedule';
        }
      },
      {
        id: 'whatsapp',
        title: 'WhatsApp',
        icon: <MessageSquare className="w-4 h-4" />,
        shortcut: 'Ctrl+W',
        action: () => {
          window.location.href = '/whatsapp';
        }
      },
      {
        id: 'sign-prescription',
        title: 'Assinar Receita',
        icon: <Shield className="w-4 h-4" />,
        shortcut: 'Ctrl+S',
        action: () => {
          const event = new CustomEvent('sign-prescription');
          window.dispatchEvent(event);
        }
      }
    ];

    const adminActions = [
      {
        id: 'users',
        title: 'Usuários',
        icon: <Users className="w-4 h-4" />,
        action: () => {
          window.location.href = '/admin';
        }
      },
      {
        id: 'tmc-system',
        title: 'Sistema TMC',
        icon: <CreditCard className="w-4 h-4" />,
        shortcut: 'Ctrl+M',
        action: () => {
          const event = new CustomEvent('tmc-transfer');
          window.dispatchEvent(event);
        }
      }
    ];

    const emergencyAction = {
      id: 'emergency',
      title: 'Emergência',
      icon: <Zap className="w-4 h-4" />,
      shortcut: 'Ctrl+!',
      action: () => {
        const event = new CustomEvent('emergency-protocol');
        window.dispatchEvent(event);
      },
      isEmergency: true
    };

    let actions = [...commonActions];
    
    if (userRole === 'doctor') {
      actions.push(...doctorActions);
    }
    
    if (userRole === 'admin') {
      actions.push(...doctorActions, ...adminActions);
    }
    
    // Add emergency action for medical roles
    if (['doctor', 'admin'].includes(userRole)) {
      actions.push(emergencyAction);
    }

    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <div className="fixed bottom-6 right-6 z-50" data-testid="quick-actions-bar">
      <div className={`bg-card border border-border rounded-2xl shadow-2xl transition-all duration-300 ${
        isExpanded ? 'p-4' : 'p-2'
      }`}>
        {/* Expand/Collapse Button */}
        <div className="flex justify-center mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2"
            data-testid="button-toggle-quick-actions"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </Button>
        </div>

        {/* Quick Actions */}
        <div className={`transition-all duration-300 ${
          isExpanded ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'
        }`}>
          <div className="grid grid-cols-2 gap-2 w-48">
            {quickActions.map((action, index) => (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={action.isEmergency ? "destructive" : "outline"}
                    size="sm"
                    onClick={action.action}
                    className={`flex flex-col items-center justify-center h-16 text-xs gap-1 ${
                      action.isEmergency ? 'border-red-500 bg-red-50 hover:bg-red-100 text-red-700' : ''
                    }`}
                    data-testid={`quick-action-${action.id}`}
                  >
                    <div className="flex-shrink-0">
                      {action.icon}
                    </div>
                    <div className="truncate w-full text-center">
                      {action.title}
                    </div>
                    {action.shortcut && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3">
                        {action.shortcut.replace('Ctrl+', '⌘')}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <div className="text-center">
                    <div className="font-medium">{action.title}</div>
                    {action.shortcut && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Atalho: {action.shortcut}
                      </div>
                    )}
                    {action.isEmergency && (
                      <div className="text-xs text-red-500 mt-1">
                        ⚠️ Protocolo de Emergência
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Role indicator */}
          <div className="mt-3 pt-2 border-t border-border">
            <div className="flex items-center justify-center">
              <Badge 
                variant={userRole === 'admin' ? 'default' : userRole === 'doctor' ? 'secondary' : 'outline'}
                className="text-xs"
              >
                {userRole === 'admin' ? 'Administrador' : 
                 userRole === 'doctor' ? 'Médico' : 
                 userRole === 'patient' ? 'Paciente' :
                 userRole === 'researcher' ? 'Pesquisador' : 'Visitante'}
              </Badge>
            </div>
          </div>

          {/* Quick help */}
          <div className="mt-2 text-center">
            <div className="text-xs text-muted-foreground">
              Pressione <Badge variant="outline" className="text-[8px] px-1 py-0">⌘K</Badge> para mais comandos
            </div>
          </div>
        </div>

        {/* Collapsed state indicator */}
        {!isExpanded && (
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    </div>
  );
}