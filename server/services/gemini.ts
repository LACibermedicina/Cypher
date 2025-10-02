import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy initialization to prevent crashes when API key is missing
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not configured. Please add it to your deployment configuration.');
  }
  
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  
  return genAI;
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

async function generateWithJSON(prompt: string): Promise<any> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      responseMimeType: "application/json"
    }
  });
  
  const result = await model.generateContent(prompt);
  const response = result.response.text();
  return JSON.parse(response);
}

async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp"
  });
  
  // Include system instruction in the prompt if provided
  const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
  
  const result = await model.generateContent(fullPrompt);
  return result.response.text();
}

export class GeminiService {
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

      return await generateWithJSON(prompt);
    } catch (error) {
      console.error('Gemini analysis error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to analyze WhatsApp message'
      });
      return {
        isSchedulingRequest: false,
        isClinicalQuestion: false,
        response: error instanceof Error && error.message.includes('GEMINI_API_KEY')
          ? 'Funcionalidade de IA temporariamente indisponível. Por favor, entre em contato diretamente com nosso suporte.'
          : 'Desculpe, houve um erro ao processar sua mensagem. Por favor, tente novamente.',
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

      return await generateWithJSON(prompt);
    } catch (error) {
      console.error('Gemini scheduling error:', {
        name: error instanceof Error ? error.name : 'Unknown',
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

      const result = await generateWithJSON(prompt);
      return result.hypotheses || [];
    } catch (error) {
      console.error('Gemini diagnostic error:', {
        name: error instanceof Error ? error.name : 'Unknown',
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

      return await generateWithJSON(prompt);
    } catch (error) {
      console.error('Gemini transcription error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to process consultation transcription'
      });
      throw error;
    }
  }

  async answerClinicalQuestion(question: string, context?: string): Promise<string> {
    try {
      const prompt = `
        Pergunta: "${question}"
        ${context ? `Contexto adicional: ${context}` : ''}
        
        Forneça uma resposta clara, precisa e baseada em evidências científicas. Sempre cite as fontes quando possível e lembre o paciente de que esta resposta não substitui uma consulta médica presencial.
      `;

      const systemInstruction = "Você é um assistente médico especializado que responde dúvidas clínicas baseado exclusivamente nas diretrizes do Ministério da Saúde brasileiro e protocolos clínicos oficiais. Sempre seja preciso e responsável em suas respostas.";

      return await generateText(prompt, systemInstruction);
    } catch (error) {
      console.error('Gemini clinical question error:', {
        name: error instanceof Error ? error.name : 'Unknown',
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
      const prompt = `
        Extraia e estruture os dados deste exame médico:
        
        Tipo de exame: ${examType}
        Dados brutos: "${rawExamData}"
        
        Forneça um JSON com:
        - structuredResults: objeto com todos os parâmetros e valores
        - abnormalValues: array com valores fora da normalidade
        - summary: resumo dos principais achados
      `;

      return await generateWithJSON(prompt);
    } catch (error) {
      console.error('Gemini exam extraction error:', {
        name: error instanceof Error ? error.name : 'Unknown',
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
      const systemInstruction = "You are a medical AI assistant specialized in generating SOAP reports for Brazilian healthcare (SUS). Always respond in Portuguese and follow medical documentation standards.";
      
      return await generateText(prompt, systemInstruction);
    } catch (error) {
      console.error('Gemini clinical analysis error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to generate clinical analysis'
      });
      return 'Erro ao gerar análise clínica. Tente novamente.';
    }
  }

  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      console.log('Transcription requested - buffer size:', audioBuffer.length, 'type:', mimeType);
      
      // Gemini doesn't have built-in audio transcription like Whisper
      // This would require a separate transcription service
      return 'Transcrição de áudio solicitada. Implementação de transcrição pendente.';
      
    } catch (error) {
      console.error('Gemini transcription error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: 'Failed to transcribe audio'
      });
      return 'Erro ao transcrever áudio. Verifique o formato do arquivo.';
    }
  }

  async generatePatientSummary(patientHistory: any[], consultationNotes: any[]): Promise<string> {
    try {
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

      const systemInstruction = "You are a medical AI assistant specialized in patient summary generation for Brazilian healthcare.";
      
      return await generateText(prompt, systemInstruction);
    } catch (error) {
      console.error('Gemini patient summary error:', {
        name: error instanceof Error ? error.name : 'Unknown',
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

      return await generateWithJSON(prompt);
    } catch (error) {
      console.error('Gemini exam analysis error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to analyze exam results'
      });
      return {
        analysis: 'Não foi possível analisar os resultados do exame automaticamente.',
        recommendations: ['Consulte um médico para interpretação dos resultados'],
        followUpRequired: true
      };
    }
  }

  async analyzeDrugInteractions(medications: string[]): Promise<{
    hasInteractions: boolean;
    interactions: Array<{
      drug1: string;
      drug2: string;
      severity: 'mild' | 'moderate' | 'severe';
      description: string;
      recommendation: string;
    }>;
    summary: string;
  }> {
    try {
      const prompt = `
        Analise as possíveis interações medicamentosas entre os seguintes medicamentos:
        
        Medicamentos: ${medications.join(', ')}
        
        Forneça uma análise em JSON com:
        - hasInteractions: boolean indicando se há interações
        - interactions: array de objetos com:
          - drug1: primeiro medicamento
          - drug2: segundo medicamento
          - severity: gravidade (mild/moderate/severe)
          - description: descrição da interação
          - recommendation: recomendação clínica
        - summary: resumo geral das interações encontradas
        
        Base sua análise em guidelines médicos reconhecidos e literatura científica.
      `;

      return await generateWithJSON(prompt);
    } catch (error) {
      console.error('Gemini drug interaction analysis error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to analyze drug interactions'
      });
      return {
        hasInteractions: false,
        interactions: [],
        summary: 'Erro ao analisar interações medicamentosas. Consulte um farmacêutico.',
      };
    }
  }

  async chatWithContext(
    userMessage: string,
    systemContext: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<string> {
    try {
      const client = getGeminiClient();
      const model = client.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp"
      });

      // Build conversation history for context
      let fullPrompt = systemContext + '\n\n';
      
      // Add last 5 messages for context (to keep token count reasonable)
      const recentHistory = conversationHistory.slice(-5);
      if (recentHistory.length > 0) {
        fullPrompt += 'Histórico recente da conversa:\n\n';
        recentHistory.forEach((msg) => {
          const role = msg.role === 'user' ? 'Usuário' : 'Assistente';
          fullPrompt += `${role}: ${msg.content}\n\n`;
        });
        fullPrompt += '---\n\n';
      }
      
      fullPrompt += `Nova pergunta do usuário:\n${userMessage}\n\nResposta:`;

      const result = await model.generateContent(fullPrompt);
      return result.response.text();
    } catch (error) {
      console.error('Gemini chat error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Failed to generate chat response'
      });
      
      if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
        return 'Funcionalidade de IA temporariamente indisponível. Configure a GEMINI_API_KEY para usar este assistente.';
      }
      
      return 'Desculpe, houve um erro ao processar sua pergunta. Por favor, tente novamente.';
    }
  }
}

export const geminiService = new GeminiService();
