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
  Sparkles,
  Grid3x3,
  LayoutGrid
} from "lucide-react";

interface QuickActionsBarProps {
  userRole: string;
}

interface QuickAction {
  id: string;
  title: string;
  icon: JSX.Element;
  action: () => void;
  shortcut?: string;
  isEmergency?: boolean;
}

export default function QuickActionsBar({ userRole }: QuickActionsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Quick actions based on user role
  const getQuickActions = (): QuickAction[] => {
    const commonActions: QuickAction[] = [
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

    const doctorActions: QuickAction[] = [
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

    const adminActions: QuickAction[] = [
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

    const emergencyAction: QuickAction = {
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
    <div className="fixed bottom-6 right-[66px] z-50" data-testid="quick-actions-bar">
      <div className="flex flex-col-reverse items-center">
        {/* Quick Actions - aparece acima do botão */}
        <div className={`transition-all duration-300 mb-2 ${
          isExpanded ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'
        }`}>
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-1.5 w-40">
            {quickActions.map((action) => (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={action.isEmergency ? "destructive" : "ghost"}
                    size="sm"
                    onClick={action.action}
                    className={`flex flex-col items-center justify-center h-12 text-[10px] gap-0.5 ${
                      action.isEmergency ? 'border-red-500 bg-red-50/80 hover:bg-red-100 text-red-700' : 'hover:bg-primary/10'
                    }`}
                    data-testid={`quick-action-${action.id}`}
                  >
                    <div className="flex-shrink-0">
                      {action.icon}
                    </div>
                    <div className="truncate w-full text-center leading-tight">
                      {action.title}
                    </div>
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

            {/* Quick help */}
            <div className="mt-2 text-center">
              <div className="text-[10px] text-muted-foreground">
                Pressione <Badge variant="outline" className="text-[8px] px-1 py-0">⌘K</Badge> para mais
              </div>
            </div>
          </div>
        </div>

        {/* Expand/Collapse Button - sempre visível */}
        <Button
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-10 w-10 p-0 rounded-full bg-gradient-to-br from-primary/90 to-medical-primary/90 hover:from-primary hover:to-medical-primary hover:scale-105 transition-all border-2 border-gray-800 dark:border-gray-700 shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          data-testid="button-toggle-quick-actions"
          title={isExpanded ? "Fechar ações rápidas" : "Abrir ações rápidas"}
        >
          <LayoutGrid className="w-5 h-5 text-white transition-transform" />
        </Button>
      </div>
    </div>
  );
}