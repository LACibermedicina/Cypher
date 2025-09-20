import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DiagnosticHypothesis {
  condition: string;
  probability: number;
  reasoning: string;
  ministryGuidelines?: string;
}

export interface SchedulingRequest {
  patientMessage: string;
  patientName?: string;
  requestedDate?: string;
  requestedTime?: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface SchedulingResponse {
  isSchedulingRequest: boolean;
  suggestedAppointment?: {
    date: string;
    time: string;
    type: string;
  };
  response: string;
  requiresHumanIntervention: boolean;
}

export class OpenAIService {
  async analyzeWhatsappMessage(message: string, patientHistory?: string): Promise<{
    isSchedulingRequest: boolean;
    isClinicalQuestion: boolean;
    response: string;
    suggestedAction?: string;
  }> {
    try {
      const prompt = `
        Você é uma IA assistente médica integrada ao WhatsApp. Analise a mensagem do paciente e determine:
        
        1. Se é uma solicitação de agendamento
        2. Se é uma pergunta clínica
        3. Forneça uma resposta apropriada baseada nas diretrizes do Ministério da Saúde
        
        Mensagem do paciente: "${message}"
        ${patientHistory ? `Histórico do paciente: ${patientHistory}` : ''}
        
        Responda em JSON com os campos: isSchedulingRequest, isClinicalQuestion, response, suggestedAction
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      return {
        isSchedulingRequest: false,
        isClinicalQuestion: false,
        response: 'Desculpe, houve um erro ao processar sua mensagem. Por favor, tente novamente.',
      };
    }
  }

  async processSchedulingRequest(message: string, availableSlots: string[]): Promise<SchedulingResponse> {
    try {
      const prompt = `
        Você é um assistente de agendamento médico. Analise a solicitação de agendamento do paciente e sugira o melhor horário disponível.
        
        Mensagem do paciente: "${message}"
        Horários disponíveis: ${availableSlots.join(', ')}
        
        Forneça uma resposta em JSON com:
        - isSchedulingRequest: boolean
        - suggestedAppointment: { date, time, type }
        - response: string (resposta para o paciente)
        - requiresHumanIntervention: boolean
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI scheduling error:', error);
      return {
        isSchedulingRequest: false,
        response: 'Desculpe, não foi possível processar sua solicitação de agendamento no momento.',
        requiresHumanIntervention: true,
      };
    }
  }

  async generateDiagnosticHypotheses(symptoms: string, patientHistory: string): Promise<DiagnosticHypothesis[]> {
    try {
      const prompt = `
        Como um assistente médico especializado, analise os sintomas e histórico do paciente para gerar hipóteses diagnósticas baseadas nas diretrizes do Ministério da Saúde brasileiro.
        
        Sintomas: "${symptoms}"
        Histórico do paciente: "${patientHistory}"
        
        Forneça até 5 hipóteses diagnósticas mais prováveis em JSON, cada uma com:
        - condition: nome da condição
        - probability: probabilidade em porcentagem (0-100)
        - reasoning: justificativa clínica
        - ministryGuidelines: referência às diretrizes do MS quando aplicável
        
        Responda apenas com um array JSON de objetos.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"hypotheses": []}');
      return result.hypotheses || [];
    } catch (error) {
      console.error('OpenAI diagnostic error:', error);
      return [];
    }
  }

  async transcribeAndSummarizeConsultation(audioTranscript: string): Promise<{
    summary: string;
    keyPoints: string[];
    diagnosis?: string;
    treatment?: string;
    followUp?: string;
  }> {
    try {
      const prompt = `
        Analise esta transcrição de consulta médica e forneça um resumo estruturado:
        
        Transcrição: "${audioTranscript}"
        
        Forneça um resumo em JSON com:
        - summary: resumo geral da consulta
        - keyPoints: array com pontos-chave discutidos
        - diagnosis: diagnóstico mencionado (se houver)
        - treatment: tratamento prescrito (se houver)
        - followUp: orientações de acompanhamento (se houver)
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI transcription error:', error);
      return {
        summary: 'Erro ao processar transcrição',
        keyPoints: [],
      };
    }
  }

  async answerClinicalQuestion(question: string, context?: string): Promise<string> {
    try {
      const prompt = `
        Você é um assistente médico especializado que responde dúvidas clínicas baseado exclusivamente nas diretrizes do Ministério da Saúde brasileiro e protocolos clínicos oficiais.
        
        Pergunta: "${question}"
        ${context ? `Contexto adicional: ${context}` : ''}
        
        Forneça uma resposta clara, precisa e baseada em evidências científicas. Sempre cite as fontes quando possível e lembre o paciente de que esta resposta não substitui uma consulta médica presencial.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "Você é um assistente médico que fornece informações baseadas nas diretrizes do Ministério da Saúde do Brasil. Sempre seja preciso e responsável em suas respostas."
          },
          { role: "user", content: prompt }
        ],
      });

      return response.choices[0].message.content || 'Desculpe, não foi possível processar sua pergunta no momento.';
    } catch (error) {
      console.error('OpenAI clinical question error:', error);
      return 'Desculpe, houve um erro ao processar sua pergunta. Por favor, consulte diretamente seu médico.';
    }
  }

  async extractExamResults(rawExamData: string, examType: string): Promise<{
    structuredResults: Record<string, any>;
    abnormalValues: Array<{ parameter: string; value: string; reference: string; status: 'high' | 'low' }>;
    summary: string;
  }> {
    try {
      const prompt = `
        Extraia e estruture os dados deste exame médico:
        
        Tipo de exame: ${examType}
        Dados brutos: "${rawExamData}"
        
        Forneça um JSON com:
        - structuredResults: objeto com todos os parâmetros e valores
        - abnormalValues: array com valores fora da normalidade
        - summary: resumo dos principais achados
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI exam extraction error:', error);
      return {
        structuredResults: {},
        abnormalValues: [],
        summary: 'Erro ao processar resultados do exame',
      };
    }
  }
}

export const openAIService = new OpenAIService();
