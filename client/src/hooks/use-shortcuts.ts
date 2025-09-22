import { useEffect, useState } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';

export interface ShortcutAction {
  id: string;
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
  enabled?: boolean;
}

export function useShortcuts(actions: ShortcutAction[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchedAction = actions.find(action => {
        if (!action.enabled && action.enabled !== undefined) return false;
        
        return (
          event.key.toLowerCase() === action.key.toLowerCase() &&
          !!event.ctrlKey === !!action.ctrlKey &&
          !!event.shiftKey === !!action.shiftKey &&
          !!event.altKey === !!action.altKey
        );
      });

      if (matchedAction) {
        event.preventDefault();
        event.stopPropagation();
        matchedAction.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}

// Global shortcuts hook for command palette
export function useGlobalShortcuts() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const shortcuts: ShortcutAction[] = [
    {
      id: 'open-command-palette',
      key: 'k',
      ctrlKey: true,
      description: 'Abrir paleta de comandos',
      action: () => setIsCommandPaletteOpen(true)
    },
    {
      id: 'open-command-palette-alt',
      key: ' ',
      ctrlKey: true,
      description: 'Abrir paleta de comandos (alternativo)',
      action: () => setIsCommandPaletteOpen(true)
    }
  ];

  useShortcuts(shortcuts);

  return {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen
  };
}

// Global application shortcuts
export function useApplicationShortcuts() {
  const shortcuts: ShortcutAction[] = [
    // Navigation shortcuts
    {
      id: 'nav-dashboard',
      key: 'd',
      ctrlKey: true,
      description: 'Ir para dashboard',
      action: () => {
        window.location.href = '/';
      }
    },
    {
      id: 'nav-patients',
      key: 'p',
      ctrlKey: true,
      description: 'Ir para pacientes',
      action: () => {
        window.location.href = '/patients';
      }
    },
    {
      id: 'nav-schedule',
      key: 'a',
      ctrlKey: true,
      description: 'Ir para agenda',
      action: () => {
        window.location.href = '/schedule';
      }
    },
    {
      id: 'nav-records',
      key: 'h',
      ctrlKey: true,
      description: 'Ir para prontuários',
      action: () => {
        window.location.href = '/records';
      }
    },
    {
      id: 'nav-whatsapp',
      key: 'w',
      ctrlKey: true,
      description: 'Ir para WhatsApp',
      action: () => {
        window.location.href = '/whatsapp';
      }
    },

    // Medical functions
    {
      id: 'ai-analysis',
      key: 'i',
      ctrlKey: true,
      description: 'Análise de sintomas IA',
      action: () => {
        const event = new CustomEvent('open-ai-analysis');
        window.dispatchEvent(event);
      }
    },
    {
      id: 'new-prescription',
      key: 'r',
      ctrlKey: true,
      description: 'Nova receita',
      action: () => {
        const event = new CustomEvent('create-prescription');
        window.dispatchEvent(event);
      }
    },
    {
      id: 'exam-request',
      key: 'e',
      ctrlKey: true,
      description: 'Solicitar exames',
      action: () => {
        const event = new CustomEvent('create-exam-request');
        window.dispatchEvent(event);
      }
    },
    {
      id: 'medical-certificate',
      key: 't',
      ctrlKey: true,
      description: 'Atestado médico',
      action: () => {
        const event = new CustomEvent('create-certificate');
        window.dispatchEvent(event);
      }
    },

    // Digital signature
    {
      id: 'sign-prescription',
      key: 's',
      ctrlKey: true,
      description: 'Assinar receita',
      action: () => {
        const event = new CustomEvent('sign-prescription');
        window.dispatchEvent(event);
      }
    },

    // PDF actions  
    {
      id: 'download-prescription-pdf',
      key: 'r',
      ctrlKey: true,
      shiftKey: true,
      description: 'Baixar receita PDF',
      action: () => {
        const event = new CustomEvent('download-prescription-pdf');
        window.dispatchEvent(event);
      }
    },
    {
      id: 'download-exam-pdf',
      key: 'e',
      ctrlKey: true,
      shiftKey: true,
      description: 'Baixar exames PDF',
      action: () => {
        const event = new CustomEvent('download-exam-pdf');
        window.dispatchEvent(event);
      }
    },

    // TMC system
    {
      id: 'tmc-transfer',
      key: 'm',
      ctrlKey: true,
      description: 'Transferir TMC',
      action: () => {
        const event = new CustomEvent('tmc-transfer');
        window.dispatchEvent(event);
      }
    },

    // Communication
    {
      id: 'video-call',
      key: 'v',
      ctrlKey: true,
      description: 'Chamada de vídeo',
      action: () => {
        const event = new CustomEvent('start-video-call');
        window.dispatchEvent(event);
      }
    },

    // Quick actions
    {
      id: 'quick-search',
      key: '/',
      ctrlKey: true,
      description: 'Busca rápida',
      action: () => {
        const event = new CustomEvent('quick-search');
        window.dispatchEvent(event);
      }
    },
    {
      id: 'emergency-protocol',
      key: '1',
      ctrlKey: true,
      shiftKey: true,
      description: 'Protocolo de emergência',
      action: () => {
        const event = new CustomEvent('emergency-protocol');
        window.dispatchEvent(event);
      }
    }
  ];

  // Filter shortcuts to avoid interfering with inputs
  const filteredShortcuts = shortcuts.map(shortcut => ({
    ...shortcut,
    enabled: true,
    action: () => {
      // Don't trigger shortcuts when typing in inputs/textareas
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.hasAttribute('contenteditable')
      )) {
        return;
      }
      
      shortcut.action();
    }
  }));

  useShortcuts(filteredShortcuts);
}

