import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// Lazy initialization to prevent crashes when API key is missing
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not configured. Please add it to your deployment configuration.');
  }
  
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  
  return openai;
}

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
      const client = getOpenAIClient();
      const prompt = `
        Você é uma IA assistente médica integrada ao WhatsApp. Analise a mensagem do paciente e determine:
        
        1. Se é uma solicitação de agendamento
        2. Se é uma pergunta clínica
        3. Forneça uma resposta apropriada baseada nas diretrizes do Ministério da Saúde
        
        Mensagem do paciente: "${message}"
        ${patientHistory ? `Histórico do paciente: ${patientHistory}` : ''}
        
        Responda em JSON com os campos: isSchedulingRequest, isClinicalQuestion, response, suggestedAction
      `;

      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI analysis error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        status: (error as any)?.status || 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to analyze WhatsApp message'
      });
      return {
        isSchedulingRequest: false,
        isClinicalQuestion: false,
        response: error instanceof Error && error.message.includes('OPENAI_API_KEY')
          ? 'Funcionalidade de IA temporariamente indisponível. Por favor, entre em contato diretamente com nosso suporte.'
          : 'Desculpe, houve um erro ao processar sua mensagem. Por favor, tente novamente.',
      };
    }
  }

  async processSchedulingRequest(message: string, availableSlots: string[]): Promise<SchedulingResponse> {
    try {
      const client = getOpenAIClient();
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

      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI scheduling error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        status: (error as any)?.status || 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to process scheduling request'
      });
      return {
        isSchedulingRequest: false,
        response: 'Desculpe, não foi possível processar sua solicitação de agendamento no momento.',
        requiresHumanIntervention: true,
      };
    }
  }

  async generateDiagnosticHypotheses(symptoms: string, patientHistory: string): Promise<DiagnosticHypothesis[]> {
    try {
      const client = getOpenAIClient();
      const prompt = `
        Como um assistente médico especializado, analise os sintomas e histórico do paciente para gerar hipóteses diagnósticas baseadas nas diretrizes do Ministério da Saúde brasileiro.
        
        Sintomas: "${symptoms}"
        Histórico do paciente: "${patientHistory}"
        
        Forneça até 5 hipóteses diagnósticas mais prováveis em JSON com:
        - hypotheses: array de objetos, cada um com:
          - condition: nome da condição
          - probability: probabilidade em porcentagem (0-100)
          - reasoning: justificativa clínica
          - ministryGuidelines: referência às diretrizes do MS quando aplicável
        
        Responda com um objeto JSON contendo o campo "hypotheses".
      `;

      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"hypotheses": []}');
      return result.hypotheses || [];
    } catch (error) {
      console.error('OpenAI diagnostic error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        status: (error as any)?.status || 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to generate diagnostic hypotheses'
      });
      throw error;
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
      const client = getOpenAIClient();
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

      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI transcription error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        status: (error as any)?.status || 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to process consultation transcription'
      });
      throw error;
    }
  }

  async answerClinicalQuestion(question: string, context?: string): Promise<string> {
    try {
      const client = getOpenAIClient();
      const prompt = `
        Você é um assistente médico especializado que responde dúvidas clínicas baseado exclusivamente nas diretrizes do Ministério da Saúde brasileiro e protocolos clínicos oficiais.
        
        Pergunta: "${question}"
        ${context ? `Contexto adicional: ${context}` : ''}
        
        Forneça uma resposta clara, precisa e baseada em evidências científicas. Sempre cite as fontes quando possível e lembre o paciente de que esta resposta não substitui uma consulta médica presencial.
      `;

      const response = await client.chat.completions.create({
        model: "gpt-4",
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
      console.error('OpenAI clinical question error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        status: (error as any)?.status || 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to process clinical question'
      });
      return `Desculpe, não foi possível processar sua pergunta médica no momento. Por favor, consulte diretamente com nossos profissionais de saúde.`;
    }
  }

  async extractExamResults(rawExamData: string, examType: string): Promise<{
    structuredResults: Record<string, any>;
    abnormalValues: Array<{ parameter: string; value: string; reference: string; status: 'high' | 'low' }>;
    summary: string;
  }> {
    try {
      const client = getOpenAIClient();
      const prompt = `
        Extraia e estruture os dados deste exame médico:
        
        Tipo de exame: ${examType}
        Dados brutos: "${rawExamData}"
        
        Forneça um JSON com:
        - structuredResults: objeto com todos os parâmetros e valores
        - abnormalValues: array com valores fora da normalidade
        - summary: resumo dos principais achados
      `;

      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI exam extraction error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        status: (error as any)?.status || 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to extract exam results'
      });
      return {
        structuredResults: {},
        abnormalValues: [],
        summary: 'Erro ao processar resultados do exame',
      };
    }
  }

  async generateClinicalAnalysis(prompt: string): Promise<string> {
    try {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "You are a medical AI assistant specialized in generating SOAP reports for Brazilian healthcare (SUS). Always respond in Portuguese and follow medical documentation standards." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI clinical analysis error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        status: (error as any)?.status || 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to generate clinical analysis'
      });
      return 'Erro ao gerar análise clínica. Tente novamente.';
    }
  }

  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      // For Node.js, we need to create a proper stream/blob for OpenAI
      // Note: This requires implementing file upload handling with multer or similar
      console.log('Transcription requested - buffer size:', audioBuffer.length, 'type:', mimeType);
      
      // TODO: Implement real Whisper API call with proper file handling
      // This would require:
      // 1. Proper file stream creation compatible with Node.js
      // 2. File validation and size limits
      // 3. Error handling for different audio formats
      
      // For now, return a placeholder indicating transcription was requested
      return 'Transcrição de áudio solicitada. Implementação do Whisper API pendente para ambiente Node.js.';
      
    } catch (error) {
      console.error('OpenAI transcription error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        status: (error as any)?.status || 'Unknown',
        message: 'Failed to transcribe audio'
      });
      return 'Erro ao transcrever áudio. Verifique o formato do arquivo.';
    }
  }

  async generatePatientSummary(patientHistory: any[], consultationNotes: any[]): Promise<string> {
    try {
      const client = getOpenAIClient();
      const historyText = patientHistory.map(h => 
        `${h.date}: ${h.condition || h.diagnosis || h.description}`
      ).join('\n');
      
      const notesText = consultationNotes.map(n => 
        `[${n.type}] ${n.note}`
      ).join('\n');

      const prompt = `
Analise o histórico médico e as anotações da consulta atual para gerar um resumo do paciente:

HISTÓRICO MÉDICO:
${historyText}

ANOTAÇÕES DA CONSULTA ATUAL:
${notesText}

Gere um resumo estruturado em português brasileiro incluindo:
1. Condições médicas relevantes
2. Evolução do quadro clínico
3. Padrões identificados
4. Recomendações para acompanhamento

Formato: texto corrido, máximo 300 palavras.
`;

      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "You are a medical AI assistant specialized in patient summary generation for Brazilian healthcare." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      return response.choices[0]?.message?.content || 'Resumo não disponível.';
    } catch (error) {
      console.error('OpenAI patient summary error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        status: (error as any)?.status || 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to generate patient summary'
      });
      return 'Erro ao gerar resumo do paciente.';
    }
  }

  async analyzeExamResults(
    examType: string,
    results: any,
    patientHistory: string
  ): Promise<{
    analysis: string;
    abnormalValues?: Array<{ parameter: string; value: string; status: 'high' | 'low'; severity: 'mild' | 'moderate' | 'severe' }>;
    recommendations: string[];
    followUpRequired: boolean;
  }> {
    try {
      const client = getOpenAIClient();
      const resultsText = typeof results === 'object' ? JSON.stringify(results, null, 2) : results.toString();
      
      const prompt = `
        Como médico especialista em análise laboratorial, analise os resultados do exame e forneça uma interpretação clínica completa.
        
        Tipo de exame: ${examType}
        Resultados: ${resultsText}
        Histórico do paciente: ${patientHistory}
        
        Forneça uma análise em JSON com:
        - analysis: interpretação detalhada dos resultados
        - abnormalValues: array de valores alterados com parameter, value, status (high/low), severity (mild/moderate/severe)
        - recommendations: array de recomendações clínicas
        - followUpRequired: boolean indicando se requer acompanhamento
        
        Base sua análise nas diretrizes do Ministério da Saúde brasileiro e valores de referência padrão.
      `;

      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2, // Very low temperature for consistent medical analysis
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI exam analysis error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        status: (error as any)?.status || 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to analyze exam results'
      });
      return {
        analysis: 'Não foi possível analisar os resultados do exame automaticamente.',
        recommendations: ['Consulte um médico para interpretação dos resultados'],
        followUpRequired: true
      };
    }
  }
}

export const openAIService = new OpenAIService();
