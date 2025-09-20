import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { openAIService } from "./services/openai";
import { whatsAppService } from "./services/whatsapp";
import { SchedulingService } from "./services/scheduling";
import { whisperService } from "./services/whisper";
import { cryptoService } from "./services/crypto";
import { insertPatientSchema, insertAppointmentSchema, insertWhatsappMessageSchema, insertMedicalRecordSchema, insertVideoConsultationSchema, insertPrescriptionShareSchema, insertCollaboratorSchema, DEFAULT_DOCTOR_ID } from "@shared/schema";
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

  // Prescription Digital Signature API - Demo Implementation
  app.post('/api/medical-records/:id/sign-prescription', async (req, res) => {
    try {
      const medicalRecordId = req.params.id;
      // TODO: Get doctorId from authenticated session instead of client request
      const doctorId = DEFAULT_DOCTOR_ID; // Fixed doctor for demo

      // Get medical record with prescription
      const medicalRecord = await storage.getMedicalRecord(medicalRecordId);
      if (!medicalRecord) {
        return res.status(404).json({ message: 'Medical record not found' });
      }

      if (!medicalRecord.prescription) {
        return res.status(400).json({ message: 'No prescription to sign in this medical record' });
      }

      // Generate key pair and store for verification (in production, use persistent key management)
      const { privateKey, publicKey } = await cryptoService.generateKeyPair();
      const certificateInfo = cryptoService.createMockCertificateInfo(doctorId);

      // Create digital signature
      const signatureResult = await cryptoService.signPrescription(
        medicalRecord.prescription,
        privateKey,
        certificateInfo
      );

      // Create digital signature record with persistent key information
      const digitalSignature = await storage.createDigitalSignature({
        documentType: 'prescription',
        documentId: medicalRecordId,
        patientId: medicalRecord.patientId,
        doctorId: doctorId,
        signature: signatureResult.signature,
        certificateInfo: {
          ...signatureResult.certificateInfo,
          publicKey: publicKey, // Store public key for verification
          timestamp: signatureResult.timestamp
        },
        status: 'signed',
        signedAt: new Date(),
      });

      // Update medical record with digital signature ID reference
      await storage.updateMedicalRecord(medicalRecordId, {
        digitalSignature: digitalSignature.id, // Store signature ID instead of raw signature
      });

      // Generate audit trail
      const auditHash = cryptoService.generateAuditHash(
        signatureResult,
        doctorId,
        medicalRecord.patientId
      );

      // Broadcast signature event for real-time updates
      broadcast({ 
        type: 'prescription_signed', 
        data: { 
          medicalRecordId,
          signatureId: digitalSignature.id,
          auditHash 
        } 
      });

      res.status(201).json({
        signature: digitalSignature,
        auditHash,
        note: 'Demo implementation - not production compliant'
      });

    } catch (error) {
      console.error('Prescription signing error:', error);
      res.status(500).json({ message: 'Failed to sign prescription' });
    }
  });

  // Verify prescription signature
  app.get('/api/medical-records/:id/verify-signature', async (req, res) => {
    try {
      const medicalRecordId = req.params.id;

      // Get medical record
      const medicalRecord = await storage.getMedicalRecord(medicalRecordId);
      if (!medicalRecord) {
        return res.status(404).json({ message: 'Medical record not found' });
      }

      if (!medicalRecord.digitalSignature) {
        return res.status(404).json({ message: 'No digital signature found for this prescription' });
      }

      // TODO: Implement storage.getSignatureByDocument() method
      // For now, search all signatures by document ID
      const allSignatures = await storage.getPendingSignatures(medicalRecord.doctorId);
      const prescriptionSignature = allSignatures.find(
        sig => sig.documentId === medicalRecordId && sig.documentType === 'prescription'
      );

      if (!prescriptionSignature) {
        return res.status(404).json({ message: 'Digital signature record not found' });
      }

      // Extract stored verification data
      const certInfo = prescriptionSignature.certificateInfo as any || {};
      const storedPublicKey = certInfo.publicKey;
      const storedTimestamp = certInfo.timestamp;

      if (!storedPublicKey || !storedTimestamp) {
        return res.status(400).json({ message: 'Invalid signature record - missing verification data' });
      }

      // Verify signature using stored public key and timestamp
      const isValid = await cryptoService.verifySignature(
        medicalRecord.prescription || '',
        prescriptionSignature.signature,
        storedPublicKey,
        storedTimestamp
      );

      res.json({
        isValid,
        signatureInfo: {
          algorithm: certInfo.algorithm || 'Unknown',
          signedAt: prescriptionSignature.signedAt,
          certificateInfo: prescriptionSignature.certificateInfo,
          note: 'Demo verification - not production compliant'
        }
      });

    } catch (error) {
      console.error('Signature verification error:', error);
      res.status(500).json({ message: 'Failed to verify signature' });
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

  // ===== PHARMACY INTEGRATION API ROUTES =====
  
  // Get all pharmacy collaborators
  app.get('/api/pharmacies', async (req, res) => {
    try {
      const pharmacies = await storage.getCollaboratorsByType('pharmacy');
      res.json(pharmacies);
    } catch (error) {
      console.error('Get pharmacies error:', error);
      res.status(500).json({ message: 'Failed to get pharmacies' });
    }
  });

  // Create new pharmacy collaborator
  app.post('/api/pharmacies', async (req, res) => {
    try {
      const validatedData = insertCollaboratorSchema.parse({
        ...req.body,
        type: 'pharmacy'
      });
      
      const pharmacy = await storage.createCollaborator(validatedData);
      res.status(201).json(pharmacy);
    } catch (error) {
      console.error('Create pharmacy error:', error);
      res.status(500).json({ message: 'Failed to create pharmacy' });
    }
  });

  // Share prescription with pharmacy
  app.post('/api/prescriptions/:medicalRecordId/share', async (req, res) => {
    try {
      const { medicalRecordId } = req.params;
      const { pharmacyId, notes } = req.body;

      // Validate medical record exists and has signed prescription
      const medicalRecord = await storage.getMedicalRecord(medicalRecordId);
      if (!medicalRecord) {
        return res.status(404).json({ message: 'Medical record not found' });
      }

      if (!medicalRecord.prescription) {
        return res.status(400).json({ message: 'No prescription to share' });
      }

      if (!medicalRecord.digitalSignature) {
        return res.status(400).json({ message: 'Prescription must be digitally signed before sharing' });
      }

      // Verify digital signature cryptographically
      const digitalSignature = await storage.getDigitalSignature(medicalRecord.digitalSignature);
      if (!digitalSignature) {
        return res.status(400).json({ message: 'Digital signature record not found' });
      }

      // Extract certificate info and public key for verification
      const certInfo = digitalSignature.certificateInfo as any || {};
      const publicKey = certInfo.publicKey;
      const timestamp = certInfo.timestamp;

      if (!publicKey || !timestamp) {
        return res.status(400).json({ message: 'Invalid digital signature - missing verification data' });
      }

      // Verify the prescription signature cryptographically
      const isValidSignature = await cryptoService.verifySignature(
        medicalRecord.prescription || '',
        digitalSignature.signature,
        publicKey,
        timestamp
      );

      if (!isValidSignature) {
        // Log failed verification attempt
        await storage.createCollaboratorIntegration({
          collaboratorId: pharmacyId,
          integrationType: 'prescription_share',
          entityId: medicalRecordId,
          action: 'signature_verification_failed',
          status: 'failed',
          errorMessage: 'Digital signature verification failed',
          requestData: {
            medicalRecordId: medicalRecordId,
            patientId: medicalRecord.patientId,
            verificationTimestamp: new Date().toISOString()
          },
        });

        return res.status(400).json({ 
          message: 'Prescription digital signature verification failed - cannot share with pharmacy' 
        });
      }

      // Validate pharmacy exists
      const pharmacy = await storage.getCollaborator(pharmacyId);
      if (!pharmacy || pharmacy.type !== 'pharmacy') {
        return res.status(404).json({ message: 'Pharmacy not found' });
      }

      // Create prescription share record
      const shareData = {
        patientId: medicalRecord.patientId,
        medicalRecordId: medicalRecordId,
        doctorId: actualDoctorId || DEFAULT_DOCTOR_ID,
        pharmacyId,
        prescriptionText: medicalRecord.prescription || '',
        digitalSignatureId: medicalRecord.digitalSignature,
        status: 'shared' as const,
      };

      const validatedShareData = insertPrescriptionShareSchema.parse(shareData);
      const prescriptionShare = await storage.createPrescriptionShare(validatedShareData);

      // Log successful integration activity with signature verification
      await storage.createCollaboratorIntegration({
        collaboratorId: pharmacyId,
        integrationType: 'prescription_share',
        entityId: prescriptionShare.id,
        action: 'prescription_shared',
        status: 'success',
        requestData: {
          medicalRecordId: medicalRecordId,
          patientId: medicalRecord.patientId,
          signatureVerified: true,
          verificationTimestamp: new Date().toISOString()
        },
      });

      // Broadcast real-time update
      broadcast({
        type: 'prescription_shared',
        data: { prescriptionShare, pharmacy, patient: medicalRecord.patientId }
      });

      res.status(201).json(prescriptionShare);
    } catch (error) {
      console.error('Share prescription error:', error);
      res.status(500).json({ message: 'Failed to share prescription' });
    }
  });

  // Get shared prescriptions for a pharmacy
  app.get('/api/pharmacies/:pharmacyId/prescriptions', async (req, res) => {
    try {
      const { pharmacyId } = req.params;
      const { status } = req.query;

      let prescriptionShares = await storage.getPrescriptionSharesByPharmacy(pharmacyId);
      
      // Filter by status if provided
      if (status) {
        prescriptionShares = prescriptionShares.filter(share => share.status === status);
      }

      // Enrich with medical record and patient data
      const enrichedShares = await Promise.all(
        prescriptionShares.map(async (share) => {
          const medicalRecord = await storage.getMedicalRecord(share.medicalRecordId);
          const patient = await storage.getPatient(share.patientId);
          return {
            ...share,
            medicalRecord,
            patient: patient ? {
              id: patient.id,
              name: patient.name,
              phone: patient.phone
            } : null
          };
        })
      );

      res.json(enrichedShares);
    } catch (error) {
      console.error('Get pharmacy prescriptions error:', error);
      res.status(500).json({ message: 'Failed to get pharmacy prescriptions' });
    }
  });

  // Update prescription fulfillment status
  app.patch('/api/prescription-shares/:shareId/fulfillment', async (req, res) => {
    try {
      const { shareId } = req.params;
      const { status, fulfilledAt, pharmacistNotes, fulfilledBy } = req.body;

      const validStatuses = ['pending', 'preparing', 'ready', 'dispensed', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const updateData: any = { 
        status,
        pharmacistNotes: pharmacistNotes || '',
      };

      // Set fulfillment timestamp for completed statuses
      if (['dispensed', 'completed'].includes(status)) {
        updateData.fulfilledAt = fulfilledAt ? new Date(fulfilledAt) : new Date();
        if (fulfilledBy) {
          updateData.fulfilledBy = fulfilledBy;
        }
      }

      const updatedShare = await storage.updatePrescriptionShare(shareId, updateData);
      if (!updatedShare) {
        return res.status(404).json({ message: 'Prescription share not found' });
      }

      // Log integration activity
      await storage.createCollaboratorIntegration({
        collaboratorId: updatedShare.pharmacyId,
        integrationType: 'fulfillment_update',
        entityId: shareId,
        action: 'status_updated',
        status: 'success',
        requestData: {
          oldStatus: 'unknown', // Would need to track previous status
          newStatus: status,
          pharmacistNotes
        },
      });

      // Broadcast real-time update
      broadcast({
        type: 'prescription_fulfillment_updated',
        data: { prescriptionShare: updatedShare, status }
      });

      res.json(updatedShare);
    } catch (error) {
      console.error('Update fulfillment error:', error);
      res.status(500).json({ message: 'Failed to update fulfillment status' });
    }
  });

  // Get prescription fulfillment history for a patient
  app.get('/api/patients/:patientId/prescription-shares', async (req, res) => {
    try {
      const { patientId } = req.params;
      const prescriptionShares = await storage.getPrescriptionSharesByPatient(patientId);

      // Enrich with pharmacy data
      const enrichedShares = await Promise.all(
        prescriptionShares.map(async (share) => {
          const pharmacy = await storage.getCollaborator(share.pharmacyId);
          const medicalRecord = await storage.getMedicalRecord(share.medicalRecordId);
          return {
            ...share,
            pharmacy: pharmacy ? {
              id: pharmacy.id,
              name: pharmacy.name,
              phone: pharmacy.phone,
              address: pharmacy.address
            } : null,
            prescription: medicalRecord?.prescription
          };
        })
      );

      res.json(enrichedShares);
    } catch (error) {
      console.error('Get patient prescription shares error:', error);
      res.status(500).json({ message: 'Failed to get patient prescription shares' });
    }
  });

  // Get pharmacy analytics and statistics
  app.get('/api/pharmacies/:pharmacyId/analytics', async (req, res) => {
    try {
      const { pharmacyId } = req.params;
      
      // Validate pharmacy exists
      const pharmacy = await storage.getCollaborator(pharmacyId);
      if (!pharmacy || pharmacy.type !== 'pharmacy') {
        return res.status(404).json({ message: 'Pharmacy not found' });
      }

      const prescriptionShares = await storage.getPrescriptionSharesByPharmacy(pharmacyId);
      const integrationLogs = await storage.getCollaboratorIntegrationsByCollaborator(pharmacyId);

      // Calculate statistics
      const totalShares = prescriptionShares.length;
      const completedShares = prescriptionShares.filter(share => 
        ['dispensed', 'completed'].includes(share.status)
      ).length;
      const pendingShares = prescriptionShares.filter(share => 
        share.status === 'pending'
      ).length;
      const cancelledShares = prescriptionShares.filter(share => 
        share.status === 'cancelled'
      ).length;

      // Average fulfillment time (in hours)
      const fulfilledShares = prescriptionShares.filter(share => 
        share.dispensedAt && share.createdAt
      );
      const avgFulfillmentTime = fulfilledShares.length > 0
        ? fulfilledShares.reduce((sum, share) => {
            const timeDiff = new Date(share.dispensedAt!).getTime() - new Date(share.createdAt).getTime();
            return sum + (timeDiff / (1000 * 60 * 60)); // Convert to hours
          }, 0) / fulfilledShares.length
        : 0;

      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentShares = prescriptionShares.filter(share => 
        new Date(share.createdAt) >= thirtyDaysAgo
      );

      res.json({
        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.name,
          type: pharmacy.type
        },
        statistics: {
          totalShares,
          completedShares,
          pendingShares,
          cancelledShares,
          completionRate: totalShares > 0 ? (completedShares / totalShares * 100) : 0,
          avgFulfillmentTimeHours: Math.round(avgFulfillmentTime * 100) / 100,
          recentActivity: recentShares.length,
          integrationEvents: integrationLogs.length
        },
        recentShares: recentShares.slice(0, 10) // Last 10 recent shares
      });
    } catch (error) {
      console.error('Get pharmacy analytics error:', error);
      res.status(500).json({ message: 'Failed to get pharmacy analytics' });
    }
  });

  // Pharmacy API key validation endpoint (for external pharmacy systems)
  app.post('/api/pharmacies/validate-access', async (req, res) => {
    try {
      const { apiKey, pharmacyId } = req.body;
      
      if (!apiKey || !pharmacyId) {
        return res.status(400).json({ message: 'API key and pharmacy ID are required' });
      }

      // Hash the provided API key for comparison
      // In production, use proper salting and timing-safe comparison
      const hashedKey = require('crypto').createHash('sha256').update(apiKey).digest('hex');
      const validApiKey = await storage.validateApiKey(hashedKey);
      
      if (!validApiKey || validApiKey.collaboratorId !== pharmacyId) {
        return res.status(401).json({ message: 'Invalid API key or pharmacy ID' });
      }

      const pharmacy = await storage.getCollaborator(pharmacyId);
      if (!pharmacy || pharmacy.type !== 'pharmacy') {
        return res.status(404).json({ message: 'Pharmacy not found' });
      }

      // Update last access time
      await storage.updateCollaboratorApiKey(validApiKey.id, {
        lastUsed: new Date()
      });

      res.json({
        valid: true,
        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.name,
          permissions: ['read_prescriptions', 'update_fulfillment']
        }
      });
    } catch (error) {
      console.error('Validate API key error:', error);
      res.status(500).json({ message: 'Failed to validate API key' });
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
