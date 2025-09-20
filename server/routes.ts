import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { openAIService } from "./services/openai";
import { whatsAppService } from "./services/whatsapp";
import { SchedulingService } from "./services/scheduling";
import { insertPatientSchema, insertAppointmentSchema, insertWhatsappMessageSchema, DEFAULT_DOCTOR_ID } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize default doctor if not exists and get the actual ID
  const actualDoctorId = await initializeDefaultDoctor();
  
  // Initialize scheduling service
  const schedulingService = new SchedulingService(storage);
  
  // Ensure default schedule exists for the doctor
  await schedulingService.createDefaultSchedule(actualDoctorId);
  
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
          const availableSlots = await schedulingService.getAvailableSlots(actualDoctorId);
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
              actualDoctorId,
              scheduledAt.toISOString().split('T')[0],
              scheduledAt.toTimeString().slice(0, 5)
            );

            if (!isAvailable) {
              aiResponse = 'Desculpe, esse horário não está mais disponível. Por favor, escolha outro horário.';
            } else {
              // Create appointment automatically
              const appointment = await storage.createAppointment({
                patientId: patient.id,
                doctorId: actualDoctorId,
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

  app.post('/api/medical-records/:patientId/analyze', async (req, res) => {
    try {
      const { symptoms, history } = req.body;
      const hypotheses = await openAIService.generateDiagnosticHypotheses(symptoms, history);
      res.json(hypotheses);
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate diagnostic hypotheses' });
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

  // Missing routes that are called by frontend
  app.get('/api/whatsapp/messages/recent', async (req, res) => {
    try {
      // Get recent messages from all patients (last 50)
      const messages = await storage.getUnprocessedWhatsappMessages();
      res.json(messages.slice(0, 50));
    } catch (error) {
      console.error('Recent messages error:', error);
      res.status(500).json({ message: 'Failed to get recent messages' });
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
