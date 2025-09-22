import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Users, 
  FileText, 
  MessageSquare, 
  Brain, 
  Activity, 
  Shield, 
  Settings, 
  Phone, 
  Printer, 
  Download, 
  Search,
  Stethoscope,
  PillBottle,
  FileImage,
  UserCheck,
  CreditCard,
  BarChart3,
  Zap
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  requiresAuth?: boolean;
  roles?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export default function CommandPalette({ isOpen, onClose, userRole = 'visitor' }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setLocation] = useLocation();

  // Command definitions with shortcuts and actions
  const allCommands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Dashboard Principal',
      description: 'Ir para a página principal do sistema',
      category: 'Navegação',
      icon: <BarChart3 className="w-4 h-4" />,
      shortcut: 'Ctrl+D',
      action: () => {
        setLocation('/');
        onClose();
      }
    },
    {
      id: 'nav-patients',
      title: 'Gerenciar Pacientes',
      description: 'Lista e cadastro de pacientes',
      category: 'Navegação',
      icon: <Users className="w-4 h-4" />,
      shortcut: 'Ctrl+P',
      action: () => {
        setLocation('/patients');
        onClose();
      },
      roles: ['doctor', 'admin']
    },
    {
      id: 'nav-appointments',
      title: 'Agenda de Consultas',
      description: 'Visualizar e agendar consultas',
      category: 'Navegação',
      icon: <Calendar className="w-4 h-4" />,
      shortcut: 'Ctrl+A',
      action: () => {
        setLocation('/schedule');
        onClose();
      }
    },
    {
      id: 'nav-records',
      title: 'Prontuários Médicos',
      description: 'Visualizar prontuários e histórico médico',
      category: 'Navegação',
      icon: <FileText className="w-4 h-4" />,
      shortcut: 'Ctrl+H',
      action: () => {
        setLocation('/records');
        onClose();
      },
      roles: ['doctor', 'admin', 'patient']
    },
    {
      id: 'nav-whatsapp',
      title: 'WhatsApp Integration',
      description: 'Acessar mensagens do WhatsApp',
      category: 'Navegação',
      icon: <MessageSquare className="w-4 h-4" />,
      shortcut: 'Ctrl+W',
      action: () => {
        setLocation('/whatsapp');
        onClose();
      },
      roles: ['doctor', 'admin']
    },
    {
      id: 'nav-admin',
      title: 'Administração',
      description: 'Painel administrativo do sistema',
      category: 'Navegação',
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        setLocation('/admin');
        onClose();
      },
      roles: ['admin']
    },
    
    // Medical Functions
    {
      id: 'medical-ai-analysis',
      title: 'Análise de Sintomas IA',
      description: 'Analisar sintomas com inteligência artificial',
      category: 'Médico',
      icon: <Brain className="w-4 h-4" />,
      shortcut: 'Ctrl+I',
      action: () => {
        // Trigger AI analysis modal
        const event = new CustomEvent('open-ai-analysis');
        window.dispatchEvent(event);
        onClose();
      },
      roles: ['doctor', 'admin']
    },
    {
      id: 'medical-prescription',
      title: 'Nova Receita Médica',
      description: 'Criar nova receita médica',
      category: 'Médico',
      icon: <PillBottle className="w-4 h-4" />,
      shortcut: 'Ctrl+R',
      action: () => {
        const event = new CustomEvent('create-prescription');
        window.dispatchEvent(event);
        onClose();
      },
      roles: ['doctor', 'admin']
    },
    {
      id: 'medical-exam-request',
      title: 'Solicitar Exames',
      description: 'Criar solicitação de exames médicos',
      category: 'Médico',
      icon: <FileImage className="w-4 h-4" />,
      shortcut: 'Ctrl+E',
      action: () => {
        const event = new CustomEvent('create-exam-request');
        window.dispatchEvent(event);
        onClose();
      },
      roles: ['doctor', 'admin']
    },
    {
      id: 'medical-certificate',
      title: 'Atestado Médico',
      description: 'Gerar atestado médico',
      category: 'Médico',
      icon: <FileText className="w-4 h-4" />,
      shortcut: 'Ctrl+T',
      action: () => {
        const event = new CustomEvent('create-certificate');
        window.dispatchEvent(event);
        onClose();
      },
      roles: ['doctor', 'admin']
    },

    // Communication
    {
      id: 'comm-whatsapp',
      title: 'WhatsApp Integration',
      description: 'Enviar mensagem via WhatsApp',
      category: 'Comunicação',
      icon: <MessageSquare className="w-4 h-4" />,
      shortcut: 'Ctrl+W',
      action: () => {
        const event = new CustomEvent('open-whatsapp');
        window.dispatchEvent(event);
        onClose();
      },
      roles: ['doctor', 'admin']
    },
    {
      id: 'comm-video-call',
      title: 'Chamada de Vídeo',
      description: 'Iniciar videoconsulta',
      category: 'Comunicação',
      icon: <Phone className="w-4 h-4" />,
      shortcut: 'Ctrl+V',
      action: () => {
        const event = new CustomEvent('start-video-call');
        window.dispatchEvent(event);
        onClose();
      },
      roles: ['doctor', 'admin', 'patient']
    },

    // Documents & Reports
    {
      id: 'doc-prescription-pdf',
      title: 'Baixar Receita PDF',
      description: 'Gerar e baixar receita em PDF',
      category: 'Documentos',
      icon: <Download className="w-4 h-4" />,
      shortcut: 'Ctrl+Shift+R',
      action: () => {
        const event = new CustomEvent('download-prescription-pdf');
        window.dispatchEvent(event);
        onClose();
      },
      roles: ['doctor', 'admin']
    },
    {
      id: 'doc-exam-pdf',
      title: 'Baixar Solicitação PDF',
      description: 'Gerar solicitação de exames em PDF',
      category: 'Documentos',
      icon: <Printer className="w-4 h-4" />,
      shortcut: 'Ctrl+Shift+E',
      action: () => {
        const event = new CustomEvent('download-exam-pdf');
        window.dispatchEvent(event);
        onClose();
      },
      roles: ['doctor', 'admin']
    },

    // Digital Security
    {
      id: 'security-sign-prescription',
      title: 'Assinar Receita Digitalmente',
      description: 'Aplicar assinatura digital ICP-Brasil',
      category: 'Segurança',
      icon: <Shield className="w-4 h-4" />,
      shortcut: 'Ctrl+S',
      action: () => {
        const event = new CustomEvent('sign-prescription');
        window.dispatchEvent(event);
        onClose();
      },
      roles: ['doctor', 'admin']
    },

    // TMC System
    {
      id: 'tmc-transfer',
      title: 'Transferir TMC',
      description: 'Transferir créditos TMC entre usuários',
      category: 'TMC',
      icon: <CreditCard className="w-4 h-4" />,
      shortcut: 'Ctrl+M',
      action: () => {
        const event = new CustomEvent('tmc-transfer');
        window.dispatchEvent(event);
        onClose();
      },
      requiresAuth: true
    },
    {
      id: 'tmc-balance',
      title: 'Ver Saldo TMC',
      description: 'Visualizar saldo de créditos TMC',
      category: 'TMC',
      icon: <Activity className="w-4 h-4" />,
      action: () => {
        const event = new CustomEvent('view-tmc-balance');
        window.dispatchEvent(event);
        onClose();
      },
      requiresAuth: true
    },

    // Admin Functions
    {
      id: 'admin-settings',
      title: 'Configurações do Sistema',
      description: 'Acessar configurações administrativas',
      category: 'Administração',
      icon: <Settings className="w-4 h-4" />,
      shortcut: 'Ctrl+,',
      action: () => {
        const event = new CustomEvent('open-admin-settings');
        window.dispatchEvent(event);
        onClose();
      },
      roles: ['admin']
    },
    {
      id: 'admin-user-management',
      title: 'Gerenciar Usuários',
      description: 'Cadastrar e gerenciar usuários',
      category: 'Administração',
      icon: <UserCheck className="w-4 h-4" />,
      action: () => {
        const event = new CustomEvent('manage-users');
        window.dispatchEvent(event);
        onClose();
      },
      roles: ['admin']
    },

    // Quick Actions
    {
      id: 'quick-search',
      title: 'Busca Rápida',
      description: 'Buscar pacientes, consultas ou documentos',
      category: 'Ações Rápidas',
      icon: <Search className="w-4 h-4" />,
      shortcut: 'Ctrl+/',
      action: () => {
        const event = new CustomEvent('quick-search');
        window.dispatchEvent(event);
        onClose();
      }
    },
    {
      id: 'quick-emergency',
      title: 'Protocolo de Emergência',
      description: 'Ativar protocolo de atendimento emergencial',
      category: 'Ações Rápidas',
      icon: <Zap className="w-4 h-4" />,
      shortcut: 'Ctrl+!',
      action: () => {
        const event = new CustomEvent('emergency-protocol');
        window.dispatchEvent(event);
        onClose();
      },
      roles: ['doctor', 'admin']
    }
  ];

  // Filter commands based on search query and user role
  const filteredCommands = allCommands.filter(cmd => {
    const matchesSearch = cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cmd.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cmd.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const hasPermission = !cmd.roles || cmd.roles.includes(userRole) || userRole === 'admin';
    
    return matchesSearch && hasPermission;
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  // Reset search when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 overflow-hidden" data-testid="command-palette">
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite para buscar comandos..."
                className="pl-10"
                data-testid="command-search-input"
                autoFocus
              />
            </div>
          </div>

          {/* Commands List */}
          <div className="flex-1 overflow-y-auto max-h-96 p-2">
            {Object.entries(groupedCommands).map(([category, commands]) => (
              <div key={category} className="mb-4">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {category}
                </div>
                <div className="space-y-1">
                  {commands.map((cmd, index) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    return (
                      <div
                        key={cmd.id}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                          globalIndex === selectedIndex
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                        onClick={cmd.action}
                        data-testid={`command-item-${cmd.id}`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            {cmd.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{cmd.title}</div>
                            <div className={`text-sm truncate ${
                              globalIndex === selectedIndex ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            }`}>
                              {cmd.description}
                            </div>
                          </div>
                        </div>
                        {cmd.shortcut && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs font-mono ${
                              globalIndex === selectedIndex ? 'bg-primary-foreground/20' : ''
                            }`}
                          >
                            {cmd.shortcut}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {filteredCommands.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="w-8 h-8 text-muted-foreground mb-2" />
                <div className="text-sm text-muted-foreground">
                  Nenhum comando encontrado para "{searchQuery}"
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-3 text-xs text-muted-foreground flex items-center justify-between">
            <div>
              Use ↑↓ para navegar, Enter para selecionar, Esc para fechar
            </div>
            <div>
              {filteredCommands.length} comando{filteredCommands.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}