import { useState, useEffect } from 'react';
import { useWebSocket } from './use-websocket';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

export interface Notification {
  id: string;
  type: 'appointment' | 'whatsapp' | 'exam_result' | 'emergency' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  data?: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { messages: wsMessages, isConnected } = useWebSocket();
  const { toast } = useToast();

  // Process incoming WebSocket messages into notifications
  useEffect(() => {
    const latestMessage = wsMessages[wsMessages.length - 1];
    if (!latestMessage) return;

    const notification = processWebSocketMessage(latestMessage);
    if (notification) {
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep latest 50
      
      // Show toast for high/critical priority notifications
      if (notification.priority === 'high' || notification.priority === 'critical') {
        toast({
          title: notification.title,
          description: notification.message,
          variant: notification.priority === 'critical' ? 'destructive' : 'default',
        });
        
        // Play notification sound for critical alerts
        if (notification.priority === 'critical') {
          playNotificationSound();
        }
      }

      // Trigger cache invalidation for related data
      invalidateRelatedQueries(notification.type);
    }
  }, [wsMessages, toast]);

  const processWebSocketMessage = (message: any): Notification | null => {
    const timestamp = new Date();
    
    switch (message.type) {
      case 'whatsapp_message':
        return {
          id: `whatsapp-${Date.now()}`,
          type: 'whatsapp',
          title: 'Nova Mensagem WhatsApp',
          message: `Mensagem de ${message.data.patientName || 'paciente'}`,
          priority: 'medium',
          timestamp,
          read: false,
          actionUrl: '/dashboard',
          data: message.data
        };

      case 'appointment_update':
        return {
          id: `appointment-${Date.now()}`,
          type: 'appointment',
          title: 'Consulta Atualizada',
          message: message.data.message || 'Uma consulta foi atualizada',
          priority: message.data.urgent ? 'high' : 'medium',
          timestamp,
          read: false,
          actionUrl: '/schedule',
          data: message.data
        };

      case 'exam_result':
        return {
          id: `exam-${Date.now()}`,
          type: 'exam_result',
          title: 'Novo Resultado de Exame',
          message: `Resultado disponível: ${message.data.examType}`,
          priority: message.data.abnormalValues?.length > 0 ? 'high' : 'medium',
          timestamp,
          read: false,
          actionUrl: '/dashboard',
          data: message.data
        };

      case 'emergency_alert':
        return {
          id: `emergency-${Date.now()}`,
          type: 'emergency',
          title: 'ALERTA DE EMERGÊNCIA',
          message: message.data.message || 'Situação de emergência detectada',
          priority: 'critical',
          timestamp,
          read: false,
          actionUrl: '/dashboard',
          data: message.data
        };

      case 'system_notification':
        return {
          id: `system-${Date.now()}`,
          type: 'system',
          title: message.data.title || 'Notificação do Sistema',
          message: message.data.message,
          priority: message.data.priority || 'low',
          timestamp,
          read: false,
          data: message.data
        };

      default:
        return null;
    }
  };

  const invalidateRelatedQueries = (type: string) => {
    switch (type) {
      case 'whatsapp':
        queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/messages/recent'] });
        break;
      case 'appointment':
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        break;
      case 'exam_result':
        queryClient.invalidateQueries({ queryKey: ['/api/exam-results/recent'] });
        break;
      default:
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    }
  };

  const playNotificationSound = () => {
    // Create a simple notification beep
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications
  };
}