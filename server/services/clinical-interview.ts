import { openAIService } from './openai.js';

export interface SymptomData {
  mainComplaint: string;
  duration: string;
  intensity: number; // 1-10 scale
  location?: string;
  quality?: string; // nature of pain/discomfort
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  associatedSymptoms?: string[];
  previousOccurrence?: boolean;
}

export interface PatientHistory {
  medicalHistory: string[];
  surgicalHistory: string[];
  medications: string[];
  allergies: string[];
  familyHistory: string[];
  socialHistory: {
    smoking?: boolean;
    alcohol?: boolean;
    occupation?: string;
  };
  systemicReview: {
    cardiovascular?: string[];
    respiratory?: string[];
    gastrointestinal?: string[];
    genitourinary?: string[];
    neurological?: string[];
    musculoskeletal?: string[];
    dermatological?: string[];
  };
}

export interface ClinicalInterview {
  id: string;
  patientId?: string;
  stage: 'initial' | 'symptoms' | 'duration' | 'intensity' | 'quality' | 'factors' | 'history' | 'analysis' | 'completed';
  currentQuestion: string;
  symptomData: Partial<SymptomData>;
  patientHistory: Partial<PatientHistory>;
  responses: Array<{
    question: string;
    answer: string;
    timestamp: Date;
  }>;
  diagnosticHypotheses?: Array<{
    condition: string;
    probability: number;
    reasoning: string;
    redFlags?: string[];
    nextSteps?: string[];
  }>;
  completedAt?: Date;
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
}

export class ClinicalInterviewService {
  private interviews: Map<string, ClinicalInterview> = new Map();

