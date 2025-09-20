export interface WhatsAppMessage {
  from: string;
  to: string;
  text: string;
  timestamp: number;
  messageId: string;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text: {
            body: string;
          };
          type: string;
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private webhookVerifyToken: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          text: {
            body: message,
          },
        }),
      });

      const result = await response.json();
      console.log('WhatsApp API Response:', result);
      
      return response.ok;
    } catch (error) {
      console.error('WhatsApp send message error:', error);
      return false;
    }
  }

  async sendTemplateMessage(to: string, templateName: string, parameters: string[]): Promise<boolean> {
    try {
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'pt_BR',
            },
            components: [
              {
                type: 'body',
                parameters: parameters.map(param => ({
                  type: 'text',
                  text: param,
                })),
              },
            ],
          },
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('WhatsApp send template error:', error);
      return false;
    }
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      console.log('WhatsApp webhook verified successfully');
      return challenge;
    }
    console.log('WhatsApp webhook verification failed');
    return null;
  }

  parseWebhookPayload(payload: WhatsAppWebhookPayload): WhatsAppMessage[] {
    const messages: WhatsAppMessage[] = [];
    
    try {
      if (payload.object === 'whatsapp_business_account') {
        payload.entry.forEach(entry => {
          entry.changes.forEach(change => {
            if (change.field === 'messages' && change.value.messages) {
              change.value.messages.forEach(message => {
                if (message.type === 'text') {
                  messages.push({
                    from: message.from,
                    to: change.value.metadata.display_phone_number,
                    text: message.text.body,
                    timestamp: parseInt(message.timestamp),
                    messageId: message.id,
                  });
                }
              });
            }
          });
        });
      }
    } catch (error) {
      console.error('Error parsing WhatsApp webhook payload:', error);
    }

    return messages;
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('WhatsApp mark as read error:', error);
      return false;
    }
  }

  async sendAppointmentConfirmation(to: string, patientName: string, date: string, time: string): Promise<boolean> {
    const message = `✅ Consulta agendada com sucesso!

📅 Data: ${date}
🕐 Horário: ${time}
👤 Paciente: ${patientName}

Sua consulta foi confirmada. Você receberá um lembrete 24 horas antes.

Para cancelar ou reagendar, responda a esta mensagem ou ligue para nossa clínica.

🏥 MedIA Pro - Sistema Médico Inteligente`;

    return await this.sendMessage(to, message);
  }

  async sendClinicalResponse(to: string, question: string, response: string): Promise<boolean> {
    const message = `💡 Resposta à sua dúvida clínica:

❓ Sua pergunta: "${question}"

📋 Resposta baseada nas diretrizes do Ministério da Saúde:
${response}

⚠️ IMPORTANTE: Esta resposta é informativa e não substitui uma consulta médica presencial. Para um diagnóstico preciso e tratamento adequado, agende uma consulta.

🏥 MedIA Pro - Sistema Médico Inteligente`;

    return await this.sendMessage(to, message);
  }
}

export const whatsAppService = new WhatsAppService();
