import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TranscriptionResult {
  text: string;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    speaker?: string;
  }>;
  summary: string;
  keyPoints: string[];
  diagnosis?: string;
  treatment?: string;
  followUp?: string;
  symptoms?: string;
  observations?: string;
  diagnosticHypotheses?: Array<{
    condition: string;
    probability: number;
    reasoning: string;
  }>;
  duration: number;
}

export class WhisperService {
  /**
   * Transcribe audio from video consultation using OpenAI Whisper
   * @param audioBlob - Audio blob from MediaRecorder
   * @param consultationId - Video consultation ID for context
   */
  async transcribeConsultationAudio(
    audioBlob: Buffer, 
    consultationId: string,
    patientName?: string
  ): Promise<TranscriptionResult> {
    try {
      console.log('Starting audio transcription for consultation:', consultationId);

      // Create a File object from the buffer for OpenAI API
      const audioFile = new File([audioBlob], `consultation_${consultationId}.webm`, {
        type: 'audio/webm'
      });

      // Use OpenAI Whisper to transcribe the audio
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "pt", // Portuguese for Brazilian healthcare
        response_format: "verbose_json",
        timestamp_granularities: ["segment"]
      });

      console.log('Raw transcription completed:', {
        duration: transcription.duration,
        segments: transcription.segments?.length || 0
      });

      // Process and structure the transcription
      const structuredResult = await this.processTranscription(
        transcription.text,
        transcription.segments || [],
        transcription.duration || 0,
        patientName
      );

      return structuredResult;

    } catch (error) {
      console.error('Whisper transcription error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        status: (error as any)?.status || 'Unknown',
        message: 'Failed to transcribe consultation audio'
      });
      throw error;
    }
  }

  /**
   * Process transcription with AI to extract medical information
   */
  private async processTranscription(
    fullText: string,
    segments: any[],
    duration: number,
    patientName?: string
  ): Promise<TranscriptionResult> {
    try {
      // Use OpenAI to analyze and structure the medical consultation transcript
      const analysisPrompt = `
        Analise esta transcrição de consulta médica e extraia informações estruturadas:
        
        Paciente: ${patientName || 'Não identificado'}
        Duração: ${Math.round(duration / 60)} minutos
        
        Transcrição:
        "${fullText}"
        
        Extraia e forneça em JSON:
        {
          "summary": "Resumo conciso da consulta (máximo 200 palavras)",
          "keyPoints": ["Lista de pontos-chave discutidos"],
          "diagnosis": "Diagnóstico principal mencionado (se houver)",
          "treatment": "Tratamento prescrito ou recomendado (se houver)",
          "followUp": "Orientações de acompanhamento (se houver)",
          "symptoms": "Sintomas relatados pelo paciente",
          "observations": "Observações clínicas do médico",
          "diagnosticHypotheses": [
            {
              "condition": "Nome da condição médica",
              "probability": 85,
              "reasoning": "Justificativa baseada nos sintomas e exame"
            }
          ]
        }
        
        Baseie-se apenas no conteúdo da transcrição. Se alguma informação não estiver presente, deixe o campo em branco.
      `;

      const analysis = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Você é um assistente médico especializado em análise de transcrições de consultas. Extraia informações de forma precisa e estruturada, seguindo protocolos médicos brasileiros."
          },
          { role: "user", content: analysisPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3 // Lower temperature for more consistent medical analysis
      });

      const analysisResult = JSON.parse(analysis.choices[0].message.content || '{}');

      // Structure the segments with speaker identification attempts
      const processedSegments = segments.map((segment, index) => ({
        text: segment.text,
        start: segment.start,
        end: segment.end,
        speaker: this.identifySpeaker(segment.text, index, patientName)
      }));

      return {
        text: fullText,
        segments: processedSegments,
        summary: analysisResult.summary || 'Resumo não disponível',
        keyPoints: analysisResult.keyPoints || [],
        diagnosis: analysisResult.diagnosis || undefined,
        treatment: analysisResult.treatment || undefined,
        followUp: analysisResult.followUp || undefined,
        symptoms: analysisResult.symptoms || undefined,
        observations: analysisResult.observations || undefined,
        diagnosticHypotheses: analysisResult.diagnosticHypotheses || undefined,
        duration: Math.round(duration)
      };

    } catch (error) {
      console.error('Transcription processing error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: 'Failed to process transcription with AI'
      });

      // Fallback result if AI processing fails
      return {
        text: fullText,
        segments: segments.map(segment => ({
          text: segment.text,
          start: segment.start,
          end: segment.end
        })),
        summary: 'Processamento automático não disponível. Transcrição completa disponível.',
        keyPoints: [],
        duration: Math.round(duration)
      };
    }
  }

  /**
   * Simple speaker identification based on content patterns
   */
  private identifySpeaker(text: string, segmentIndex: number, patientName?: string): string {
    const lowerText = text.toLowerCase();
    
    // Common patterns for doctor speech
    const doctorPatterns = [
      'vou prescrever', 'recomendo', 'diagnóstico', 'exame físico',
      'ausculta', 'pressão arterial', 'medicamento', 'tratamento',
      'vamos fazer', 'precisa de', 'orientação'
    ];
    
    // Common patterns for patient speech  
    const patientPatterns = [
      'sinto', 'dói', 'dor', 'não consigo', 'tenho', 'me sinto',
      'começou', 'piorou', 'melhorou', 'incomoda', 'preocupa'
    ];

    const hasDoctorPattern = doctorPatterns.some(pattern => lowerText.includes(pattern));
    const hasPatientPattern = patientPatterns.some(pattern => lowerText.includes(pattern));

    if (hasDoctorPattern && !hasPatientPattern) {
      return 'Médico';
    } else if (hasPatientPattern && !hasDoctorPattern) {
      return patientName || 'Paciente';
    } else {
      // Fallback: alternate based on segment index
      return segmentIndex % 2 === 0 ? 'Médico' : (patientName || 'Paciente');
    }
  }

  /**
   * Extract audio from video consultation recording
   * This would typically be called server-side when processing recordings
   */
  async extractAudioFromVideo(videoBuffer: Buffer): Promise<Buffer> {
    // In a production environment, you would use FFmpeg or similar
    // For now, we'll assume audio is already in the correct format
    // This is a placeholder for the actual audio extraction logic
    
    try {
      // TODO: Implement actual video-to-audio conversion using FFmpeg
      // For development, we'll return the buffer as-is assuming it's already audio
      return videoBuffer;
    } catch (error) {
      console.error('Audio extraction error:', error);
      throw new Error('Failed to extract audio from video');
    }
  }

  /**
   * Validate audio file format and size
   */
  validateAudioFile(audioBuffer: Buffer): { isValid: boolean; error?: string } {
    // Check file size (max 25MB for OpenAI Whisper)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioBuffer.length > maxSize) {
      return {
        isValid: false,
        error: 'Arquivo de áudio muito grande. Máximo permitido: 25MB'
      };
    }

    // Check minimum size (avoid empty files)
    if (audioBuffer.length < 1000) { // 1KB minimum
      return {
        isValid: false,
        error: 'Arquivo de áudio muito pequeno ou corrompido'
      };
    }

    return { isValid: true };
  }

  /**
   * Get transcription cost estimate
   */
  estimateTranscriptionCost(durationInSeconds: number): number {
    // OpenAI Whisper pricing: $0.006 per minute
    const durationInMinutes = Math.ceil(durationInSeconds / 60);
    return durationInMinutes * 0.006;
  }
}

export const whisperService = new WhisperService();