  startInterview(patientId?: string): ClinicalInterview {
    const interview: ClinicalInterview = {
      id: `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId,
      stage: 'initial',
      currentQuestion: 'Olá! Sou seu assistente de saúde. Qual é o principal motivo da sua consulta hoje? Descreva seus sintomas ou preocupação principal.',
      symptomData: {},
      patientHistory: {},
      responses: [],
      urgencyLevel: 'low'
    };

    this.interviews.set(interview.id, interview);
    return interview;
  }

  async processResponse(interviewId: string, userResponse: string): Promise<{
    interview: ClinicalInterview;
    nextQuestion: string;
    isComplete: boolean;
    urgentFlag?: boolean;
  }> {
    const interview = this.interviews.get(interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    // Store the response
    interview.responses.push({
      question: interview.currentQuestion,
      answer: userResponse,
      timestamp: new Date()
    });

    // Check for emergency keywords
    const emergencyKeywords = [
      'dor no peito', 'chest pain', 'dificuldade para respirar', 'shortness of breath',
      'sangramento intenso', 'severe bleeding', 'desmaio', 'fainting', 'convulsão',
      'seizure', 'acidente', 'accident', 'trauma', 'overdose', 'suicídio', 'suicide'
    ];

    const hasEmergencyFlag = emergencyKeywords.some(keyword => 
      userResponse.toLowerCase().includes(keyword)
    );

    if (hasEmergencyFlag) {
      interview.urgencyLevel = 'emergency';
      return {
        interview,
        nextQuestion: '🚨 ATENÇÃO: Baseado nos seus sintomas, recomendo que procure atendimento médico de emergência IMEDIATAMENTE. Vá ao pronto-socorro mais próximo ou ligue para o SAMU (192). Esta situação pode ser grave e requer avaliação médica urgente.',
        isComplete: true,
        urgentFlag: true
      };
    }

    // Process according to current stage
    switch (interview.stage) {
      case 'initial':
        return this.processInitialComplaint(interview, userResponse);
      
      case 'duration':
        return this.processDuration(interview, userResponse);
      
      case 'intensity':
        return this.processIntensity(interview, userResponse);
      
      case 'quality':
        return this.processQuality(interview, userResponse);
      
      case 'factors':
        return this.processFactors(interview, userResponse);
      
      case 'history':
        return this.processHistory(interview, userResponse);
      
      case 'analysis':
        return this.generateAnalysis(interview);
      
      default:
        throw new Error('Invalid interview stage');
    }
  }

  private async processInitialComplaint(interview: ClinicalInterview, response: string): Promise<{
    interview: ClinicalInterview;
    nextQuestion: string;
    isComplete: boolean;
  }> {
    interview.symptomData.mainComplaint = response;
    interview.stage = 'duration';
    interview.currentQuestion = 'Há quanto tempo você está sentindo isso? (Por exemplo: 2 horas, 3 dias, 1 semana, etc.)';

    return {
      interview,
      nextQuestion: interview.currentQuestion,
      isComplete: false
    };
  }

  private async processDuration(interview: ClinicalInterview, response: string): Promise<{
    interview: ClinicalInterview;
    nextQuestion: string;
    isComplete: boolean;
  }> {
    interview.symptomData.duration = response;
    
    // Extract urgency based on duration
    if (response.toLowerCase().includes('minutos') || response.toLowerCase().includes('hora')) {
      interview.urgencyLevel = 'high';
    } else if (response.toLowerCase().includes('dia') || response.toLowerCase().includes('ontem')) {
      interview.urgencyLevel = 'medium';
    }

    interview.stage = 'intensity';
    interview.currentQuestion = 'Em uma escala de 1 a 10, onde 1 é muito leve e 10 é insuportável, como você classificaria a intensidade do seu sintoma?';

    return {
      interview,
      nextQuestion: interview.currentQuestion,
      isComplete: false
    };
  }

  private async processIntensity(interview: ClinicalInterview, response: string): Promise<{
    interview: ClinicalInterview;
    nextQuestion: string;
    isComplete: boolean;
  }> {
    const intensityMatch = response.match(/(\d+)/);
    const intensity = intensityMatch ? parseInt(intensityMatch[1]) : 5;
    interview.symptomData.intensity = Math.min(Math.max(intensity, 1), 10);

    if (intensity >= 8) {
      interview.urgencyLevel = 'high';
    } else if (intensity >= 6) {
      interview.urgencyLevel = 'medium';
    }

    interview.stage = 'quality';
    interview.currentQuestion = 'Como você descreveria a natureza/característica do sintoma? (Ex: dor em queimação, pontada, peso, formigamento, etc.)';

    return {
      interview,
      nextQuestion: interview.currentQuestion,
      isComplete: false
    };
  }

  private async processQuality(interview: ClinicalInterview, response: string): Promise<{
    interview: ClinicalInterview;
    nextQuestion: string;
    isComplete: boolean;
  }> {
    interview.symptomData.quality = response;
    interview.stage = 'factors';
    interview.currentQuestion = 'O que piora ou melhora seus sintomas? Há alguma posição, movimento, alimento ou situação que influencia?';

    return {
      interview,
      nextQuestion: interview.currentQuestion,
      isComplete: false
    };
  }

  private async processFactors(interview: ClinicalInterview, response: string): Promise<{
    interview: ClinicalInterview;
    nextQuestion: string;
    isComplete: boolean;
  }> {
    // Simple parsing - in production, would use NLP
    const factors = response.toLowerCase();
    if (factors.includes('piora') || factors.includes('pior')) {
      interview.symptomData.aggravatingFactors = [response];
    }
    if (factors.includes('melhora') || factors.includes('melhor') || factors.includes('alivia')) {
      interview.symptomData.relievingFactors = [response];
    }

    interview.stage = 'history';
    interview.currentQuestion = 'Você tem algum problema de saúde conhecido, toma medicamentos regularmente ou tem alergia a algum medicamento? (Pode responder "não" se não tiver)';

    return {
      interview,
      nextQuestion: interview.currentQuestion,
      isComplete: false
    };
  }

  private async processHistory(interview: ClinicalInterview, response: string): Promise<{
    interview: ClinicalInterview;
    nextQuestion: string;
    isComplete: boolean;
  }> {
    // Initialize history if not exists
    if (!interview.patientHistory.medicalHistory) {
      interview.patientHistory = {
        medicalHistory: [],
        surgicalHistory: [],
        medications: [],
        allergies: [],
        familyHistory: [],
        socialHistory: {},
        systemicReview: {}
      };
    }

    if (response.toLowerCase().includes('não') || response.toLowerCase().includes('nenhum')) {
      interview.patientHistory.medicalHistory = ['Nenhum problema conhecido'];
      interview.patientHistory.medications = ['Nenhum medicamento'];
      interview.patientHistory.allergies = ['Nenhuma alergia conhecida'];
    } else {
      interview.patientHistory.medicalHistory = [response];
    }

    interview.stage = 'analysis';
    return this.generateAnalysis(interview);
  }

  private async generateAnalysis(interview: ClinicalInterview): Promise<{
    interview: ClinicalInterview;
    nextQuestion: string;
    isComplete: boolean;
  }> {
    try {
      // Build comprehensive clinical prompt
      const clinicalData = this.buildClinicalSummary(interview);
      
      const diagnosticHypotheses = await openAIService.generateDiagnosticHypotheses(
        clinicalData,
        JSON.stringify(interview.patientHistory)
      );

      interview.diagnosticHypotheses = diagnosticHypotheses.map(h => ({
        condition: h.condition,
        probability: h.probability,
        reasoning: h.reasoning,
        redFlags: this.identifyRedFlags(interview, h.condition),
        nextSteps: this.suggestNextSteps(interview.urgencyLevel, h.condition)
      }));

      interview.stage = 'completed';
      interview.completedAt = new Date();

      const analysisMessage = this.formatAnalysisMessage(interview);

      return {
        interview,
        nextQuestion: analysisMessage,
        isComplete: true
      };
    } catch (error) {
      console.error('Error generating clinical analysis:', error);
      return {
        interview,
        nextQuestion: 'Obrigado pelas informações. Baseado nos seus sintomas, recomendo que agende uma consulta médica para uma avaliação mais detalhada.',
        isComplete: true
      };
    }
  }

  private buildClinicalSummary(interview: ClinicalInterview): string {
    const { symptomData } = interview;
    return `
      QUEIXA PRINCIPAL: ${symptomData.mainComplaint}
      DURAÇÃO: ${symptomData.duration}
      INTENSIDADE: ${symptomData.intensity}/10
      CARACTERÍSTICA: ${symptomData.quality}
      FATORES AGRAVANTES: ${symptomData.aggravatingFactors?.join(', ') || 'Não relatado'}
      FATORES ATENUANTES: ${symptomData.relievingFactors?.join(', ') || 'Não relatado'}
      URGÊNCIA AVALIADA: ${interview.urgencyLevel}
    `;
  }

  private identifyRedFlags(interview: ClinicalInterview, condition: string): string[] {
    const redFlags: string[] = [];
    
    if (interview.urgencyLevel === 'high' || interview.urgencyLevel === 'emergency') {
      redFlags.push('Início súbito ou sintomas intensos');
    }
    
    if (interview.symptomData.intensity && interview.symptomData.intensity >= 8) {
      redFlags.push('Dor intensa (≥8/10)');
    }
    
    return redFlags;
  }

  private suggestNextSteps(urgencyLevel: string, condition: string): string[] {
    const steps: string[] = [];
    
    switch (urgencyLevel) {
      case 'emergency':
        steps.push('Procurar atendimento de emergência IMEDIATAMENTE');
        steps.push('Ligar para SAMU (192) se necessário');
        break;
      case 'high':
        steps.push('Agendar consulta médica nas próximas 24-48 horas');
        steps.push('Monitorar sintomas de perto');
        break;
      case 'medium':
        steps.push('Agendar consulta médica na próxima semana');
        steps.push('Observar evolução dos sintomas');
        break;
      default:
        steps.push('Agendar consulta médica quando possível');
        steps.push('Manter estilo de vida saudável');
        break;
    }
    
    return steps;
  }

  private formatAnalysisMessage(interview: ClinicalInterview): string {
    const { diagnosticHypotheses, urgencyLevel } = interview;
    
    let message = `📋 **ANÁLISE CLÍNICA COMPLETA**\n\n`;
    
    if (urgencyLevel === 'emergency' || urgencyLevel === 'high') {
      message += `🚨 **URGÊNCIA: ${urgencyLevel.toUpperCase()}**\n\n`;
    }
    
    if (diagnosticHypotheses && diagnosticHypotheses.length > 0) {
      message += `💡 **HIPÓTESES DIAGNÓSTICAS:**\n\n`;
      diagnosticHypotheses.slice(0, 3).forEach((hypothesis, index) => {
        message += `${index + 1}. **${hypothesis.condition}** (${hypothesis.probability}%)\n`;
        message += `   • ${hypothesis.reasoning}\n\n`;
      });
    }
    
    message += `📝 **PRÓXIMOS PASSOS:**\n`;
    if (diagnosticHypotheses?.[0]?.nextSteps) {
      diagnosticHypotheses[0].nextSteps.forEach(step => {
        message += `• ${step}\n`;
      });
    }
    
    message += `\n⚠️ **IMPORTANTE:** Esta análise é apenas uma orientação inicial. É fundamental buscar avaliação médica profissional para diagnóstico definitivo e tratamento adequado.`;
    
    return message;
  }

  getInterview(interviewId: string): ClinicalInterview | undefined {
    return this.interviews.get(interviewId);
  }

  getAllInterviews(): ClinicalInterview[] {
    return Array.from(this.interviews.values());
  }
}

export const clinicalInterviewService = new ClinicalInterviewService();