// Hook for handling command palette events
export function useCommandEvents() {
  useEffect(() => {
    // AI Analysis
    const handleAiAnalysis = () => {
      const tryClick = () => {
        const button = document.querySelector('[data-testid="button-analyze-symptoms"]') as HTMLButtonElement;
        if (button && button.offsetParent !== null) { // Check if element is visible
          button.click();
          return true;
        }
        return false;
      };

      // Try immediately first
      if (!tryClick()) {
        // If not found, wait a bit and try again
        setTimeout(() => {
          if (!tryClick()) {
            console.warn('AI Analysis button not found or not visible');
            // Fallback: Show a simple alert or toast
            alert('Para usar a Análise de IA, vá para o Dashboard e clique em "Analisar Novos Sintomas" no card do Assistente Clínico IA.');
          }
        }, 100);
      }
    };

    // Create Prescription
    const handleCreatePrescription = () => {
      // Focus on prescription textarea if available
      const prescriptionInput = document.querySelector('[data-testid="textarea-prescription"]') as HTMLTextAreaElement;
      if (prescriptionInput) {
        prescriptionInput.focus();
        prescriptionInput.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // Create Exam Request
    const handleCreateExamRequest = () => {
      // Focus on diagnosis/exam request field
      const examInput = document.querySelector('[data-testid="textarea-diagnosis"]') as HTMLTextAreaElement;
      if (examInput) {
        examInput.focus();
        examInput.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // Download Prescription PDF
    const handleDownloadPrescriptionPdf = () => {
      const pdfButton = document.querySelector('[data-testid="button-download-prescription-pdf"]') as HTMLButtonElement;
      if (pdfButton) {
        pdfButton.click();
      }
    };

    // Download Exam PDF
    const handleDownloadExamPdf = () => {
      const examPdfButton = document.querySelector('[data-testid="button-download-exam-pdf"]') as HTMLButtonElement;
      if (examPdfButton) {
        examPdfButton.click();
      }
    };

    // Sign Prescription
    const handleSignPrescription = () => {
      const signButton = document.querySelector('[data-testid="button-sign-prescription"]') as HTMLButtonElement;
      if (signButton) {
        signButton.click();
      }
    };

    // TMC Transfer
    const handleTmcTransfer = () => {
      const tmcButton = document.querySelector('[data-testid="button-tmc-transfer"]') as HTMLButtonElement;
      if (tmcButton) {
        tmcButton.click();
      }
    };

    // View TMC Balance
    const handleViewTmcBalance = () => {
      const balanceSection = document.querySelector('[data-testid="tmc-balance-display"]');
      if (balanceSection) {
        balanceSection.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // WhatsApp Integration
    const handleOpenWhatsapp = () => {
      const whatsappButton = document.querySelector('[data-testid="button-whatsapp"]') as HTMLButtonElement;
      if (whatsappButton) {
        whatsappButton.click();
      }
    };

    // Quick Search
    const handleQuickSearch = () => {
      const searchInput = document.querySelector('[data-testid="input-search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    };

    // Emergency Protocol
    const handleEmergencyProtocol = () => {
      // Show emergency alert
      alert('🚨 PROTOCOLO DE EMERGÊNCIA ATIVADO\n\nContatos de emergência:\n• SAMU: 192\n• Bombeiros: 193\n• Polícia: 190');
    };

    // Add event listeners
    window.addEventListener('open-ai-analysis', handleAiAnalysis);
    window.addEventListener('create-prescription', handleCreatePrescription);
    window.addEventListener('create-exam-request', handleCreateExamRequest);
    window.addEventListener('download-prescription-pdf', handleDownloadPrescriptionPdf);
    window.addEventListener('download-exam-pdf', handleDownloadExamPdf);
    window.addEventListener('sign-prescription', handleSignPrescription);
    window.addEventListener('tmc-transfer', handleTmcTransfer);
    window.addEventListener('view-tmc-balance', handleViewTmcBalance);
    window.addEventListener('open-whatsapp', handleOpenWhatsapp);
    window.addEventListener('quick-search', handleQuickSearch);
    window.addEventListener('emergency-protocol', handleEmergencyProtocol);

    return () => {
      // Clean up event listeners
      window.removeEventListener('open-ai-analysis', handleAiAnalysis);
      window.removeEventListener('create-prescription', handleCreatePrescription);
      window.removeEventListener('create-exam-request', handleCreateExamRequest);
      window.removeEventListener('download-prescription-pdf', handleDownloadPrescriptionPdf);
      window.removeEventListener('download-exam-pdf', handleDownloadExamPdf);
      window.removeEventListener('sign-prescription', handleSignPrescription);
      window.removeEventListener('tmc-transfer', handleTmcTransfer);
      window.removeEventListener('view-tmc-balance', handleViewTmcBalance);
      window.removeEventListener('open-whatsapp', handleOpenWhatsapp);
      window.removeEventListener('quick-search', handleQuickSearch);
      window.removeEventListener('emergency-protocol', handleEmergencyProtocol);
    };
  }, []);
}