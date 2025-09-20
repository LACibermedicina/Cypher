import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { openAIService } from "./services/openai";
import { whatsAppService } from "./services/whatsapp";
import { SchedulingService } from "./services/scheduling";
import { whisperService } from "./services/whisper";
import { insertPatientSchema, insertAppointmentSchema, insertWhatsappMessageSchema, insertMedicalRecordSchema, insertVideoConsultationSchema, DEFAULT_DOCTOR_ID } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize default doctor if not exists and get the actual ID
  const actualDoctorId = await initializeDefaultDoctor();
  
  // Initialize scheduling service
  const schedulingService = new SchedulingService(storage);
  
  // Ensure default schedule exists for the doctor
  if (actualDoctorId) {
    await schedulingService.createDefaultSchedule(actualDoctorId);
  } else {
    console.error('Failed to initialize doctor, using DEFAULT_DOCTOR_ID as fallback');
  }
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Broadcast function for real-time updates
  const broadcast = (data: any) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // WhatsApp webhook verification
  app.get('/api/whatsapp/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const result = whatsAppService.verifyWebhook(mode as string, token as string, challenge as string);
    if (result) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Verification failed');
    }
  });

  // WhatsApp webhook handler
  app.post('/api/whatsapp/webhook', async (req, res) => {
    try {
      const messages = whatsAppService.parseWebhookPayload(req.body);
      
      for (const message of messages) {
        // Find or create patient
        let patient = await storage.getPatientByWhatsapp(message.from);
        if (!patient) {
          patient = await storage.createPatient({
            name: `Paciente ${message.from}`,
            phone: message.from,
            whatsappNumber: message.from,
          });
        }

        // Save incoming message
        const whatsappMessage = await storage.createWhatsappMessage({
          patientId: patient.id,
          fromNumber: message.from,
          toNumber: message.to,
          message: message.text,
          messageType: 'text',
          isFromAI: false,
        });

        // Analyze message with AI
        const analysis = await openAIService.analyzeWhatsappMessage(
          message.text,
          patient.medicalHistory ? JSON.stringify(patient.medicalHistory) : undefined
        );

        let aiResponse = analysis.response;

        // Handle scheduling requests
        if (analysis.isSchedulingRequest) {
          // Get real available slots from doctor schedule
          const doctorId = actualDoctorId || DEFAULT_DOCTOR_ID;
          const availableSlots = await schedulingService.getAvailableSlots(doctorId);
          const formattedSlots = availableSlots.map(slot => slot.formatted);

          const schedulingResponse = await openAIService.processSchedulingRequest(
            message.text,
            formattedSlots
          );

          if (schedulingResponse.suggestedAppointment && !schedulingResponse.requiresHumanIntervention) {
            // Find the exact slot that was suggested to get proper date/time
            const selectedSlot = availableSlots.find(slot => 
              slot.formatted === schedulingResponse.suggestedAppointment?.date + ' às ' + schedulingResponse.suggestedAppointment?.time
            );

            let scheduledAt: Date;
            if (selectedSlot) {
              // Use the properly formatted date and time from the slot
              scheduledAt = new Date(`${selectedSlot.date} ${selectedSlot.time}`);
            } else {
              // Fallback to parsing the response (less reliable)
              scheduledAt = new Date(`${schedulingResponse.suggestedAppointment.date} ${schedulingResponse.suggestedAppointment.time}`);
            }

            // Verify the slot is still available before creating
            const isAvailable = await schedulingService.isSpecificSlotAvailable(
              doctorId,
              scheduledAt.toISOString().split('T')[0],
              scheduledAt.toTimeString().slice(0, 5)
            );

            if (!isAvailable) {
              aiResponse = 'Desculpe, esse horário não está mais disponível. Por favor, escolha outro horário.';
            } else {
              // Create appointment automatically
              const appointment = await storage.createAppointment({
                patientId: patient.id,
                doctorId: doctorId,
                scheduledAt,
                type: schedulingResponse.suggestedAppointment.type || 'consulta',
                status: 'scheduled',
                aiScheduled: true,
              });

            // Update WhatsApp message with appointment reference
            await storage.updateWhatsappMessage(whatsappMessage.id, {
              appointmentScheduled: true,
              appointmentId: appointment.id,
              processed: true,
            });

            aiResponse = schedulingResponse.response;

            // Send confirmation
            await whatsAppService.sendAppointmentConfirmation(
              message.from,
              patient.name,
              schedulingResponse.suggestedAppointment.date,
              schedulingResponse.suggestedAppointment.time
            );
            }
          }
        }

        // Handle clinical questions
        if (analysis.isClinicalQuestion) {
          const clinicalResponse = await openAIService.answerClinicalQuestion(message.text);
          await whatsAppService.sendClinicalResponse(message.from, message.text, clinicalResponse);
          
          // Store clinical question and AI response as medical record
          const doctorId = actualDoctorId || DEFAULT_DOCTOR_ID;
          await storage.createMedicalRecord({
            patientId: patient.id,
            doctorId,
            symptoms: `Pergunta via WhatsApp: ${message.text}`,
            treatment: `Resposta IA: ${clinicalResponse}`,
            isEncrypted: true
          });
          
          aiResponse = 'Enviei uma resposta detalhada sobre sua dúvida clínica.';
        }

        // Save AI response
        await storage.createWhatsappMessage({
          patientId: patient.id,
          fromNumber: message.to,
          toNumber: message.from,
          message: aiResponse,
          messageType: 'text',
          isFromAI: true,
        });

        // Mark original message as read
        await whatsAppService.markMessageAsRead(message.messageId);

        // Broadcast real-time update
        broadcast({
          type: 'whatsapp_message',
          data: { patient, message: whatsappMessage, aiResponse },
        });
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Patients API
  app.get('/api/patients', async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get patients' });
    }
  });

  app.get('/api/patients/:id', async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get patient' });
    }
  });

  app.post('/api/patients', async (req, res) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.status(201).json(patient);
    } catch (error) {
      res.status(400).json({ message: 'Invalid patient data', error });
    }
  });

  // Appointments API
  app.get('/api/appointments/today/:doctorId', async (req, res) => {
    try {
      const appointments = await storage.getTodayAppointments(req.params.doctorId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get appointments' });
    }
  });

  app.get('/api/appointments/doctor/:doctorId', async (req, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const appointments = await storage.getAppointmentsByDoctor(req.params.doctorId, date);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get appointments' });
    }
  });

  app.get('/api/appointments/patient/:patientId', async (req, res) => {
    try {
      const appointments = await storage.getAppointmentsByPatient(req.params.patientId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get patient appointments' });
    }
  });

  // Available slots API
  app.get('/api/scheduling/available-slots/:doctorId', async (req, res) => {
    try {
      const { doctorId } = req.params;
      const daysAhead = parseInt(req.query.days as string) || 30;
      
      const availableSlots = await schedulingService.getAvailableSlots(doctorId, daysAhead);
      res.json(availableSlots);
    } catch (error) {
      console.error('Error getting available slots:', error);
      res.status(500).json({ message: 'Failed to get available slots' });
    }
  });

  // Check specific slot availability
  app.post('/api/scheduling/check-availability', async (req, res) => {
    try {
      const { doctorId, date, time } = req.body;
      
      if (!doctorId || !date || !time) {
        return res.status(400).json({ message: 'Doctor ID, date, and time are required' });
      }

      const isAvailable = await schedulingService.isSpecificSlotAvailable(doctorId, date, time);
      res.json({ available: isAvailable });
    } catch (error) {
      console.error('Error checking slot availability:', error);
      res.status(500).json({ message: 'Failed to check availability' });
    }
  });

  app.post('/api/appointments', async (req, res) => {
    try {
      // Transform scheduledAt from string to Date if needed
      const requestData = {
        ...req.body,
        scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
      };
      
      const validatedData = insertAppointmentSchema.parse(requestData);
      const appointment = await storage.createAppointment(validatedData);
      broadcast({ type: 'appointment_created', data: appointment });
      res.status(201).json(appointment);
    } catch (error) {
      res.status(400).json({ message: 'Invalid appointment data', error });
    }
  });

  app.patch('/api/appointments/:id', async (req, res) => {
    try {
      const appointment = await storage.updateAppointment(req.params.id, req.body);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      broadcast({ type: 'appointment_updated', data: appointment });
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update appointment' });
    }
  });

  // WhatsApp Messages API
  app.get('/api/whatsapp/messages/:patientId', async (req, res) => {
    try {
      const messages = await storage.getWhatsappMessagesByPatient(req.params.patientId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get messages' });
    }
  });

  app.post('/api/whatsapp/send', async (req, res) => {
    try {
      const { to, message } = req.body;
      const success = await whatsAppService.sendMessage(to, message);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ message: 'Failed to send message' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Medical Records API
  app.get('/api/medical-records/:patientId', async (req, res) => {
    try {
      const records = await storage.getMedicalRecordsByPatient(req.params.patientId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get medical records' });
    }
  });

  app.post('/api/appointments/:appointmentId/transcribe', async (req, res) => {
    try {
      // Validate input
      const validation = transcriptionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid input', 
          errors: validation.error.issues 
        });
      }
      
      const { audioTranscript } = validation.data;
      const appointmentId = req.params.appointmentId;
      
      // Validate appointmentId format
      if (!z.string().uuid().safeParse(appointmentId).success) {
        return res.status(400).json({ message: 'Invalid appointment ID format' });
      }
      
      // Get appointment details
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      
      // Process consultation transcript with AI
      const analysis = await openAIService.transcribeAndSummarizeConsultation(audioTranscript);
      
      // Create medical record with AI analysis and transcript
      const doctorId = actualDoctorId || DEFAULT_DOCTOR_ID;
      const medicalRecord = await storage.createMedicalRecord({
        patientId: appointment.patientId,
        doctorId,
        appointmentId,
        diagnosis: analysis.diagnosis,
        treatment: analysis.treatment,
        audioTranscript,
        isEncrypted: true
      });
      
      res.json({ 
        analysis, 
        medicalRecordId: medicalRecord.id,
        message: 'Consultation transcribed and analyzed successfully' 
      });
    } catch (error) {
      console.error('Consultation transcription error:', error);
      res.status(500).json({ message: 'Failed to process consultation transcript' });
    }
  });

  // Input validation schemas
  const analyzeSchema = z.object({
    symptoms: z.string().min(1, "Symptoms are required"),
    history: z.string().optional(),
    appointmentId: z.string().uuid().optional()
  });

  const transcriptionSchema = z.object({
    audioTranscript: z.string().min(1, "Audio transcript is required")
  });

  app.post('/api/medical-records/:patientId/analyze', async (req, res) => {
    try {
      // Validate patient ID format
      const patientId = req.params.patientId;
      if (!z.string().uuid().safeParse(patientId).success) {
        return res.status(400).json({ message: 'Invalid patient ID format' });
      }
      
      // Validate input
      const validation = analyzeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid input', 
          errors: validation.error.issues 
        });
      }
      
      const { symptoms, history, appointmentId } = validation.data;
      
      // Check if patient exists
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      
      // Generate AI diagnostic hypotheses
      let hypotheses;
      try {
        hypotheses = await openAIService.generateDiagnosticHypotheses(symptoms, history || '');
      } catch (openaiError) {
        console.error('OpenAI service unavailable:', {
          status: openaiError instanceof Error ? openaiError.name : 'Unknown',
          message: 'AI diagnostic service temporarily unavailable'
        });
        return res.status(502).json({ 
          message: 'AI diagnostic service temporarily unavailable',
          hypotheses: [] 
        });
      }
      
      // Only create medical record if we have hypotheses
      if (!hypotheses || hypotheses.length === 0) {
        return res.json({ hypotheses: [], message: 'No diagnostic hypotheses generated' });
      }
      
      // Save the AI analysis to medical records
      const doctorId = actualDoctorId || DEFAULT_DOCTOR_ID;
      const medicalRecord = await storage.createMedicalRecord({
        patientId,
        doctorId,
        appointmentId,
        symptoms,
        diagnosticHypotheses: hypotheses,
        isEncrypted: true
      });
      
      // Return both hypotheses and the created medical record
      res.json({ hypotheses, medicalRecordId: medicalRecord.id });
    } catch (error) {
      console.error('Diagnostic analysis error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        patientId: req.params.patientId
      });
      res.status(500).json({ message: 'Failed to process diagnostic analysis' });
    }
  });

  // Exam Results API
  app.get('/api/exam-results/:patientId', async (req, res) => {
    try {
      const results = await storage.getExamResultsByPatient(req.params.patientId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get exam results' });
    }
  });

  app.post('/api/exam-results/analyze', async (req, res) => {
    try {
      const { rawData, examType, patientId } = req.body;
      const analysis = await openAIService.extractExamResults(rawData, examType);
      
      const examResult = await storage.createExamResult({
        patientId,
        examType,
        results: analysis.structuredResults,
        rawData,
        abnormalValues: analysis.abnormalValues,
        analyzedByAI: true,
      });

      res.json(examResult);
    } catch (error) {
      res.status(500).json({ message: 'Failed to analyze exam results' });
    }
  });

  // Collaborators API
  app.get('/api/collaborators', async (req, res) => {
    try {
      const collaborators = await storage.getAllCollaborators();
      res.json(collaborators);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get collaborators' });
    }
  });

  // Digital Signatures API
  app.get('/api/digital-signatures/pending/:doctorId', async (req, res) => {
    try {
      const signatures = await storage.getPendingSignatures(req.params.doctorId);
      res.json(signatures);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get pending signatures' });
    }
  });

  app.post('/api/digital-signatures/:id/sign', async (req, res) => {
    try {
      const { signature, certificateInfo } = req.body;
      const updated = await storage.updateDigitalSignature(req.params.id, {
        signature,
        certificateInfo,
        status: 'signed',
        signedAt: new Date(),
      });
      
      if (!updated) {
        return res.status(404).json({ message: 'Signature not found' });
      }
      
      broadcast({ type: 'document_signed', data: updated });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Failed to sign document' });
    }
  });

  // Dashboard Stats API
  app.get('/api/dashboard/stats/:doctorId', async (req, res) => {
    try {
      const doctorId = req.params.doctorId;
      const today = new Date();
      
      const [todayAppointments, unprocessedMessages, pendingSignatures, patients] = await Promise.all([
        storage.getTodayAppointments(doctorId),
        storage.getUnprocessedWhatsappMessages(),
        storage.getPendingSignatures(doctorId),
        storage.getAllPatients(),
      ]);

      const aiScheduledToday = todayAppointments.filter(apt => apt.aiScheduled).length;

      res.json({
        todayConsultations: todayAppointments.length,
        whatsappMessages: unprocessedMessages.length,
        aiScheduling: aiScheduledToday,
        secureRecords: patients.length,
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to get dashboard stats' });
    }
  });


  // WhatsApp Messages API
  app.get('/api/whatsapp/messages/recent', async (req, res) => {
    try {
      const messages = await storage.getUnprocessedWhatsappMessages();
      const recentMessages = messages.slice(0, 50);
      res.json(recentMessages);
    } catch (error) {
      console.error('WhatsApp messages error:', error);
      res.status(500).json({ message: 'Failed to get messages' });
    }
  });

  app.get('/api/exam-results/recent', async (req, res) => {
    try {
      // Return empty array for now since we don't have patients with exam results yet
      res.json([]);
    } catch (error) {
      console.error('Recent exam results error:', error);
      res.status(500).json({ message: 'Failed to get exam results' });
    }
  });

  // Video Consultation API Routes
  
  // Create a new video consultation session
  app.post('/api/video-consultations', async (req, res) => {
    try {
      const validatedData = insertVideoConsultationSchema.parse(req.body);
      const consultation = await storage.createVideoConsultation(validatedData);
      
      // Broadcast to WebSocket clients
      broadcast({ type: 'consultation_created', data: consultation });
      
      res.status(201).json(consultation);
    } catch (error) {
      console.error('Create video consultation error:', error);
      res.status(400).json({ message: 'Invalid video consultation data', error });
    }
  });

  // Get video consultation by ID
  app.get('/api/video-consultations/:id', async (req, res) => {
    try {
      const consultation = await storage.getVideoConsultation(req.params.id);
      if (!consultation) {
        return res.status(404).json({ message: 'Video consultation not found' });
      }
      res.json(consultation);
    } catch (error) {
      console.error('Get video consultation error:', error);
      res.status(500).json({ message: 'Failed to get video consultation' });
    }
  });

  // Get video consultations by appointment
  app.get('/api/video-consultations/appointment/:appointmentId', async (req, res) => {
    try {
      const consultations = await storage.getVideoConsultationsByAppointment(req.params.appointmentId);
      res.json(consultations);
    } catch (error) {
      console.error('Get consultations by appointment error:', error);
      res.status(500).json({ message: 'Failed to get video consultations' });
    }
  });

  // Get active video consultations for a doctor
  app.get('/api/video-consultations/active/:doctorId', async (req, res) => {
    try {
      const consultations = await storage.getActiveVideoConsultations(req.params.doctorId);
      res.json(consultations);
    } catch (error) {
      console.error('Get active consultations error:', error);
      res.status(500).json({ message: 'Failed to get active consultations' });
    }
  });

  // Update video consultation status and details
  app.patch('/api/video-consultations/:id', async (req, res) => {
    try {
      const { status, startedAt, endedAt, duration, recordingUrl, audioRecordingUrl, connectionLogs } = req.body;
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (startedAt) updateData.startedAt = new Date(startedAt);
      if (endedAt) updateData.endedAt = new Date(endedAt);
      if (duration !== undefined) updateData.duration = duration;
      if (recordingUrl) updateData.recordingUrl = recordingUrl;
      if (audioRecordingUrl) updateData.audioRecordingUrl = audioRecordingUrl;
      if (connectionLogs) updateData.connectionLogs = connectionLogs;

      const consultation = await storage.updateVideoConsultation(req.params.id, updateData);
      
      if (!consultation) {
        return res.status(404).json({ message: 'Video consultation not found' });
      }

      // Broadcast status updates
      broadcast({ type: 'consultation_updated', data: consultation });
      
      res.json(consultation);
    } catch (error) {
      console.error('Update video consultation error:', error);
      res.status(500).json({ message: 'Failed to update video consultation' });
    }
  });

  // Start video consultation (updates status to active)
  app.post('/api/video-consultations/:id/start', async (req, res) => {
    try {
      const consultation = await storage.updateVideoConsultation(req.params.id, {
        status: 'active',
        startedAt: new Date()
      });
      
      if (!consultation) {
        return res.status(404).json({ message: 'Video consultation not found' });
      }

      broadcast({ type: 'consultation_started', data: consultation });
      
      res.json(consultation);
    } catch (error) {
      console.error('Start consultation error:', error);
      res.status(500).json({ message: 'Failed to start consultation' });
    }
  });

  // End video consultation
  app.post('/api/video-consultations/:id/end', async (req, res) => {
    try {
      const { duration, meetingNotes } = req.body;
      
      const consultation = await storage.updateVideoConsultation(req.params.id, {
        status: 'ended',
        endedAt: new Date(),
        duration: duration || 0,
        meetingNotes: meetingNotes || ''
      });
      
      if (!consultation) {
        return res.status(404).json({ message: 'Video consultation not found' });
      }

      broadcast({ type: 'consultation_ended', data: consultation });
      
      res.json(consultation);
    } catch (error) {
      console.error('End consultation error:', error);
      res.status(500).json({ message: 'Failed to end consultation' });
    }
  });

  // Upload and transcribe consultation audio
  app.post('/api/video-consultations/:id/transcribe', async (req, res) => {
    try {
      const consultationId = req.params.id;
      const { audioData, patientName } = req.body;
      
      if (!audioData) {
        return res.status(400).json({ message: 'Audio data is required' });
      }

      // Get consultation details
      const consultation = await storage.getVideoConsultation(consultationId);
      if (!consultation) {
        return res.status(404).json({ message: 'Video consultation not found' });
      }

      // Update transcription status to processing
      await storage.updateVideoConsultation(consultationId, {
        transcriptionStatus: 'processing'
      });

      broadcast({ type: 'transcription_started', consultationId, status: 'processing' });

      try {
        // Convert base64 audio data to buffer
        const audioBuffer = Buffer.from(audioData, 'base64');
        
        // Validate audio file
        const validation = whisperService.validateAudioFile(audioBuffer);
        if (!validation.isValid) {
          return res.status(400).json({ message: validation.error });
        }

        // Transcribe audio with OpenAI Whisper
        const transcriptionResult = await whisperService.transcribeConsultationAudio(
          audioBuffer,
          consultationId,
          patientName
        );

        // Update consultation with transcription results
        const updatedConsultation = await storage.updateVideoConsultation(consultationId, {
          fullTranscript: transcriptionResult.text,
          meetingNotes: transcriptionResult.summary,
          transcriptionStatus: 'completed'
        });

        // Create medical record with comprehensive transcription data
        const medicalRecord = await storage.createMedicalRecord({
          patientId: consultation.patientId,
          doctorId: consultation.doctorId,
          appointmentId: consultation.appointmentId,
          audioTranscript: transcriptionResult.text,
          diagnosis: transcriptionResult.diagnosis,
          treatment: transcriptionResult.treatment,
          symptoms: transcriptionResult.symptoms,
          observations: transcriptionResult.observations,
          diagnosticHypotheses: transcriptionResult.diagnosticHypotheses,
          isEncrypted: true
        });

        broadcast({ 
          type: 'transcription_completed', 
          consultationId,
          status: 'completed',
          medicalRecordId: medicalRecord.id
        });

        res.json({
          transcription: transcriptionResult,
          consultation: updatedConsultation,
          medicalRecordId: medicalRecord.id,
          message: 'Audio transcribed and analyzed successfully'
        });

      } catch (transcriptionError) {
        console.error('Transcription processing error:', transcriptionError);
        
        // Update status to failed
        await storage.updateVideoConsultation(consultationId, {
          transcriptionStatus: 'failed'
        });

        broadcast({ type: 'transcription_failed', consultationId });

        res.status(500).json({ 
          message: 'Failed to process audio transcription',
          error: transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error'
        });
      }

    } catch (error) {
      console.error('Video consultation transcription error:', error);
      res.status(500).json({ message: 'Failed to transcribe consultation audio' });
    }
  });

  // Get transcription status
  app.get('/api/video-consultations/:id/transcription-status', async (req, res) => {
    try {
      const consultation = await storage.getVideoConsultation(req.params.id);
      if (!consultation) {
        return res.status(404).json({ message: 'Video consultation not found' });
      }

      res.json({
        status: consultation.transcriptionStatus,
        transcript: consultation.fullTranscript,
        notes: consultation.meetingNotes
      });
    } catch (error) {
      console.error('Get transcription status error:', error);
      res.status(500).json({ message: 'Failed to get transcription status' });
    }
  });

  return httpServer;
}

// Initialize default doctor if not exists
async function initializeDefaultDoctor() {
  try {
    // Check if a doctor user exists by username
    const existingDoctor = await storage.getUserByUsername('doctor');
    
    if (!existingDoctor) {
      console.log('Creating default doctor user...');
      const newDoctor = await storage.createUser({
        username: 'doctor',
        password: 'doctor123', // In production, this should be properly hashed
        role: 'doctor',
        name: 'Dr. Sistema MedIA',
        email: 'medico@media.med.br',
        phone: '+55 11 99999-9999',
        digitalCertificate: 'dev-certificate-001',
      });
      
      // Update the DEFAULT_DOCTOR_ID to use the generated ID
      console.log('Default doctor created successfully with ID:', newDoctor.id);
      return newDoctor.id;
    } else {
      console.log('Default doctor already exists with ID:', existingDoctor.id);
      return existingDoctor.id;
    }
  } catch (error) {
    console.error('Failed to initialize default doctor:', error);
    return null;
  }
}
