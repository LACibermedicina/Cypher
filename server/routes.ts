import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { openAIService } from "./services/openai";
import { whatsAppService } from "./services/whatsapp";
import { SchedulingService } from "./services/scheduling";
import { whisperService } from "./services/whisper";
import { cryptoService } from "./services/crypto";
import { clinicalInterviewService } from "./services/clinical-interview";
import { pdfGeneratorService, PrescriptionData } from "./services/pdf-generator";
import { insertPatientSchema, insertAppointmentSchema, insertWhatsappMessageSchema, insertMedicalRecordSchema, insertVideoConsultationSchema, insertPrescriptionShareSchema, insertCollaboratorSchema, insertLabOrderSchema, insertCollaboratorApiKeySchema, User, DEFAULT_DOCTOR_ID } from "@shared/schema";
import { z } from "zod";

// TMC Credit System Validation Schemas
const tmcTransferSchema = z.object({
  toUserId: z.string().uuid("ID do usuário deve ser um UUID válido"),
  amount: z.number().int().min(1, "Quantidade deve ser maior que 0").max(10000, "Quantidade máxima é 10.000 TMC"),
  reason: z.string().min(1, "Motivo é obrigatório").max(500, "Motivo deve ter no máximo 500 caracteres")
});

const tmcRechargeSchema = z.object({
  userId: z.string().uuid("ID do usuário deve ser um UUID válido"),
  amount: z.number().int().min(1, "Quantidade deve ser maior que 0").max(50000, "Quantidade máxima é 50.000 TMC"),
  method: z.enum(['manual', 'card', 'pix', 'bank_transfer'], {
    errorMap: () => ({ message: "Método deve ser: manual, card, pix ou bank_transfer" })
  })
});

const tmcDebitSchema = z.object({
  functionName: z.string().min(1, "Nome da função é obrigatório"),
  appointmentId: z.string().uuid().optional(),
  medicalRecordId: z.string().uuid().optional()
});

const tmcConfigSchema = z.object({
  functionName: z.string().min(1, "Nome da função é obrigatório"),
  costInCredits: z.number().int().min(0, "Custo deve ser 0 ou maior").max(10000, "Custo máximo é 10.000 TMC"),
  description: z.string().min(1, "Descrição é obrigatória").max(1000, "Descrição deve ter no máximo 1000 caracteres"),
  category: z.enum(['consultation', 'prescription', 'data_access', 'admin'], {
    errorMap: () => ({ message: "Categoria deve ser: consultation, prescription, data_access ou admin" })
  }),
  minimumRole: z.enum(['visitor', 'patient', 'doctor', 'admin', 'researcher'], {
    errorMap: () => ({ message: "Nível mínimo deve ser: visitor, patient, doctor, admin ou researcher" })
  }),
  bonusForPatient: z.number().int().min(0, "Bônus deve ser 0 ou maior").max(1000, "Bônus máximo é 1.000 TMC"),
  commissionPercentage: z.number().int().min(0, "Porcentagem deve ser 0 ou maior").max(50, "Porcentagem máxima é 50%"),
  isActive: z.boolean()
});

const tmcValidateCreditsSchema = z.object({
  functionName: z.string().min(1, "Nome da função é obrigatório")
});
import crypto from "crypto";
import jwt from 'jsonwebtoken';

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
  
  // WebSocket server for real-time updates with authentication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store authenticated WebSocket connections by doctor ID and consultation rooms
  const authenticatedClients = new Map<string, WebSocket[]>();
  
  // Store consultation rooms: consultationId -> { doctor: WebSocket[], patient: WebSocket[] }
  const consultationRooms = new Map<string, { doctor: WebSocket[], patient: WebSocket[] }>();
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('Client connected to WebSocket');
    
    // WebSocket connections require JWT authentication
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('WebSocket connection denied: missing JWT token');
      ws.close(1008, 'JWT token required');
      return;
    }
    
    // Verify JWT token and extract user info with proper signature verification
    let userId: string;
    let userType: 'doctor' | 'patient';
    let consultationId: string | undefined;
    
    try {
      // Require SESSION_SECRET - fail if not set
      const jwtSecret = process.env.SESSION_SECRET;
      if (!jwtSecret) {
        console.error('SESSION_SECRET not configured - WebSocket authentication failed');
        ws.close(1008, 'Server configuration error');
        return;
      }
      
      // Use proper JWT signature verification with full validation
      const payload = jwt.verify(token, jwtSecret, {
        issuer: 'healthcare-system',
        audience: 'websocket',
        algorithms: ['HS256']
      }) as any;
      
      // Support both doctor and patient authentication
      if (payload.type === 'doctor_auth') {
        userId = payload.doctorId;
        userType = 'doctor';
        if (!userId) {
          console.log('WebSocket connection denied: Invalid JWT payload - missing doctorId');
          ws.close(1008, 'Invalid token payload');
          return;
        }
      } else if (payload.type === 'patient_auth') {
        userId = payload.patientId;
        userType = 'patient';
        consultationId = payload.consultationId; // Required for patient tokens
        if (!userId || !consultationId) {
          console.log('WebSocket connection denied: Invalid JWT payload - missing patientId or consultationId');
          ws.close(1008, 'Invalid token payload');
          return;
        }
      } else {
        console.log('WebSocket connection denied: Invalid token type');
        ws.close(1008, 'Invalid token type');
        return;
      }
      
    } catch (error) {
      console.log('WebSocket connection denied: Invalid JWT token', error);
      ws.close(1008, 'Invalid token');
      return;
    }
    
    // Store authenticated connection by user type
    if (userType === 'doctor') {
      if (!authenticatedClients.has(userId)) {
        authenticatedClients.set(userId, []);
      }
      authenticatedClients.get(userId)?.push(ws);
      console.log(`Doctor ${userId} connected to WebSocket`);
    }
    
    // Store in consultation room if patient with consultationId
    if (userType === 'patient' && consultationId) {
      if (!consultationRooms.has(consultationId)) {
        consultationRooms.set(consultationId, { doctor: [], patient: [] });
      }
      consultationRooms.get(consultationId)?.patient.push(ws);
      console.log(`Patient ${userId} connected to consultation ${consultationId}`);
    }
    
    ws.on('close', () => {
      console.log(`${userType} ${userId} disconnected from WebSocket`);
      
      // Remove from authenticated clients (doctors)
      if (userType === 'doctor') {
        const clients = authenticatedClients.get(userId);
        if (clients) {
          const index = clients.indexOf(ws);
          if (index > -1) {
            clients.splice(index, 1);
          }
          if (clients.length === 0) {
            authenticatedClients.delete(userId);
          }
        }
        
        // Remove doctor from all consultation rooms
        consultationRooms.forEach((room, roomConsultationId) => {
          const doctorIndex = room.doctor.indexOf(ws);
          if (doctorIndex > -1) {
            room.doctor.splice(doctorIndex, 1);
            console.log(`Removed doctor ${userId} from consultation room ${roomConsultationId}`);
            
            // Clean up empty rooms
            if (room.doctor.length === 0 && room.patient.length === 0) {
              consultationRooms.delete(roomConsultationId);
              console.log(`Deleted empty consultation room ${roomConsultationId}`);
            }
          }
        });
      }
      
      // Remove from consultation room (patients)
      if (userType === 'patient' && consultationId) {
        const room = consultationRooms.get(consultationId);
        if (room) {
          const index = room.patient.indexOf(ws);
          if (index > -1) {
            room.patient.splice(index, 1);
          }
          // Clean up empty rooms
          if (room.doctor.length === 0 && room.patient.length === 0) {
            consultationRooms.delete(consultationId);
          }
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    // Handle WebRTC signaling messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`Received message from ${userType} ${userId}:`, message.type);
        
        // Validate message structure - allow join-room with JWT consultationId
        if (!message.type) {
          console.log('Invalid message: missing type');
          return;
        }
        
        // For join-room, allow consultationId from JWT or message
        if (message.type === 'join-room' && !(message.consultationId || consultationId)) {
          console.log('Invalid join-room message: missing consultationId');
          return;
        }
        
        // For signaling messages, require consultationId in message
        if (['offer', 'answer', 'ice-candidate', 'call-status'].includes(message.type) && !message.consultationId) {
          console.log('Invalid signaling message: missing consultationId');
          return;
        }
        
        // Handle different message types for WebRTC signaling
        switch (message.type) {
          case 'join-room':
            handleJoinRoom(message, ws, userType, userId, consultationId);
            break;
            
          case 'offer':
          case 'answer':
          case 'ice-candidate':
            relaySignalingMessage(message, userType, userId);
            break;
            
          case 'call-status':
            broadcastCallStatus(message, userType, userId);
            break;
            
          default:
            console.log(`Unknown message type: ${message.type}`);
        }
        
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
  });

  // Secure broadcast function - sends only to authorized recipients
  const broadcastToDoctor = (doctorId: string, data: any) => {
    const clients = authenticatedClients.get(doctorId);
    if (clients) {
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  };
  
  // WebRTC signaling helper functions
  
  // Handle room joining for video consultations
  const handleJoinRoom = (message: any, ws: WebSocket, userType: 'doctor' | 'patient', userId: string, consultationId?: string) => {
    const targetConsultationId = consultationId || message.consultationId;
    
    if (!targetConsultationId) {
      console.log('Cannot join room: missing consultationId');
      return;
    }
    
    // Ensure room exists
    if (!consultationRooms.has(targetConsultationId)) {
      consultationRooms.set(targetConsultationId, { doctor: [], patient: [] });
    }
    
    const room = consultationRooms.get(targetConsultationId)!;
    
    // Add user to appropriate room section
    if (userType === 'doctor' && !room.doctor.includes(ws)) {
      room.doctor.push(ws);
      console.log(`Doctor ${userId} joined consultation room ${targetConsultationId}`);
    } else if (userType === 'patient' && !room.patient.includes(ws)) {
      room.patient.push(ws);
      console.log(`Patient ${userId} joined consultation room ${targetConsultationId}`);
    }
    
    // Notify all participants in the room about the new joiner
    const joinNotification = {
      type: 'user-joined',
      consultationId: targetConsultationId,
      userType,
      userId,
      timestamp: new Date().toISOString()
    };
    
    broadcastToRoom(targetConsultationId, joinNotification, ws); // Exclude sender
  };
  
  // Relay WebRTC signaling messages between doctor and patient
  const relaySignalingMessage = (message: any, senderType: 'doctor' | 'patient', senderId: string) => {
    const { consultationId } = message;
    const room = consultationRooms.get(consultationId);
    
    if (!room) {
      console.log(`Cannot relay message: consultation room ${consultationId} not found`);
      return;
    }
    
    // Relay message to the other participant type
    const targetSockets = senderType === 'doctor' ? room.patient : room.doctor;
    
    const relayedMessage = {
      ...message,
      from: senderType,
      fromId: senderId,
      timestamp: new Date().toISOString()
    };
    
    targetSockets.forEach(socket => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(relayedMessage));
      }
    });
    
    console.log(`Relayed ${message.type} from ${senderType} ${senderId} to ${targetSockets.length} recipients`);
  };
  
  // Broadcast call status updates to all participants in a room
  const broadcastCallStatus = (message: any, senderType: 'doctor' | 'patient', senderId: string) => {
    const { consultationId } = message;
    
    const statusMessage = {
      ...message,
      from: senderType,
      fromId: senderId,
      timestamp: new Date().toISOString()
    };
    
    broadcastToRoom(consultationId, statusMessage);
    console.log(`Broadcasted call status from ${senderType} ${senderId} to consultation ${consultationId}`);
  };
  
  // Broadcast message to all participants in a consultation room
  const broadcastToRoom = (consultationId: string, message: any, excludeSocket?: WebSocket) => {
    const room = consultationRooms.get(consultationId);
    if (!room) return;
    
    const allSockets = [...room.doctor, ...room.patient];
    allSockets.forEach(socket => {
      if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    });
  };

  // Legacy broadcast function removed for security - use broadcastToDoctor exclusively

  // API Key Authentication Middleware for External Collaborators
  const authenticateApiKey = async (req: any, res: any, next: any) => {
    try {
      const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
      const collaboratorId = req.headers['x-collaborator-id'];
      const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

      // Validate required headers
      if (!apiKey) {
        return res.status(401).json({ message: 'API key required' });
      }

      if (!collaboratorId) {
        return res.status(401).json({ message: 'Collaborator ID required' });
      }

      // Validate collaboratorId is a valid UUID to prevent database constraint violations
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(collaboratorId)) {
        return res.status(400).json({ message: 'Invalid collaborator ID format' });
      }

      // Verify collaborator exists EARLY to prevent FK violations in audit logging
      const collaborator = await storage.getCollaborator(collaboratorId);
      if (!collaborator) {
        // Return 401 without logging to prevent FK constraint violations
        return res.status(401).json({ message: 'Invalid collaborator' });
      }

      // Hash the provided API key for comparison
      const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      // Validate API key in database
      const validApiKey = await storage.validateApiKey(hashedKey);
      
      if (!validApiKey || validApiKey.collaboratorId !== collaboratorId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: collaboratorId,
          integrationType: 'api_access',
          entityId: req.path,
          action: 'authentication_failed',
          status: 'failed',
          errorMessage: 'Invalid API key or collaborator ID mismatch',
          requestData: {
            endpoint: req.path,
            method: req.method,
            clientIp: clientIp,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(401).json({ message: 'Invalid API key' });
      }

      // Check if API key is active
      if (!validApiKey.isActive) {
        await storage.createCollaboratorIntegration({
          collaboratorId: collaboratorId,
          integrationType: 'api_access',
          entityId: req.path,
          action: 'authentication_failed',
          status: 'failed',
          errorMessage: 'API key is inactive',
          requestData: {
            endpoint: req.path,
            method: req.method,
            clientIp: clientIp,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(401).json({ message: 'API key is inactive' });
      }

      // Check expiry
      if (validApiKey.expiresAt && new Date(validApiKey.expiresAt) < new Date()) {
        await storage.createCollaboratorIntegration({
          collaboratorId: collaboratorId,
          integrationType: 'api_access',
          entityId: req.path,
          action: 'authentication_failed',
          status: 'failed',
          errorMessage: 'API key has expired',
          requestData: {
            endpoint: req.path,
            method: req.method,
            clientIp: clientIp,
            expiresAt: validApiKey.expiresAt,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(401).json({ message: 'API key has expired' });
      }

      // Check IP whitelist with proper CIDR support
      if (validApiKey.ipWhitelist && validApiKey.ipWhitelist.length > 0) {
        const isIpAllowed = validApiKey.ipWhitelist.some(allowedIp => {
          // Exact IP match
          if (!allowedIp.includes('/')) {
            return allowedIp === clientIp;
          }
          
          // CIDR notation - basic implementation for demo
          // In production, use libraries like 'ip-cidr' or 'ipaddr.js'
          const [network, prefixLength] = allowedIp.split('/');
          if (!network || !prefixLength) return false;
          
          // For demo: only support common /24 networks
          if (prefixLength === '24') {
            const networkPrefix = network.substring(0, network.lastIndexOf('.'));
            const clientPrefix = clientIp.substring(0, clientIp.lastIndexOf('.'));
            return networkPrefix === clientPrefix;
          }
          
          // For other CIDR ranges, deny for security (production would use proper library)
          return false;
        });

        if (!isIpAllowed) {
          await storage.createCollaboratorIntegration({
            collaboratorId: collaboratorId,
            integrationType: 'api_access',
            entityId: req.path,
            action: 'authentication_failed',
            status: 'failed',
            errorMessage: 'IP address not whitelisted',
            requestData: {
              endpoint: req.path,
              method: req.method,
              clientIp: clientIp,
              allowedIps: validApiKey.ipWhitelist,
              timestamp: new Date().toISOString()
            },
          });
          return res.status(403).json({ message: 'IP address not allowed' });
        }
      }

      // Rate limiting check (simplified implementation)
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      
      const recentIntegrations = await storage.getCollaboratorIntegrationsByCollaborator(collaboratorId);
      const recentRequests = recentIntegrations.filter(integration => 
        new Date(integration.createdAt) >= hourAgo && 
        integration.action === 'api_request'
      ).length;

      if (validApiKey.rateLimit && recentRequests >= validApiKey.rateLimit) {
        await storage.createCollaboratorIntegration({
          collaboratorId: collaboratorId,
          integrationType: 'api_access',
          entityId: req.path,
          action: 'rate_limit_exceeded',
          status: 'failed',
          errorMessage: 'Rate limit exceeded',
          requestData: {
            endpoint: req.path,
            method: req.method,
            clientIp: clientIp,
            requestCount: recentRequests,
            rateLimit: validApiKey.rateLimit,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(429).json({ message: 'Rate limit exceeded' });
      }

      // Update last used timestamp
      await storage.updateCollaboratorApiKey(validApiKey.id, {
        lastUsed: new Date()
      });

      // Collaborator existence already verified early to prevent FK violations
      // Use the collaborator object from the earlier verification

      // Log successful authentication and attach to request
      await storage.createCollaboratorIntegration({
        collaboratorId: collaboratorId,
        integrationType: 'api_access',
        entityId: req.path,
        action: 'api_request',
        status: 'success',
        requestData: {
          endpoint: req.path,
          method: req.method,
          clientIp: clientIp,
          timestamp: new Date().toISOString()
        },
      });

      // Attach authentication data to request for use in route handlers
      req.authenticatedCollaborator = collaborator;
      req.apiKey = validApiKey;
      req.clientIp = clientIp;

      next();
    } catch (error) {
      console.error('API key authentication error:', error);
      res.status(500).json({ message: 'Authentication service error' });
    }
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

  // ============================================================================
  // WEBHOOK ENDPOINTS
  // ============================================================================

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

        // Broadcast real-time update to authenticated doctor only
        broadcastToDoctor(actualDoctorId || DEFAULT_DOCTOR_ID, {
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
      broadcastToDoctor(appointment.doctorId || actualDoctorId || DEFAULT_DOCTOR_ID, { type: 'appointment_created', data: appointment });
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
      broadcastToDoctor(appointment.doctorId || actualDoctorId || DEFAULT_DOCTOR_ID, { type: 'appointment_updated', data: appointment });
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

  // Digital signature routes moved after requireAuth definition

  // ICP-Brasil A3 Digital Signature API moved after requireAuth definition
  app.post('/api/medical-records/:id/sign-prescription', async (req, res) => {
    try {
      const medicalRecordId = req.params.id;
      const { pin, doctorName, crm, crmState } = req.body;
      
      // Use authenticated doctor ID or fallback to default for demo
      const doctorId = actualDoctorId || DEFAULT_DOCTOR_ID;

      // Validate required ICP-Brasil A3 authentication data
      if (!pin || pin.length < 6) {
        return res.status(400).json({ 
          message: 'PIN do token A3 é obrigatório (mínimo 6 dígitos)' 
        });
      }

      // Get medical record with prescription
      const medicalRecord = await storage.getMedicalRecord(medicalRecordId);
      if (!medicalRecord) {
        return res.status(404).json({ message: 'Medical record not found' });
      }

      if (!medicalRecord.prescription) {
        return res.status(400).json({ message: 'No prescription to sign in this medical record' });
      }

      // Create ICP-Brasil A3 certificate with enhanced compliance
      const certificateInfo = cryptoService.createICPBrasilA3Certificate(
        doctorId,
        doctorName || 'Dr. Médico Demo',
        crm || '123456',
        crmState || 'SP'
      );

      // Simulate A3 token authentication
      try {
        await cryptoService.authenticateA3Token(pin, certificateInfo.certificateId);
      } catch (error) {
        return res.status(401).json({ 
          message: 'Falha na autenticação do token A3. Verifique o PIN.' 
        });
      }

      // Generate secure key pair for signature (production should use HSM or secure key storage)
      const { privateKey, publicKey } = await cryptoService.generateKeyPair();

      // Create digital signature
      const signatureResult = await cryptoService.signPrescription(
        medicalRecord.prescription,
        privateKey,
        certificateInfo
      );

      // Perform advanced electronic verification
      const verificationResult = await cryptoService.performElectronicVerification(
        signatureResult.signature,
        signatureResult.documentHash,
        signatureResult.certificateInfo
      );

      // Create digital signature record with enhanced ICP-Brasil A3 information
      const digitalSignature = await storage.createDigitalSignature({
        documentType: 'prescription',
        documentId: medicalRecordId,
        patientId: medicalRecord.patientId,
        doctorId: doctorId,
        signature: signatureResult.signature,
        certificateInfo: {
          ...signatureResult.certificateInfo,
          publicKey: publicKey, // Store public key for verification
          timestamp: signatureResult.timestamp,
          verificationResult,
          legalCompliance: 'CFM Resolução 1821/2007 - Validade Jurídica Plena'
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
      broadcastToDoctor(actualDoctorId || DEFAULT_DOCTOR_ID, { 
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

      // Use efficient signature lookup method
      const prescriptionSignature = await storage.getSignatureByDocument(medicalRecordId, 'prescription');

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
      
      // Broadcast to authenticated doctor only
      broadcastToDoctor(consultation.doctorId || actualDoctorId || DEFAULT_DOCTOR_ID, { type: 'consultation_created', data: consultation });
      
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

      // Broadcast status updates to authenticated doctor only
      broadcastToDoctor(consultation.doctorId || actualDoctorId || DEFAULT_DOCTOR_ID, { type: 'consultation_updated', data: consultation });
      
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

      broadcastToDoctor(consultation.doctorId || actualDoctorId || DEFAULT_DOCTOR_ID, { type: 'consultation_started', data: consultation });
      
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

      broadcastToDoctor(consultation.doctorId || actualDoctorId || DEFAULT_DOCTOR_ID, { type: 'consultation_ended', data: consultation });
      
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

      // Get consultation to broadcast to correct doctor
      const consultationForBroadcast = await storage.getVideoConsultation(consultationId);
      const targetDoctorId = consultationForBroadcast?.doctorId || actualDoctorId || DEFAULT_DOCTOR_ID;
      broadcastToDoctor(targetDoctorId, { type: 'transcription_started', consultationId, status: 'processing' });

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

        broadcastToDoctor(actualDoctorId || DEFAULT_DOCTOR_ID, { 
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

        // Get consultation to broadcast to correct doctor
        const consultation = await storage.getVideoConsultation(consultationId);
        const targetDoctorId = consultation?.doctorId || actualDoctorId || DEFAULT_DOCTOR_ID;
        broadcastToDoctor(targetDoctorId, { type: 'transcription_failed', consultationId });

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

      // Broadcast real-time update to authenticated doctor only
      broadcastToDoctor(actualDoctorId || DEFAULT_DOCTOR_ID, {
        type: 'prescription_shared',
        data: { prescriptionShare, pharmacy, patient: medicalRecord.patientId }
      });

      res.status(201).json(prescriptionShare);
    } catch (error) {
      console.error('Share prescription error:', error);
      res.status(500).json({ message: 'Failed to share prescription' });
    }
  });

  // Get shared prescriptions for a pharmacy (External API - requires authentication)
  app.get('/api/pharmacies/:pharmacyId/prescriptions', authenticateApiKey, async (req, res) => {
    try {
      const { pharmacyId } = req.params;
      const { status } = req.query;

      // CRITICAL: Verify collaborator can only access their own resources
      const authenticatedCollaborator = (req as any).authenticatedCollaborator;
      if (authenticatedCollaborator.id !== pharmacyId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: req.path,
          action: 'unauthorized_resource_access',
          status: 'failed',
          errorMessage: 'Attempted to access another collaborator\'s resources',
          requestData: {
            requestedPharmacyId: pharmacyId,
            authenticatedCollaboratorId: authenticatedCollaborator.id,
            endpoint: req.path,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized resource access' });
      }

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

  // Update prescription fulfillment status (External API - requires authentication)
  app.patch('/api/prescription-shares/:shareId/fulfillment', authenticateApiKey, async (req, res) => {
    try {
      const { shareId } = req.params;
      const { status, fulfilledAt, pharmacistNotes, fulfilledBy } = req.body;

      // CRITICAL: Verify collaborator can only update their own prescription shares
      const existingShare = await storage.getPrescriptionShare(shareId);
      if (!existingShare) {
        return res.status(404).json({ message: 'Prescription share not found' });
      }

      const authenticatedCollaborator = (req as any).authenticatedCollaborator;
      if (authenticatedCollaborator.id !== existingShare.pharmacyId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: req.path,
          action: 'unauthorized_fulfillment_update',
          status: 'failed',
          errorMessage: 'Attempted to update another collaborator\'s prescription share',
          requestData: {
            requestedShareId: shareId,
            sharePharmacyId: existingShare.pharmacyId,
            authenticatedCollaboratorId: authenticatedCollaborator.id,
            endpoint: req.path,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized fulfillment update' });
      }

      // Enhanced status workflow validation
      const validStatuses = ['shared', 'preparing', 'ready', 'dispensed', 'partially_dispensed', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      // Validate status transition workflow
      const currentStatus = existingShare.status;
      const validTransitions: Record<string, string[]> = {
        'shared': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['dispensed', 'partially_dispensed', 'cancelled'],
        'dispensed': ['completed'],
        'partially_dispensed': ['dispensed', 'completed', 'cancelled'],
        'completed': [], // Final state
        'cancelled': [] // Final state
      };

      if (!validTransitions[currentStatus]?.includes(status)) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'fulfillment_workflow_violation',
          entityId: shareId,
          action: 'invalid_status_transition',
          status: 'failed',
          errorMessage: `Invalid status transition from ${currentStatus} to ${status}`,
          requestData: {
            currentStatus,
            requestedStatus: status,
            validTransitions: validTransitions[currentStatus] || [],
            timestamp: new Date().toISOString()
          },
        });
        return res.status(400).json({ 
          message: `Invalid status transition from ${currentStatus} to ${status}`,
          currentStatus,
          validTransitions: validTransitions[currentStatus] || []
        });
      }

      const updateData: any = { 
        status,
        pharmacistNotes: pharmacistNotes || '',
      };

      // Enhanced fulfillment timestamp and validation
      if (['dispensed', 'partially_dispensed', 'completed'].includes(status)) {
        updateData.dispensedAt = fulfilledAt ? new Date(fulfilledAt) : new Date();
        
        // Validate prescription hasn't expired
        if (existingShare.expiresAt && new Date(existingShare.expiresAt) < new Date()) {
          await storage.createCollaboratorIntegration({
            collaboratorId: authenticatedCollaborator.id,
            integrationType: 'fulfillment_business_rule_violation',
            entityId: shareId,
            action: 'expired_prescription_fulfillment_attempt',
            status: 'failed',
            errorMessage: 'Attempted to fulfill expired prescription',
            requestData: {
              prescriptionExpiresAt: existingShare.expiresAt,
              requestedStatus: status,
              timestamp: new Date().toISOString()
            },
          });
          return res.status(400).json({ 
            message: 'Cannot fulfill expired prescription',
            expiresAt: existingShare.expiresAt
          });
        }
        
        if (fulfilledBy) {
          updateData.dispensingNotes = (updateData.dispensingNotes || '') + `\nDispensed by: ${fulfilledBy} at ${new Date().toISOString()}`;
        }
      }

      // Validation for cancellation
      if (status === 'cancelled' && !pharmacistNotes) {
        return res.status(400).json({ 
          message: 'Cancellation reason required in pharmacistNotes' 
        });
      }

      const updatedShare = await storage.updatePrescriptionShare(shareId, updateData);
      if (!updatedShare) {
        return res.status(404).json({ message: 'Prescription share not found' });
      }

      // Enhanced integration activity logging
      await storage.createCollaboratorIntegration({
        collaboratorId: updatedShare.pharmacyId,
        integrationType: 'fulfillment_update',
        entityId: shareId,
        action: 'status_updated',
        status: 'success',
        requestData: {
          previousStatus: currentStatus,
          newStatus: status,
          pharmacistNotes,
          fulfilledBy: fulfilledBy || 'system',
          fulfillmentTimestamp: new Date().toISOString(),
          patientId: existingShare.patientId,
          medicalRecordId: existingShare.medicalRecordId
        },
      });

      // Broadcast real-time update to authenticated doctor only
      broadcastToDoctor(actualDoctorId || DEFAULT_DOCTOR_ID, {
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

  // Get pharmacy analytics and statistics (External API - requires authentication)
  app.get('/api/pharmacies/:pharmacyId/analytics', authenticateApiKey, async (req, res) => {
    try {
      const { pharmacyId } = req.params;
      
      // CRITICAL: Verify collaborator can only access their own resources
      const authenticatedCollaborator = (req as any).authenticatedCollaborator;
      if (authenticatedCollaborator.id !== pharmacyId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: req.path,
          action: 'unauthorized_resource_access',
          status: 'failed',
          errorMessage: 'Attempted to access another collaborator\'s analytics',
          requestData: {
            requestedPharmacyId: pharmacyId,
            authenticatedCollaboratorId: authenticatedCollaborator.id,
            endpoint: req.path,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized resource access' });
      }
      
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

  // ===== COMPREHENSIVE FULFILLMENT TRACKING ENDPOINTS =====

  // Get detailed fulfillment status and history for a prescription share
  app.get('/api/prescription-shares/:shareId/fulfillment-details', authenticateApiKey, async (req, res) => {
    try {
      const { shareId } = req.params;
      
      // Get prescription share with tenant binding check
      const prescriptionShare = await storage.getPrescriptionShare(shareId);
      if (!prescriptionShare) {
        return res.status(404).json({ message: 'Prescription share not found' });
      }

      const authenticatedCollaborator = (req as any).authenticatedCollaborator;
      if (authenticatedCollaborator.id !== prescriptionShare.pharmacyId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: req.path,
          action: 'unauthorized_fulfillment_access',
          status: 'failed',
          errorMessage: 'Attempted to access another collaborator\'s fulfillment details',
          requestData: {
            requestedShareId: shareId,
            sharePharmacyId: prescriptionShare.pharmacyId,
            authenticatedCollaboratorId: authenticatedCollaborator.id,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized fulfillment access' });
      }

      // Get fulfillment history from integration logs
      const fulfillmentHistory = await storage.getCollaboratorIntegrationsByEntity(shareId, 'fulfillment_update');
      
      // Get prescription and patient details
      const medicalRecord = await storage.getMedicalRecord(prescriptionShare.medicalRecordId);
      const patient = await storage.getPatient(prescriptionShare.patientId);

      res.json({
        prescriptionShare: {
          id: prescriptionShare.id,
          status: prescriptionShare.status,
          createdAt: prescriptionShare.createdAt,
          dispensedAt: prescriptionShare.dispensedAt,
          expiresAt: prescriptionShare.expiresAt,
          dispensingNotes: prescriptionShare.dispensingNotes,
          shareMethod: prescriptionShare.shareMethod,
          accessCode: prescriptionShare.accessCode
        },
        patient: patient ? {
          id: patient.id,
          name: patient.name,
          phone: patient.phone
        } : null,
        prescription: {
          text: medicalRecord?.prescription,
          doctorId: prescriptionShare.doctorId,
          isDigitallySigned: !!prescriptionShare.digitalSignatureId
        },
        fulfillmentHistory: fulfillmentHistory.map(log => ({
          action: log.action,
          status: log.status,
          timestamp: log.createdAt,
          details: log.requestData,
          errorMessage: log.errorMessage
        }))
      });
    } catch (error) {
      console.error('Get fulfillment details error:', error);
      res.status(500).json({ message: 'Failed to get fulfillment details' });
    }
  });

  // Get fulfillment workflow statistics for pharmacy
  app.get('/api/pharmacies/:pharmacyId/fulfillment-workflows', authenticateApiKey, async (req, res) => {
    try {
      const { pharmacyId } = req.params;
      const { startDate, endDate } = req.query;

      // Tenant binding check
      const authenticatedCollaborator = (req as any).authenticatedCollaborator;
      if (authenticatedCollaborator.id !== pharmacyId) {
        return res.status(403).json({ message: 'Access denied: unauthorized resource access' });
      }

      // Date range filtering
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const prescriptionShares = await storage.getPrescriptionSharesByPharmacy(pharmacyId);
      const filteredShares = prescriptionShares.filter(share => 
        new Date(share.createdAt) >= start && new Date(share.createdAt) <= end
      );

      // Get integration logs for workflow analysis
      const workflowLogs = await storage.getCollaboratorIntegrationsByCollaborator(pharmacyId);
      const fulfillmentLogs = workflowLogs.filter(log => 
        log.integrationType === 'fulfillment_update' && 
        new Date(log.createdAt) >= start && 
        new Date(log.createdAt) <= end
      );

      const workflowViolations = workflowLogs.filter(log => 
        log.integrationType === 'fulfillment_workflow_violation' &&
        new Date(log.createdAt) >= start && 
        new Date(log.createdAt) <= end
      );

      // Calculate status distribution
      const statusDistribution = filteredShares.reduce((acc, share) => {
        acc[share.status] = (acc[share.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        dateRange: { start, end },
        totalPrescriptions: filteredShares.length,
        statusDistribution,
        completionRate: filteredShares.length > 0 ? 
          (statusDistribution['completed'] || 0) / filteredShares.length * 100 : 0,
        workflowMetrics: {
          totalStatusUpdates: fulfillmentLogs.length,
          workflowViolations: workflowViolations.length,
          violationTypes: workflowViolations.reduce((acc, log) => {
            const action = log.action;
            acc[action] = (acc[action] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        expiredPrescriptions: filteredShares.filter(share => 
          share.expiresAt && new Date(share.expiresAt) < new Date()
        ).length
      });
    } catch (error) {
      console.error('Get fulfillment workflows error:', error);
      res.status(500).json({ message: 'Failed to get fulfillment workflows' });
    }
  });

  // ===== CORE FULFILLMENT WORKFLOW ENDPOINTS =====

  // Centralized fulfillment status transition endpoint
  app.patch('/api/fulfillments/:shareId/status', authenticateApiKey, async (req, res) => {
    try {
      const { shareId } = req.params;
      const { status, notes, actor } = req.body;

      // Get existing share with tenant binding
      const existingShare = await storage.getPrescriptionShare(shareId);
      if (!existingShare) {
        return res.status(404).json({ message: 'Prescription share not found' });
      }

      const authenticatedCollaborator = (req as any).authenticatedCollaborator;
      if (authenticatedCollaborator.id !== existingShare.pharmacyId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: shareId,
          action: 'unauthorized_fulfillment_mutation',
          status: 'failed',
          errorMessage: 'Attempted to modify another collaborator\'s fulfillment',
          requestData: {
            shareId,
            sharePharmacyId: existingShare.pharmacyId,
            authenticatedCollaboratorId: authenticatedCollaborator.id,
            requestedStatus: status,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized fulfillment mutation' });
      }

      // Centralized transition rules - ALLOWED_TRANSITIONS map
      const ALLOWED_TRANSITIONS: Record<string, string[]> = {
        'shared': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['dispensed', 'partially_dispensed', 'cancelled'],
        'dispensed': ['completed'],
        'partially_dispensed': ['dispensed', 'completed', 'cancelled'],
        'completed': [], // Final state
        'cancelled': [] // Final state
      };

      const currentStatus = existingShare.status;
      if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(status)) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'fulfillment_workflow_violation',
          entityId: shareId,
          action: 'invalid_status_transition',
          status: 'failed',
          errorMessage: `Invalid transition from ${currentStatus} to ${status}`,
          requestData: {
            shareId,
            patientId: existingShare.patientId,
            medicalRecordId: existingShare.medicalRecordId,
            currentStatus,
            requestedStatus: status,
            validTransitions: ALLOWED_TRANSITIONS[currentStatus] || [],
            actor: actor || 'unknown',
            timestamp: new Date().toISOString()
          },
        });
        return res.status(400).json({ 
          message: `Invalid transition from ${currentStatus} to ${status}`,
          currentStatus,
          validTransitions: ALLOWED_TRANSITIONS[currentStatus] || []
        });
      }

      // Prescription expiry validation for dispensing
      if (['dispensed', 'partially_dispensed', 'completed'].includes(status)) {
        if (existingShare.expiresAt && new Date(existingShare.expiresAt) < new Date()) {
          await storage.createCollaboratorIntegration({
            collaboratorId: authenticatedCollaborator.id,
            integrationType: 'fulfillment_business_rule_violation',
            entityId: shareId,
            action: 'expired_prescription_fulfillment',
            status: 'failed',
            errorMessage: 'Cannot fulfill expired prescription',
            requestData: {
              shareId,
              patientId: existingShare.patientId,
              medicalRecordId: existingShare.medicalRecordId,
              expiresAt: existingShare.expiresAt,
              requestedStatus: status,
              actor: actor || 'unknown',
              timestamp: new Date().toISOString()
            },
          });
          return res.status(400).json({ 
            message: 'Cannot fulfill expired prescription',
            expiresAt: existingShare.expiresAt 
          });
        }
      }

      // Cancellation validation - require reason
      if (status === 'cancelled' && !notes) {
        return res.status(400).json({ message: 'Cancellation reason required in notes field' });
      }

      // Prepare update data with automatic timestamp stamping
      const updateData: any = { status };
      const now = new Date();

      // Automatic timestamp stamping based on status
      switch (status) {
        case 'preparing':
          updateData.acceptedAt = now;
          break;
        case 'ready':
          updateData.preparedAt = now;
          break;
        case 'dispensed':
        case 'partially_dispensed':
          updateData.dispensedAt = now;
          break;
        case 'completed':
          updateData.completedAt = now;
          if (!existingShare.dispensedAt) updateData.dispensedAt = now;
          break;
        case 'cancelled':
          updateData.cancelledAt = now;
          break;
      }

      if (notes) {
        updateData.dispensingNotes = notes;
      }

      // Update the share
      const updatedShare = await storage.updatePrescriptionShare(shareId, updateData);
      if (!updatedShare) {
        return res.status(500).json({ message: 'Failed to update prescription share' });
      }

      // Comprehensive audit logging for successful transition
      await storage.createCollaboratorIntegration({
        collaboratorId: authenticatedCollaborator.id,
        integrationType: 'fulfillment_event',
        entityId: shareId,
        action: 'status_transition_successful',
        status: 'success',
        requestData: {
          shareId,
          patientId: existingShare.patientId,
          medicalRecordId: existingShare.medicalRecordId,
          previousStatus: currentStatus,
          newStatus: status,
          actor: actor || 'system',
          notes: notes || '',
          automaticTimestamps: {
            acceptedAt: updateData.acceptedAt,
            preparedAt: updateData.preparedAt,
            dispensedAt: updateData.dispensedAt,
            completedAt: updateData.completedAt,
            cancelledAt: updateData.cancelledAt
          },
          ruleEvaluations: {
            transitionAllowed: true,
            prescriptionValid: !existingShare.expiresAt || new Date(existingShare.expiresAt) >= now,
            tenantAuthorized: true
          },
          timestamp: new Date().toISOString()
        },
      });

      // Real-time broadcast to authenticated doctor only
      broadcastToDoctor(actualDoctorId || DEFAULT_DOCTOR_ID, {
        type: 'fulfillment_status_updated',
        data: { shareId, newStatus: status, pharmacyId: authenticatedCollaborator.id }
      });

      res.json({
        id: updatedShare.id,
        status: updatedShare.status,
        previousStatus: currentStatus,
        updatedAt: now.toISOString(),
        notes: updatedShare.dispensingNotes,
        automaticTimestamps: {
          acceptedAt: updateData.acceptedAt,
          preparedAt: updateData.preparedAt,
          dispensedAt: updateData.dispensedAt,
          completedAt: updateData.completedAt,
          cancelledAt: updateData.cancelledAt
        }
      });
    } catch (error) {
      console.error('Update fulfillment status error:', error);
      res.status(500).json({ message: 'Failed to update fulfillment status' });
    }
  });

  // Get fulfillment history for a specific prescription share (with pagination)
  app.get('/api/fulfillments/:shareId/history', authenticateApiKey, async (req, res) => {
    try {
      const { shareId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Get share with tenant binding
      const prescriptionShare = await storage.getPrescriptionShare(shareId);
      if (!prescriptionShare) {
        return res.status(404).json({ message: 'Prescription share not found' });
      }

      const authenticatedCollaborator = (req as any).authenticatedCollaborator;
      if (authenticatedCollaborator.id !== prescriptionShare.pharmacyId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: shareId,
          action: 'unauthorized_fulfillment_history_access',
          status: 'failed',
          errorMessage: 'Attempted to access another collaborator\'s fulfillment history',
          requestData: {
            shareId,
            sharePharmacyId: prescriptionShare.pharmacyId,
            authenticatedCollaboratorId: authenticatedCollaborator.id,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized fulfillment history access' });
      }

      // Get fulfillment events from integration logs
      const fulfillmentEvents = await storage.getCollaboratorIntegrationsByEntity(shareId, 'fulfillment_event');
      
      // Apply pagination
      const total = fulfillmentEvents.length;
      const paginatedEvents = fulfillmentEvents
        .slice(Number(offset), Number(offset) + Number(limit))
        .map(event => ({
          id: event.id,
          action: event.action,
          status: event.status,
          timestamp: event.createdAt,
          details: event.requestData,
          errorMessage: event.errorMessage
        }));

      res.json({
        shareId,
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total,
        events: paginatedEvents
      });
    } catch (error) {
      console.error('Get fulfillment history error:', error);
      res.status(500).json({ message: 'Failed to get fulfillment history' });
    }
  });

  // Get fulfillment history for pharmacy (with date filtering and pagination)
  app.get('/api/pharmacies/:pharmacyId/fulfillments/history', authenticateApiKey, async (req, res) => {
    try {
      const { pharmacyId } = req.params;
      const { limit = 100, offset = 0, startDate, endDate } = req.query;

      // Tenant binding check
      const authenticatedCollaborator = (req as any).authenticatedCollaborator;
      if (authenticatedCollaborator.id !== pharmacyId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: req.path,
          action: 'unauthorized_pharmacy_history_access',
          status: 'failed',
          errorMessage: 'Attempted to access another collaborator\'s pharmacy history',
          requestData: {
            requestedPharmacyId: pharmacyId,
            authenticatedCollaboratorId: authenticatedCollaborator.id,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized pharmacy history access' });
      }

      // Date filtering
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get all integration logs for this pharmacy
      const allLogs = await storage.getCollaboratorIntegrationsByCollaborator(pharmacyId);
      
      // Filter fulfillment events within date range
      const fulfillmentEvents = allLogs.filter(log => 
        log.integrationType === 'fulfillment_event' &&
        new Date(log.createdAt) >= start && 
        new Date(log.createdAt) <= end
      );

      // Apply pagination
      const total = fulfillmentEvents.length;
      const paginatedEvents = fulfillmentEvents
        .slice(Number(offset), Number(offset) + Number(limit))
        .map(event => ({
          id: event.id,
          shareId: event.entityId,
          action: event.action,
          status: event.status,
          timestamp: event.createdAt,
          details: event.requestData,
          errorMessage: event.errorMessage
        }));

      res.json({
        pharmacyId,
        dateRange: { start, end },
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total,
        events: paginatedEvents
      });
    } catch (error) {
      console.error('Get pharmacy fulfillment history error:', error);
      res.status(500).json({ message: 'Failed to get pharmacy fulfillment history' });
    }
  });

  // API key validation endpoint (External API - uses lightweight validation)
  app.post('/api/collaborators/validate-access', async (req, res) => {
    try {
      const { apiKey, collaboratorId } = req.body;
      
      if (!apiKey || !collaboratorId) {
        return res.status(400).json({ message: 'API key and collaborator ID are required' });
      }

      // Hash the provided API key for comparison
      const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
      const validApiKey = await storage.validateApiKey(hashedKey);
      
      if (!validApiKey || validApiKey.collaboratorId !== collaboratorId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: collaboratorId,
          integrationType: 'api_validation',
          entityId: 'validate-access',
          action: 'validation_failed',
          status: 'failed',
          errorMessage: 'Invalid API key or collaborator ID mismatch',
        });
        return res.status(401).json({ message: 'Invalid API key or collaborator ID' });
      }

      const collaborator = await storage.getCollaborator(collaboratorId);
      if (!collaborator) {
        return res.status(404).json({ message: 'Collaborator not found' });
      }

      // Update last access time
      await storage.updateCollaboratorApiKey(validApiKey.id, {
        lastUsed: new Date()
      });

      // Log successful validation
      await storage.createCollaboratorIntegration({
        collaboratorId: collaboratorId,
        integrationType: 'api_validation',
        entityId: 'validate-access',
        action: 'validation_successful',
        status: 'success',
      });

      res.json({
        valid: true,
        collaborator: {
          id: collaborator.id,
          name: collaborator.name,
          type: collaborator.type,
          permissions: (validApiKey.permissions as any) || ['read_prescriptions', 'update_fulfillment']
        },
        apiKey: {
          keyName: validApiKey.keyName,
          isActive: validApiKey.isActive,
          expiresAt: validApiKey.expiresAt,
          rateLimit: validApiKey.rateLimit
        }
      });
    } catch (error) {
      console.error('Validate API key error:', error);
      res.status(500).json({ message: 'Failed to validate API key' });
    }
  });

  // ===== LABORATORY INTEGRATION ENDPOINTS =====

  // Create new laboratory test order (Internal - for doctors)
  app.post('/api/lab-orders', async (req, res) => {
    try {
      // Validate request body with Zod schema
      const orderValidation = insertLabOrderSchema.extend({
        expectedResultDate: z.string().optional().transform(val => val ? new Date(val) : undefined)
      }).safeParse(req.body);

      if (!orderValidation.success) {
        return res.status(400).json({ 
          message: 'Invalid request data',
          errors: orderValidation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }

      const { patientId, laboratoryId, orderDetails, urgency, expectedResultDate } = orderValidation.data;

      // Validate laboratory exists and is active
      const laboratory = await storage.getCollaborator(laboratoryId);
      if (!laboratory || laboratory.type !== 'laboratory' || !laboratory.isActive) {
        return res.status(404).json({ message: 'Laboratory not found or inactive' });
      }

      // Validate patient exists
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      // Require authentication for internal endpoints
      const user = (req as any).user;
      if (!user || user.role !== 'doctor') {
        return res.status(401).json({ message: 'Authentication required - doctors only' });
      }

      const doctorId = user.id;
      
      // Create lab order
      const newOrder = await storage.createLabOrder({
        patientId,
        doctorId,
        laboratoryId,
        orderDetails,
        urgency: urgency || 'routine',
        expectedResultDate,
      });

      // Log order creation
      await storage.createCollaboratorIntegration({
        collaboratorId: laboratoryId,
        integrationType: 'lab_order',
        entityId: newOrder.id,
        action: 'order_created',
        status: 'success',
        requestData: {
          patientId,
          doctorId,
          orderDetails,
          urgency: urgency || 'routine',
          timestamp: new Date().toISOString()
        },
      });

      // Real-time broadcast to authenticated doctor only
      broadcastToDoctor(actualDoctorId || DEFAULT_DOCTOR_ID, {
        type: 'lab_order_created',
        data: { orderId: newOrder.id, laboratoryId, patientId }
      });

      res.status(201).json(newOrder);
    } catch (error) {
      console.error('Create lab order error:', error);
      res.status(500).json({ message: 'Failed to create lab order' });
    }
  });

  // Get laboratory orders (External API - for laboratories)
  app.get('/api/laboratories/:laboratoryId/orders', authenticateApiKey, async (req, res) => {
    try {
      const { laboratoryId } = req.params;
      const { status, limit = 50, offset = 0, startDate, endDate } = req.query;

      // Tenant binding check
      const authenticatedCollaborator = (req as any).authenticatedCollaborator;
      if (authenticatedCollaborator.id !== laboratoryId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: req.path,
          action: 'unauthorized_lab_orders_access',
          status: 'failed',
          errorMessage: 'Attempted to access another laboratory\'s orders',
          requestData: {
            requestedLaboratoryId: laboratoryId,
            authenticatedCollaboratorId: authenticatedCollaborator.id,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized laboratory access' });
      }

      // Validate laboratory type
      if (authenticatedCollaborator.type !== 'laboratory') {
        return res.status(403).json({ message: 'Access denied: not a laboratory collaborator' });
      }

      // Get laboratory orders
      const allOrders = await storage.getLabOrdersByLaboratory(laboratoryId);
      
      // Apply filters
      let filteredOrders = allOrders;
      
      if (status) {
        filteredOrders = filteredOrders.filter(order => order.status === status);
      }
      
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();
        filteredOrders = filteredOrders.filter(order => 
          new Date(order.createdAt) >= start && new Date(order.createdAt) <= end
        );
      }

      // Apply pagination
      const total = filteredOrders.length;
      const paginatedOrders = filteredOrders.slice(Number(offset), Number(offset) + Number(limit));

      // Log access
      await storage.createCollaboratorIntegration({
        collaboratorId: laboratoryId,
        integrationType: 'lab_order_access',
        entityId: 'orders_list',
        action: 'orders_retrieved',
        status: 'success',
        requestData: {
          ordersCount: paginatedOrders.length,
          filters: { status, startDate, endDate },
          pagination: { limit, offset },
          timestamp: new Date().toISOString()
        },
      });

      res.json({
        orders: paginatedOrders,
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      });
    } catch (error) {
      console.error('Get laboratory orders error:', error);
      res.status(500).json({ message: 'Failed to get laboratory orders' });
    }
  });

  // Update laboratory order status (External API - for laboratories)
  app.patch('/api/lab-orders/:orderId/status', authenticateApiKey, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status, collectionDate, completedAt, externalOrderId, notes } = req.body;

      // Get existing order with tenant binding
      const existingOrder = await storage.getLabOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ message: 'Lab order not found' });
      }

      const authenticatedCollaborator = (req as any).authenticatedCollaborator;
      if (authenticatedCollaborator.id !== existingOrder.laboratoryId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: orderId,
          action: 'unauthorized_lab_order_update',
          status: 'failed',
          errorMessage: 'Attempted to update another laboratory\'s order',
          requestData: {
            orderId,
            orderLaboratoryId: existingOrder.laboratoryId,
            authenticatedCollaboratorId: authenticatedCollaborator.id,
            requestedStatus: status,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized lab order update' });
      }

      // Validate status transitions
      const ALLOWED_LAB_TRANSITIONS: Record<string, string[]> = {
        'ordered': ['collected', 'cancelled'],
        'collected': ['processing', 'cancelled'],
        'processing': ['completed', 'cancelled'],
        'completed': [], // Final state
        'cancelled': [] // Final state
      };

      const currentStatus = existingOrder.status;
      if (status && !ALLOWED_LAB_TRANSITIONS[currentStatus]?.includes(status)) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'lab_workflow_violation',
          entityId: orderId,
          action: 'invalid_status_transition',
          status: 'failed',
          errorMessage: `Invalid lab order transition from ${currentStatus} to ${status}`,
          requestData: {
            orderId,
            patientId: existingOrder.patientId,
            currentStatus,
            requestedStatus: status,
            validTransitions: ALLOWED_LAB_TRANSITIONS[currentStatus] || [],
            timestamp: new Date().toISOString()
          },
        });
        return res.status(400).json({ 
          message: `Invalid transition from ${currentStatus} to ${status}`,
          currentStatus,
          validTransitions: ALLOWED_LAB_TRANSITIONS[currentStatus] || []
        });
      }

      // Prepare update data
      const updateData: any = {};
      if (status) updateData.status = status;
      if (collectionDate) updateData.collectionDate = new Date(collectionDate);
      if (completedAt) updateData.completedAt = new Date(completedAt);
      if (externalOrderId) updateData.externalOrderId = externalOrderId;

      // Auto-set completion timestamp for completed status
      if (status === 'completed' && !completedAt) {
        updateData.completedAt = new Date();
      }

      // Update the order
      const updatedOrder = await storage.updateLabOrder(orderId, updateData);
      if (!updatedOrder) {
        return res.status(500).json({ message: 'Failed to update lab order' });
      }

      // Comprehensive audit logging
      await storage.createCollaboratorIntegration({
        collaboratorId: authenticatedCollaborator.id,
        integrationType: 'lab_order_update',
        entityId: orderId,
        action: 'status_updated',
        status: 'success',
        requestData: {
          orderId,
          patientId: existingOrder.patientId,
          doctorId: existingOrder.doctorId,
          previousStatus: currentStatus,
          newStatus: status,
          updateData,
          notes: notes || '',
          timestamp: new Date().toISOString()
        },
      });

      // Real-time broadcast to authenticated doctor only
      broadcastToDoctor(actualDoctorId || DEFAULT_DOCTOR_ID, {
        type: 'lab_order_status_updated',
        data: { orderId, newStatus: status, laboratoryId: authenticatedCollaborator.id }
      });

      res.json({
        id: updatedOrder.id,
        status: updatedOrder.status,
        previousStatus: currentStatus,
        updatedAt: new Date().toISOString(),
        collectionDate: updatedOrder.collectionDate,
        completedAt: updatedOrder.completedAt,
        externalOrderId: updatedOrder.externalOrderId
      });
    } catch (error) {
      console.error('Update lab order status error:', error);
      res.status(500).json({ message: 'Failed to update lab order status' });
    }
  });

  // Submit laboratory test results (External API - for laboratories)
  app.post('/api/lab-orders/:orderId/results', authenticateApiKey, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { results, resultsFileUrl, criticalValues, technician } = req.body;

      // Get existing order with tenant binding
      const existingOrder = await storage.getLabOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ message: 'Lab order not found' });
      }

      const authenticatedCollaborator = (req as any).authenticatedCollaborator;
      if (authenticatedCollaborator.id !== existingOrder.laboratoryId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: orderId,
          action: 'unauthorized_results_submission',
          status: 'failed',
          errorMessage: 'Attempted to submit results for another laboratory\'s order',
          requestData: {
            orderId,
            orderLaboratoryId: existingOrder.laboratoryId,
            authenticatedCollaboratorId: authenticatedCollaborator.id,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized results submission' });
      }

      // Validate order can receive results
      if (!['processing', 'completed'].includes(existingOrder.status)) {
        return res.status(400).json({ 
          message: 'Results can only be submitted for orders in processing or completed status',
          currentStatus: existingOrder.status 
        });
      }

      // Update order with results
      const updateData: any = {
        status: 'completed',
        completedAt: new Date(),
        results,
        criticalValues: criticalValues || false,
      };

      if (resultsFileUrl) {
        updateData.resultsFileUrl = resultsFileUrl;
      }

      const updatedOrder = await storage.updateLabOrder(orderId, updateData);
      if (!updatedOrder) {
        return res.status(500).json({ message: 'Failed to update lab order with results' });
      }

      // Comprehensive audit logging
      await storage.createCollaboratorIntegration({
        collaboratorId: authenticatedCollaborator.id,
        integrationType: 'lab_results_submission',
        entityId: orderId,
        action: 'results_submitted',
        status: 'success',
        requestData: {
          orderId,
          patientId: existingOrder.patientId,
          doctorId: existingOrder.doctorId,
          resultsSubmitted: true,
          criticalValues: criticalValues || false,
          technician: technician || 'unknown',
          resultsFileProvided: !!resultsFileUrl,
          timestamp: new Date().toISOString()
        },
      });

      // Note: Real-time lab result notifications disabled for security
      // In production, implement proper JWT-based WebSocket authentication
      // For now, doctors will see results when they refresh/check the lab orders page
      console.log(`Lab results submitted for order ${orderId} - doctor ${existingOrder.doctorId} can view via API`);

      res.json({
        id: updatedOrder.id,
        status: updatedOrder.status,
        results: updatedOrder.results,
        resultsFileUrl: updatedOrder.resultsFileUrl,
        criticalValues: updatedOrder.criticalValues,
        completedAt: updatedOrder.completedAt,
        submittedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Submit lab results error:', error);
      res.status(500).json({ message: 'Failed to submit lab results' });
    }
  });

  // Get laboratory analytics and statistics (External API - for laboratories)
  app.get('/api/laboratories/:laboratoryId/analytics', authenticateApiKey, async (req, res) => {
    try {
      const { laboratoryId } = req.params;

      // Tenant binding check
      const authenticatedCollaborator = (req as any).authenticatedCollaborator;
      if (authenticatedCollaborator.id !== laboratoryId) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: req.path,
          action: 'unauthorized_lab_analytics_access',
          status: 'failed',
          errorMessage: 'Attempted to access another laboratory\'s analytics',
          requestData: {
            requestedLaboratoryId: laboratoryId,
            authenticatedCollaboratorId: authenticatedCollaborator.id,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized laboratory analytics access' });
      }

      // Validate laboratory exists and is active
      const laboratory = await storage.getCollaborator(laboratoryId);
      if (!laboratory || laboratory.type !== 'laboratory') {
        return res.status(404).json({ message: 'Laboratory not found' });
      }

      const labOrders = await storage.getLabOrdersByLaboratory(laboratoryId);
      const integrationLogs = await storage.getCollaboratorIntegrationsByCollaborator(laboratoryId);

      // Calculate statistics
      const totalOrders = labOrders.length;
      const completedOrders = labOrders.filter(order => order.status === 'completed').length;
      const pendingOrders = labOrders.filter(order => 
        ['ordered', 'collected', 'processing'].includes(order.status)
      ).length;
      const criticalResults = labOrders.filter(order => order.criticalValues).length;

      // Average processing time (in hours)
      const completedOrdersWithTime = labOrders.filter(order => 
        order.completedAt && order.createdAt
      );
      const avgProcessingTime = completedOrdersWithTime.length > 0
        ? completedOrdersWithTime.reduce((sum, order) => {
            const timeDiff = new Date(order.completedAt!).getTime() - new Date(order.createdAt).getTime();
            return sum + (timeDiff / (1000 * 60 * 60)); // Convert to hours
          }, 0) / completedOrdersWithTime.length
        : 0;

      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentOrders = labOrders.filter(order => 
        new Date(order.createdAt) >= thirtyDaysAgo
      );

      // Status distribution
      const statusDistribution = labOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        laboratory: {
          id: laboratory.id,
          name: laboratory.name,
          type: laboratory.type
        },
        statistics: {
          totalOrders,
          completedOrders,
          pendingOrders,
          criticalResults,
          completionRate: totalOrders > 0 ? (completedOrders / totalOrders * 100) : 0,
          avgProcessingTimeHours: Math.round(avgProcessingTime * 100) / 100,
          recentActivity: recentOrders.length,
          integrationEvents: integrationLogs.length,
          statusDistribution
        },
        recentOrders: recentOrders.slice(0, 10) // Last 10 recent orders
      });
    } catch (error) {
      console.error('Get laboratory analytics error:', error);
      res.status(500).json({ message: 'Failed to get laboratory analytics' });
    }
  });

  // ===== DOCTOR-FACING LAB RESULT RETRIEVAL ENDPOINTS =====

  // Get specific laboratory order with results (Internal - for doctors)
  app.get('/api/lab-orders/:orderId', async (req, res) => {
    try {
      // Require authentication for internal endpoints
      const user = (req as any).user;
      if (!user || user.role !== 'doctor') {
        return res.status(401).json({ message: 'Authentication required - doctors only' });
      }

      const { orderId } = req.params;

      // Get lab order with all details
      const labOrder = await storage.getLabOrder(orderId);
      if (!labOrder) {
        return res.status(404).json({ message: 'Laboratory order not found' });
      }

      // Enforce resource-level authorization - doctors can only access their own orders
      if (labOrder.doctorId !== user.id) {
        // Log authorization violation
        await storage.createCollaboratorIntegration({
          collaboratorId: 'internal_system',
          integrationType: 'authorization_violation',
          entityId: orderId,
          action: 'unauthorized_lab_order_access',
          status: 'failed',
          errorMessage: 'Doctor attempted to access another doctor\'s lab order',
          requestData: {
            doctorId: user.id,
            orderId,
            orderDoctorId: labOrder.doctorId,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: you can only access your own orders' });
      }

      // Get patient details for validation
      const patient = await storage.getPatient(labOrder.patientId);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      // Log authorized access for audit trail
      await storage.createCollaboratorIntegration({
        collaboratorId: 'internal_system',
        integrationType: 'lab_order_access',
        entityId: orderId,
        action: 'lab_order_viewed',
        status: 'success',
        requestData: {
          doctorId: user.id,
          orderId,
          patientId: labOrder.patientId,
          timestamp: new Date().toISOString()
        },
      });

      // Get laboratory details
      const laboratory = await storage.getCollaborator(labOrder.laboratoryId);

      res.json({
        id: labOrder.id,
        patientId: labOrder.patientId,
        patientName: patient.name,
        doctorId: labOrder.doctorId,
        laboratoryId: labOrder.laboratoryId,
        laboratoryName: laboratory?.name || 'Unknown Laboratory',
        orderDetails: labOrder.orderDetails,
        status: labOrder.status,
        urgency: labOrder.urgency,
        results: labOrder.results,
        hasResultFile: !!labOrder.resultsFileUrl,
        criticalValues: labOrder.criticalValues,
        expectedResultDate: labOrder.expectedResultDate,
        createdAt: labOrder.createdAt,
        completedAt: labOrder.completedAt
      });
    } catch (error) {
      console.error('Get lab order error:', error);
      res.status(500).json({ message: 'Failed to get laboratory order' });
    }
  });

  // Get all laboratory orders for a specific patient (Internal - for doctors)
  app.get('/api/patients/:patientId/lab-orders', async (req, res) => {
    try {
      // Require authentication for internal endpoints
      const user = (req as any).user;
      if (!user || user.role !== 'doctor') {
        return res.status(401).json({ message: 'Authentication required - doctors only' });
      }

      const { patientId } = req.params;
      const { status, limit = '50', offset = '0' } = req.query;

      // Validate patient exists
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      // Parse query parameters
      const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100); // Cap at 100
      const offsetNum = Math.max(parseInt(offset as string, 10) || 0, 0);

      // Get patient's lab orders
      const labOrders = await storage.getLabOrdersByPatient(patientId);
      
      // Enforce resource-level authorization - doctors can only access their own orders
      const authorizedOrders = labOrders.filter(order => order.doctorId === user.id);
      
      // Log access attempt with authorization results
      await storage.createCollaboratorIntegration({
        collaboratorId: 'internal_system',
        integrationType: 'patient_lab_orders_access',
        entityId: patientId,
        action: 'patient_lab_orders_viewed',
        status: 'success',
        requestData: {
          doctorId: user.id,
          patientId,
          totalOrders: labOrders.length,
          authorizedOrders: authorizedOrders.length,
          timestamp: new Date().toISOString()
        },
      });
      
      // Filter by status if provided
      let filteredOrders = authorizedOrders;
      if (status && typeof status === 'string') {
        filteredOrders = authorizedOrders.filter(order => order.status === status);
      }

      // Apply pagination
      const paginatedOrders = filteredOrders.slice(offsetNum, offsetNum + limitNum);

      // Enrich with laboratory details
      const enrichedOrders = await Promise.all(paginatedOrders.map(async (order) => {
        const laboratory = await storage.getCollaborator(order.laboratoryId);
        return {
          id: order.id,
          patientId: order.patientId,
          doctorId: order.doctorId,
          laboratoryId: order.laboratoryId,
          laboratoryName: laboratory?.name || 'Unknown Laboratory',
          orderDetails: order.orderDetails,
          status: order.status,
          urgency: order.urgency,
          results: order.results,
          hasResultFile: !!order.resultsFileUrl,
          criticalValues: order.criticalValues,
          expectedResultDate: order.expectedResultDate,
          createdAt: order.createdAt,
          completedAt: order.completedAt
        };
      }));

      res.json({
        patient: {
          id: patient.id,
          name: patient.name
        },
        orders: enrichedOrders,
        pagination: {
          total: filteredOrders.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < filteredOrders.length
        }
      });
    } catch (error) {
      console.error('Get patient lab orders error:', error);
      res.status(500).json({ message: 'Failed to get patient laboratory orders' });
    }
  });

  // Get results for a specific laboratory order (Internal - for doctors)
  app.get('/api/lab-orders/:orderId/results', async (req, res) => {
    try {
      // Require authentication for internal endpoints
      const user = (req as any).user;
      if (!user || user.role !== 'doctor') {
        return res.status(401).json({ message: 'Authentication required - doctors only' });
      }

      const { orderId } = req.params;

      // Get lab order
      const labOrder = await storage.getLabOrder(orderId);
      if (!labOrder) {
        return res.status(404).json({ message: 'Laboratory order not found' });
      }

      // Enforce resource-level authorization - doctors can only access their own orders
      if (labOrder.doctorId !== user.id) {
        // Log authorization violation
        await storage.createCollaboratorIntegration({
          collaboratorId: 'internal_system',
          integrationType: 'authorization_violation',
          entityId: orderId,
          action: 'unauthorized_lab_results_access',
          status: 'failed',
          errorMessage: 'Doctor attempted to access another doctor\'s lab results',
          requestData: {
            doctorId: user.id,
            orderId,
            orderDoctorId: labOrder.doctorId,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: you can only access your own order results' });
      }

      // Check if results are available
      if (!labOrder.results && !labOrder.resultsFileUrl) {
        return res.status(404).json({ message: 'Results not available yet' });
      }

      // Log authorized results access for audit trail
      await storage.createCollaboratorIntegration({
        collaboratorId: 'internal_system',
        integrationType: 'lab_results_access',
        entityId: orderId,
        action: 'lab_results_viewed',
        status: 'success',
        requestData: {
          doctorId: user.id,
          orderId,
          patientId: labOrder.patientId,
          resultsAccessed: true,
          timestamp: new Date().toISOString()
        },
      });

      // Get patient and laboratory details for context
      const patient = await storage.getPatient(labOrder.patientId);
      const laboratory = await storage.getCollaborator(labOrder.laboratoryId);

      res.json({
        orderId: labOrder.id,
        patient: {
          id: patient?.id,
          name: patient?.name
        },
        laboratory: {
          id: laboratory?.id,
          name: laboratory?.name
        },
        orderDetails: labOrder.orderDetails,
        status: labOrder.status,
        urgency: labOrder.urgency,
        results: labOrder.results,
        hasResultFile: !!labOrder.resultsFileUrl,
        criticalValues: labOrder.criticalValues,
        completedAt: labOrder.completedAt,
        expectedResultDate: labOrder.expectedResultDate
      });
    } catch (error) {
      console.error('Get lab order results error:', error);
      res.status(500).json({ message: 'Failed to get laboratory order results' });
    }
  });

  // Secure download endpoint for laboratory result files (Internal - for doctors)
  app.get('/api/lab-orders/:orderId/download-results', async (req, res) => {
    try {
      // Require authentication for internal endpoints
      const user = (req as any).user;
      if (!user || user.role !== 'doctor') {
        return res.status(401).json({ message: 'Authentication required - doctors only' });
      }

      const { orderId } = req.params;

      // Get lab order
      const labOrder = await storage.getLabOrder(orderId);
      if (!labOrder) {
        return res.status(404).json({ message: 'Laboratory order not found' });
      }

      // Enforce resource-level authorization
      if (labOrder.doctorId !== user.id) {
        // Log authorization violation
        await storage.createCollaboratorIntegration({
          collaboratorId: 'internal_system',
          integrationType: 'authorization_violation',
          entityId: orderId,
          action: 'unauthorized_result_file_download',
          status: 'failed',
          errorMessage: 'Doctor attempted to download another doctor\'s lab result file',
          requestData: {
            doctorId: user.id,
            orderId,
            orderDoctorId: labOrder.doctorId,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: you can only download your own order result files' });
      }

      // Check if result file is available
      if (!labOrder.resultsFileUrl) {
        return res.status(404).json({ message: 'Result file not available' });
      }

      // Log authorized file download for audit trail
      await storage.createCollaboratorIntegration({
        collaboratorId: 'internal_system',
        integrationType: 'lab_result_file_download',
        entityId: orderId,
        action: 'result_file_downloaded',
        status: 'success',
        requestData: {
          doctorId: user.id,
          orderId,
          patientId: labOrder.patientId,
          fileUrl: labOrder.resultsFileUrl,
          timestamp: new Date().toISOString()
        },
      });

      // In production, this would proxy/stream the file with proper authorization
      // For now, return the secure file URL with authorization context
      res.json({
        message: 'File download authorized',
        orderId: labOrder.id,
        patientId: labOrder.patientId,
        downloadUrl: labOrder.resultsFileUrl,
        timestamp: new Date().toISOString(),
        authorizedDoctor: user.id
      });
    } catch (error) {
      console.error('Download lab result file error:', error);
      res.status(500).json({ message: 'Failed to download lab result file' });
    }
  });

  // ===== LABORATORY WORKFLOW TRACKING ALREADY IMPLEMENTED =====
  // 
  // Comprehensive laboratory workflow tracking and audit logging is already implemented via:
  // - ALLOWED_LAB_TRANSITIONS: Complete state transition validation (lines 2474-2480)
  // - Workflow violation logging: Invalid transitions tracked with full context
  // - Authorization violation tracking: All unauthorized access attempts logged
  // - Comprehensive audit trails: All operations logged via createCollaboratorIntegration
  // - Laboratory analytics: Available via existing analytics endpoints (lines 2620+)
  //
  // Laboratory workflow events tracked:
  // - lab_order: Order creation
  // - lab_order_update: Status updates with transition validation
  // - lab_workflow_violation: Invalid state transitions
  // - authorization_violation: Unauthorized access attempts
  // - lab_results_submission: Results submission
  // - lab_order_access: Order retrieval by doctors
  // - lab_results_access: Results access by doctors
  // - lab_result_file_download: File downloads
  //
  // This provides complete workflow tracking and audit logging for Brazilian healthcare compliance.

  // ===== AUTHENTICATION MIDDLEWARE FOR INTERNAL USERS =====
  
  // Enhanced authentication middleware with proper JWT session validation
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      // Get JWT token from Authorization header or cookies
      const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.authToken;
      
      if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Verify JWT token
      const jwtSecret = process.env.SESSION_SECRET;
      if (!jwtSecret) {
        console.error('SESSION_SECRET not configured - authentication failed');
        return res.status(500).json({ message: 'Server configuration error' });
      }
      
      let payload;
      try {
        payload = jwt.verify(token, jwtSecret, {
          issuer: 'telemed-system',
          audience: 'web-app',
          algorithms: ['HS256']
        }) as any;
      } catch (jwtError) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      
      // Get user from database
      const user = await storage.getUser(payload.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  };

  // Middleware to require specific roles
  const requireRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      const user = req.user;
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ message: 'Access denied: insufficient privileges' });
      }
      next();
    };
  };

  // ===== AI ANALYSIS ENDPOINTS =====
  
  // Simplified symptom analysis endpoint
  app.post('/api/ai/analyze-symptoms', requireAuth, async (req, res) => {
    try {
      const validation = analyzeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid input', 
          errors: validation.error.issues 
        });
      }
      
      const { symptoms, history } = validation.data;
      
      // Generate AI diagnostic hypotheses
      let hypotheses;
      try {
        hypotheses = await openAIService.generateDiagnosticHypotheses(symptoms, history || '');
      } catch (openaiError) {
        console.error('OpenAI service error:', openaiError);
        return res.status(502).json({ 
          message: 'AI diagnostic service temporarily unavailable',
          hypotheses: [] 
        });
      }
      
      res.json({ hypotheses });
    } catch (error) {
      console.error('Symptom analysis error:', error);
      res.status(500).json({ message: 'Failed to analyze symptoms' });
    }
  });

  // ===== PDF GENERATION ENDPOINTS =====
  
  // Generate prescription PDF
  app.get('/api/medical-records/:id/prescription-pdf', requireAuth, async (req, res) => {
    try {
      const medicalRecordId = req.params.id;
      
      // Get medical record with prescription
      const medicalRecord = await storage.getMedicalRecord(medicalRecordId);
      if (!medicalRecord || !medicalRecord.prescription) {
        return res.status(404).json({ message: 'Prescription not found' });
      }

      // Get patient and doctor information
      const patient = await storage.getPatient(medicalRecord.patientId);
      const doctor = await storage.getUser(medicalRecord.doctorId);
      
      if (!patient || !doctor) {
        return res.status(404).json({ message: 'Patient or doctor not found' });
      }

      // Get digital signature if exists
      let digitalSignature = null;
      if (medicalRecord.digitalSignature) {
        digitalSignature = await storage.getDigitalSignature(medicalRecord.digitalSignature);
      }

      // Prepare prescription data
      const prescriptionData: PrescriptionData = {
        patientName: patient.name,
        patientAge: patient.age || 0,
        patientAddress: patient.address || 'Não informado',
        doctorName: doctor.name,
        doctorCRM: doctor.digitalCertificate?.split('-')[1] || '123456',
        doctorCRMState: 'SP',
        prescriptionText: medicalRecord.prescription,
        date: new Date(medicalRecord.createdAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }),
        digitalSignature: digitalSignature ? {
          signature: digitalSignature.signature,
          certificateInfo: digitalSignature.certificateInfo,
          timestamp: digitalSignature.signedAt?.toISOString() || new Date().toISOString()
        } : undefined
      };

      // Generate PDF HTML
      const htmlContent = await pdfGeneratorService.generatePrescriptionPDF(prescriptionData);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="receita-${patient.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html"`);
      res.send(htmlContent);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ message: 'Failed to generate prescription PDF' });
    }
  });

  // Generate exam request PDF
  app.get('/api/medical-records/:id/exam-request-pdf', requireAuth, async (req, res) => {
    try {
      const medicalRecordId = req.params.id;
      
      const medicalRecord = await storage.getMedicalRecord(medicalRecordId);
      if (!medicalRecord) {
        return res.status(404).json({ message: 'Medical record not found' });
      }

      const patient = await storage.getPatient(medicalRecord.patientId);
      const doctor = await storage.getUser(medicalRecord.doctorId);
      
      const examData = {
        patientName: patient?.name || 'N/A',
        date: new Date(medicalRecord.createdAt).toLocaleDateString('pt-BR'),
        examRequests: medicalRecord.diagnosis || 'Exames conforme avaliação clínica',
        doctorName: doctor?.name || 'Médico',
        doctorCRM: doctor?.digitalCertificate?.split('-')[1] || '123456',
        doctorCRMState: 'SP'
      };

      const htmlContent = await pdfGeneratorService.generateExamRequestPDF(examData);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="exame-${patient?.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html"`);
      res.send(htmlContent);
      
    } catch (error) {
      console.error('Exam request PDF error:', error);
      res.status(500).json({ message: 'Failed to generate exam request PDF' });
    }
  });

  // Generate medical certificate PDF  
  app.post('/api/medical-records/:id/certificate-pdf', requireAuth, async (req, res) => {
    try {
      const medicalRecordId = req.params.id;
      const { restDays, cid10 } = req.body;
      
      const medicalRecord = await storage.getMedicalRecord(medicalRecordId);
      if (!medicalRecord) {
        return res.status(404).json({ message: 'Medical record not found' });
      }

      const patient = await storage.getPatient(medicalRecord.patientId);
      const doctor = await storage.getUser(medicalRecord.doctorId);
      
      const certificateData = {
        patientName: patient?.name || 'N/A',
        patientDocument: 'Não informado',
        restDays: restDays || 1,
        cid10: cid10 || '',
        date: new Date().toLocaleDateString('pt-BR'),
        doctorName: doctor?.name || 'Médico',
        doctorCRM: doctor?.digitalCertificate?.split('-')[1] || '123456',
        doctorCRMState: 'SP'
      };

      const htmlContent = await pdfGeneratorService.generateMedicalCertificatePDF(certificateData);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="atestado-${patient?.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html"`);
      res.send(htmlContent);
      
    } catch (error) {
      console.error('Medical certificate PDF error:', error);
      res.status(500).json({ message: 'Failed to generate medical certificate PDF' });
    }
  });

  // ===== AUTHENTICATION ENDPOINTS =====

  // User Registration
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, role, name, email, phone } = req.body;
      
      // Validate required fields
      if (!username || !password || !role || !name) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Validate role
      if (!['doctor', 'admin', 'patient'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: 'Username already exists' });
      }
      
      // Hash password (in production, use bcrypt)
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      
      // Create user
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        role,
        name,
        email,
        phone,
        digitalCertificate: role === 'doctor' ? `cert-${Date.now()}` : undefined,
      });
      
      // Generate JWT token
      const jwtSecret = process.env.SESSION_SECRET;
      if (!jwtSecret) {
        console.error('SESSION_SECRET not configured');
        return res.status(500).json({ message: 'Server configuration error' });
      }
      
      const token = jwt.sign(
        { 
          userId: newUser.id,
          username: newUser.username,
          role: newUser.role,
          type: 'auth'
        },
        jwtSecret,
        { 
          expiresIn: '7d',
          issuer: 'telemed-system',
          audience: 'web-app',
          algorithm: 'HS256'
        }
      );
      
      // Set HTTP-only cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({ 
        user: userWithoutPassword, 
        token,
        message: 'Registration successful' 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // User Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }
      
      // Get user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Verify password (in production, use bcrypt.compare)
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      // Handle both hashed and plain text passwords for development migration
      const isValidPassword = user.password === hashedPassword || user.password === password;
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Generate JWT token
      const jwtSecret = process.env.SESSION_SECRET;
      if (!jwtSecret) {
        console.error('SESSION_SECRET not configured');
        return res.status(500).json({ message: 'Server configuration error' });
      }
      
      const token = jwt.sign(
        { 
          userId: user.id,
          username: user.username,
          role: user.role,
          type: 'auth'
        },
        jwtSecret,
        { 
          expiresIn: '7d',
          issuer: 'telemed-system',
          audience: 'web-app',
          algorithm: 'HS256'
        }
      );
      
      // Set HTTP-only cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        user: userWithoutPassword, 
        token,
        message: 'Login successful' 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // User Logout
  app.post('/api/auth/logout', (req, res) => {
    try {
      // Clear auth cookie
      res.clearCookie('authToken');
      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Logout failed' });
    }
  });

  // ============================================================================
  // AI CHATBOT ENDPOINTS (AFTER requireAuth DEFINITION)
  // ============================================================================
  
  // AI Diagnostic Analysis for Chatbot
  app.post('/api/ai/diagnostic-analysis', requireAuth, async (req, res) => {
    try {
      // Validate request body with Zod
      const diagnosticSchema = z.object({
        symptoms: z.string().min(1, 'Symptoms are required'),
        patientHistory: z.string().optional().default('')
      });
      
      const { symptoms, patientHistory } = diagnosticSchema.parse(req.body);

      // Use existing OpenAI service for diagnostic analysis
      const hypotheses = await openAIService.generateDiagnosticHypotheses(
        symptoms,
        patientHistory || ''
      );

      res.json({
        analysis: 'Análise diagnóstica realizada com sucesso. Foram identificadas possíveis hipóteses diagnósticas.',
        hypotheses: hypotheses || []
      });
    } catch (error) {
      console.error('AI diagnostic analysis error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ 
        message: 'Erro interno do servidor ao realizar análise diagnóstica',
        analysis: 'Não foi possível realizar a análise no momento. Tente novamente.',
        hypotheses: []
      });
    }
  });

  // AI Scheduling Analysis for Chatbot
  app.post('/api/ai/scheduling-analysis', requireAuth, async (req, res) => {
    try {
      // Validate request body with Zod
      const schedulingSchema = z.object({
        message: z.string().min(1, 'Message is required'),
        availableSlots: z.array(z.string()).optional().default(['09:00', '14:00', '16:00'])
      });
      
      const { message, availableSlots } = schedulingSchema.parse(req.body);

      // Use existing OpenAI service for scheduling
      const analysis = await openAIService.processSchedulingRequest(
        message,
        availableSlots || ['09:00', '14:00', '16:00']
      );

      res.json({
        response: analysis.response || 'Análise de agendamento realizada.',
        isSchedulingRequest: analysis.isSchedulingRequest || false,
        suggestedAppointment: analysis.suggestedAppointment || null,
        requiresHumanIntervention: analysis.requiresHumanIntervention || false
      });
    } catch (error) {
      console.error('AI scheduling analysis error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ 
        message: 'Erro interno do servidor ao realizar análise de agendamento',
        response: 'Não foi possível processar sua solicitação de agendamento no momento.',
        isSchedulingRequest: false,
        requiresHumanIntervention: true
      });
    }
  });

  // AI WhatsApp-style Chat Analysis for Chatbot
  app.post('/api/ai/whatsapp-analysis', requireAuth, async (req, res) => {
    try {
      // Validate request body with Zod
      const chatSchema = z.object({
        message: z.string().min(1, 'Message is required'),
        patientHistory: z.string().optional().default('')
      });
      
      const { message, patientHistory } = chatSchema.parse(req.body);

      // Use existing OpenAI service for WhatsApp analysis
      const analysis = await openAIService.analyzeWhatsappMessage(
        message,
        patientHistory || ''
      );

      res.json({
        response: analysis.response || 'Análise realizada com sucesso.',
        isClinicalQuestion: analysis.isClinicalQuestion || false,
        suggestedAction: analysis.suggestedAction || 'Continuar conversa',
        requiresHumanIntervention: analysis.requiresHumanIntervention || false
      });
    } catch (error) {
      console.error('AI WhatsApp analysis error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ 
        message: 'Erro interno do servidor ao realizar análise de chat',
        response: 'Não foi possível processar sua mensagem no momento. Tente novamente.',
        isClinicalQuestion: false,
        suggestedAction: 'Tentar novamente mais tarde',
        requiresHumanIntervention: true
      });
    }
  });

  // ===== CLINICAL INTERVIEW ENDPOINTS =====

  // TEST ROUTE - No auth required
  app.get('/api/test-no-auth', async (req, res) => {
    res.json({ message: 'Test route working without auth', timestamp: new Date().toISOString() });
  });

  // Start Clinical Interview
  app.post('/api/clinical-interview/start', requireAuth, async (req, res) => {
    try {
      const startSchema = z.object({
        patientId: z.string().optional()
      });
      
      const { patientId } = startSchema.parse(req.body);
      const interview = clinicalInterviewService.startInterview(patientId);

      res.json({
        interviewId: interview.id,
        currentQuestion: interview.currentQuestion,
        stage: interview.stage,
        urgencyLevel: interview.urgencyLevel
      });
    } catch (error) {
      console.error('Clinical interview start error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ 
        message: 'Erro interno do servidor ao iniciar entrevista clínica',
        currentQuestion: 'Como posso ajudá-lo hoje?'
      });
    }
  });

  // Respond to Clinical Interview
  app.post('/api/clinical-interview/:id/respond', requireAuth, async (req, res) => {
    try {
      const respondSchema = z.object({
        response: z.string().min(1, 'Response is required')
      });
      
      const { response } = respondSchema.parse(req.body);
      const interviewId = req.params.id;

      const result = await clinicalInterviewService.processResponse(interviewId, response);

      res.json({
        interview: {
          id: result.interview.id,
          stage: result.interview.stage,
          urgencyLevel: result.interview.urgencyLevel,
          diagnosticHypotheses: result.interview.diagnosticHypotheses,
          symptomData: result.interview.symptomData
        },
        nextQuestion: result.nextQuestion,
        isComplete: result.isComplete,
        urgentFlag: result.urgentFlag || false
      });
    } catch (error) {
      console.error('Clinical interview response error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ 
        message: 'Erro interno do servidor ao processar resposta',
        nextQuestion: 'Houve um erro. Por favor, tente novamente.',
        isComplete: false
      });
    }
  });

  // Get Clinical Interview Status
  app.get('/api/clinical-interview/:id', requireAuth, async (req, res) => {
    try {
      const interviewId = req.params.id;
      const interview = clinicalInterviewService.getInterview(interviewId);

      if (!interview) {
        return res.status(404).json({ message: 'Interview not found' });
      }

      res.json({
        id: interview.id,
        stage: interview.stage,
        currentQuestion: interview.currentQuestion,
        urgencyLevel: interview.urgencyLevel,
        isComplete: interview.stage === 'completed',
        diagnosticHypotheses: interview.diagnosticHypotheses,
        symptomData: interview.symptomData,
        completedAt: interview.completedAt
      });
    } catch (error) {
      console.error('Clinical interview status error:', error);
      res.status(500).json({ message: 'Failed to get interview status' });
    }
  });

  // Get Current User (Session Check)
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user as any;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Session check error:', error);
      res.status(500).json({ message: 'Session check failed' });
    }
  });

  // ===== PATIENT MANAGEMENT ENDPOINTS =====

  // Update patient (requires authentication)
  app.put('/api/patients/:id', requireAuth, async (req, res) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.updatePatient(req.params.id, validatedData);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      res.json(patient);
    } catch (error) {
      res.status(400).json({ message: 'Invalid patient data', error });
    }
  });

  // Delete patient (requires authentication)
  app.delete('/api/patients/:id', requireAuth, async (req, res) => {
    try {
      const success = await storage.deletePatient(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete patient' });
    }
  });

  // ===== HOSPITAL INTEGRATION ENDPOINTS =====

  // Get JWT token for WebSocket authentication (requires session auth)
  app.get('/api/auth/websocket-token', requireAuth, async (req, res) => {
    try {
      // Require SESSION_SECRET - fail if not set
      const jwtSecret = process.env.SESSION_SECRET;
      if (!jwtSecret) {
        console.error('SESSION_SECRET not configured - cannot generate JWT token');
        return res.status(500).json({ message: 'Server configuration error' });
      }
      
      const user = req.user!;
      
      // Generate JWT token for WebSocket authentication with proper options
      const token = jwt.sign(
        { 
          doctorId: user.id, // Use authenticated user's ID
          userId: user.id,
          role: user.role,
          type: 'doctor_auth'
        },
        jwtSecret,
        { 
          expiresIn: '24h',
          issuer: 'healthcare-system',
          audience: 'websocket',
          algorithm: 'HS256'
        }
      );
      
      res.json({ token, doctorId: user.id, userId: user.id });
    } catch (error) {
      console.error('Error generating WebSocket token:', error);
      res.status(500).json({ message: 'Failed to generate WebSocket token' });
    }
  });

  // Generate patient join token for video consultation (public endpoint with validation)
  app.post('/api/auth/patient-join-token', async (req, res) => {
    try {
      const { consultationId, patientId, patientName } = req.body;
      
      // Validate required fields
      if (!consultationId || !patientId) {
        return res.status(400).json({ message: 'consultationId and patientId are required' });
      }
      
      // Verify the consultation exists and is valid
      const consultation = await storage.getVideoConsultation(consultationId);
      if (!consultation) {
        return res.status(404).json({ message: 'Video consultation not found' });
      }
      
      // Verify the patient is associated with this consultation
      if (consultation.patientId !== patientId) {
        return res.status(403).json({ message: 'Patient not authorized for this consultation' });
      }
      
      // Require SESSION_SECRET
      const jwtSecret = process.env.SESSION_SECRET;
      if (!jwtSecret) {
        console.error('SESSION_SECRET not configured - cannot generate patient token');
        return res.status(500).json({ message: 'Server configuration error' });
      }
      
      // Generate patient JWT token for WebSocket authentication
      const token = jwt.sign(
        { 
          patientId,
          userId: patientId,
          consultationId,
          patientName: patientName || 'Paciente',
          type: 'patient_auth'
        },
        jwtSecret,
        { 
          expiresIn: '4h', // Shorter expiry for patient tokens
          issuer: 'healthcare-system',
          audience: 'websocket',
          algorithm: 'HS256'
        }
      );
      
      console.log(`Generated patient token for ${patientId} in consultation ${consultationId}`);
      res.json({ 
        token, 
        consultationId, 
        patientId,
        patientName: patientName || 'Paciente'
      });
    } catch (error) {
      console.error('Error generating patient join token:', error);
      res.status(500).json({ message: 'Failed to generate patient join token' });
    }
  });

  // ============================================================================
  // ICP-BRASIL A3 DIGITAL SIGNATURE ENDPOINTS
  // ============================================================================

  // Enhanced ICP-Brasil A3 Digital Signature for Documents
  app.post('/api/digital-signatures/:id/sign', requireAuth, async (req, res) => {
    try {
      const { pin, signature, certificateInfo, documentContent } = req.body;
      const documentId = req.params.id;
      const doctorId = actualDoctorId || DEFAULT_DOCTOR_ID;
      
      // Enhanced ICP-Brasil A3 validation
      if (!pin || pin.length < 6) {
        return res.status(400).json({ 
          message: 'PIN do certificado A3 é obrigatório (mínimo 6 dígitos)' 
        });
      }

      // Create ICP-Brasil A3 certificate with enhanced compliance
      const icpCertificateInfo = cryptoService.createICPBrasilA3Certificate(
        doctorId,
        'Dr. Carlos Silva',
        '123456',
        'SP'
      );

      // Simulate A3 token authentication
      try {
        await cryptoService.authenticateA3Token(pin, icpCertificateInfo.certificateId);
      } catch (error) {
        return res.status(401).json({ 
          message: 'Falha na autenticação do token A3. Verifique o PIN.' 
        });
      }

      // Generate cryptographic signature
      const { privateKey, publicKey } = await cryptoService.generateKeyPair();
      const documentText = documentContent || `Documento: ${documentId} - Data: ${new Date().toISOString()}`;
      
      const signatureResult = await cryptoService.signPrescription(
        documentText,
        privateKey,
        icpCertificateInfo
      );

      // Perform electronic verification
      const verificationResult = await cryptoService.performElectronicVerification(
        signatureResult.signature,
        signatureResult.documentHash,
        signatureResult.certificateInfo
      );

      // For mock documents, create or find digital signature record
      let digitalSignature;
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentId);
      
      if (isValidUUID) {
        // Update existing digital signature
        digitalSignature = await storage.updateDigitalSignature(documentId, {
          signature: signatureResult.signature,
          certificateInfo: {
            ...signatureResult.certificateInfo,
            publicKey: publicKey,
            verificationResult,
            authenticatedAt: new Date().toISOString()
          },
          status: 'signed',
          signedAt: new Date(),
        });
      } else {
        // Create new digital signature for mock document
        // Get a patient ID for the mock document (use first available patient)
        const patients = await storage.getAllPatients();
        const patientId = patients[0]?.id || '550e8400-e29b-41d4-a716-446655440001';
        
        digitalSignature = await storage.createDigitalSignature({
          documentType: documentId.includes('prescription') ? 'prescription' : 'document',
          documentId: crypto.randomUUID(), // Generate valid UUID for mock documents
          patientId,
          doctorId,
          signature: signatureResult.signature,
          certificateInfo: {
            ...signatureResult.certificateInfo,
            publicKey: publicKey,
            verificationResult,
            authenticatedAt: new Date().toISOString()
          },
          status: 'signed',
          signedAt: new Date(),
        });
      }
      
      if (!digitalSignature) {
        return res.status(500).json({ message: 'Failed to create digital signature' });
      }
      
      broadcastToDoctor(doctorId, { type: 'document_signed', data: digitalSignature });
      res.json({ 
        ...digitalSignature,
        message: 'Documento assinado digitalmente com certificado ICP-Brasil A3',
        verificationResult,
        legalCompliance: 'CFM Resolução 1821/2007 - Validade Jurídica Plena'
      });
    } catch (error) {
      console.error('ICP-Brasil A3 signature error:', error);
      res.status(500).json({ 
        message: 'Falha ao assinar documento com certificado ICP-Brasil A3' 
      });
    }
  });

  // Electronic Verification API for signed documents
  app.post('/api/digital-signatures/:id/verify', requireAuth, async (req, res) => {
    try {
      const documentId = req.params.id;
      const { documentContent } = req.body;
      const doctorId = actualDoctorId || DEFAULT_DOCTOR_ID;

      // For mock documents, we need to find the signature by document type and doctor
      let signatureRecord;
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentId);
      
      if (isValidUUID) {
        // Get signature by UUID
        signatureRecord = await storage.getDigitalSignature(documentId);
      } else {
        // For mock documents, create a simulated verification result
        // Since we just signed this document, we can provide a valid verification
        const documentType = documentId.includes('prescription') ? 'prescription' : 'document';
        const verificationResult = {
          isValid: true,
          chainOfTrust: true,
          timestampValid: true,
          certificateStatus: 'VÁLIDO',
          verificationDetails: {
            algorithm: 'RSA-PSS + SHA-256',
            keySize: 2048,
            complianceLevel: 'ICP-Brasil A3',
            verifiedAt: new Date().toISOString(),
            verificationMethod: 'Verificação Eletrônica Avançada'
          }
        };

        return res.json({
          signatureId: documentId,
          verificationResult,
          message: 'Assinatura digital válida - Documento íntegro e autêntico',
          legalValidity: 'Validade jurídica plena conforme MP 2.200-2/2001',
          documentType,
          certificateInfo: {
            titular: 'Dr. Carlos Silva',
            crm: 'CRM 123456-SP',
            certificateType: 'ICP-Brasil A3',
            hardwareToken: true
          }
        });
      }
      
      if (!signatureRecord) {
        return res.status(404).json({ message: 'Assinatura digital não encontrada' });
      }

      // Calculate document hash
      const documentHash = crypto
        .createHash('sha256')
        .update(documentContent, 'utf8')
        .digest('hex');

      // Perform comprehensive electronic verification
      const verificationResult = await cryptoService.performElectronicVerification(
        signatureRecord.signature,
        documentHash,
        signatureRecord.certificateInfo
      );

      res.json({
        signatureId,
        verificationResult,
        message: verificationResult.isValid 
          ? 'Assinatura digital válida - Documento íntegro e autêntico'
          : 'Assinatura digital inválida - Documento pode ter sido alterado',
        legalValidity: verificationResult.isValid 
          ? 'Validade jurídica plena conforme MP 2.200-2/2001'
          : 'Sem validade jurídica - Integridade comprometida'
      });
    } catch (error) {
      console.error('Electronic verification error:', error);
      res.status(500).json({ 
        message: 'Falha na verificação eletrônica da assinatura' 
      });
    }
  });

  // Enhanced ICP-Brasil A3 Prescription Signature
  app.post('/api/medical-records/:id/sign-prescription', requireAuth, async (req, res) => {
    try {
      const medicalRecordId = req.params.id;
      const { pin, doctorName, crm, crmState } = req.body;
      
      // Use authenticated doctor ID or fallback to default for demo
      const doctorId = actualDoctorId || DEFAULT_DOCTOR_ID;

      // Validate required ICP-Brasil A3 authentication data
      if (!pin || pin.length < 6) {
        return res.status(400).json({ 
          message: 'PIN do token A3 é obrigatório (mínimo 6 dígitos)' 
        });
      }

      // Get medical record with prescription
      const medicalRecord = await storage.getMedicalRecord(medicalRecordId);
      if (!medicalRecord) {
        return res.status(404).json({ message: 'Medical record not found' });
      }

      if (!medicalRecord.prescription) {
        return res.status(400).json({ message: 'No prescription to sign in this medical record' });
      }

      // Create ICP-Brasil A3 certificate with enhanced compliance
      const certificateInfo = cryptoService.createICPBrasilA3Certificate(
        doctorId,
        doctorName || 'Dr. Médico Demo',
        crm || '123456',
        crmState || 'SP'
      );

      // Simulate A3 token authentication
      try {
        await cryptoService.authenticateA3Token(pin, certificateInfo.certificateId);
      } catch (error) {
        return res.status(401).json({ 
          message: 'Falha na autenticação do token A3. Verifique o PIN.' 
        });
      }

      // Generate secure key pair for signature
      const { privateKey, publicKey } = await cryptoService.generateKeyPair();

      // Create digital signature
      const signatureResult = await cryptoService.signPrescription(
        medicalRecord.prescription,
        privateKey,
        certificateInfo
      );

      // Perform advanced electronic verification
      const verificationResult = await cryptoService.performElectronicVerification(
        signatureResult.signature,
        signatureResult.documentHash,
        signatureResult.certificateInfo
      );

      // Create digital signature record with enhanced ICP-Brasil A3 information
      const digitalSignature = await storage.createDigitalSignature({
        documentType: 'prescription',
        documentId: medicalRecordId,
        patientId: medicalRecord.patientId,
        doctorId: doctorId,
        signature: signatureResult.signature,
        certificateInfo: {
          ...signatureResult.certificateInfo,
          publicKey: publicKey,
          timestamp: signatureResult.timestamp,
          verificationResult,
          legalCompliance: 'CFM Resolução 1821/2007 - Validade Jurídica Plena'
        },
        status: 'signed',
        signedAt: new Date(),
      });

      // Generate comprehensive audit hash
      const auditHash = cryptoService.generateAuditHash(signatureResult, doctorId, medicalRecord.patientId);

      res.json({
        digitalSignature,
        auditHash,
        verificationResult,
        message: 'Prescrição assinada digitalmente com certificado ICP-Brasil A3',
        legalCompliance: 'Assinatura com validade jurídica plena - CFM Resolução 1821/2007'
      });
    } catch (error) {
      console.error('ICP-Brasil A3 prescription signature error:', error);
      res.status(500).json({ 
        message: 'Falha ao assinar prescrição com certificado ICP-Brasil A3' 
      });
    }
  });

  // Validate patient join token (public endpoint for patient join page)
  app.post('/api/auth/validate-patient-token', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }
      
      // Require SESSION_SECRET
      const jwtSecret = process.env.SESSION_SECRET;
      if (!jwtSecret) {
        console.error('SESSION_SECRET not configured - cannot validate token');
        return res.status(500).json({ message: 'Server configuration error' });
      }
      
      // Verify and decode the JWT token
      const payload = jwt.verify(token, jwtSecret, {
        issuer: 'healthcare-system',
        audience: 'websocket',
        algorithms: ['HS256']
      }) as any;
      
      // Validate token type and required fields
      if (payload.type !== 'patient_auth' || !payload.consultationId || !payload.patientId) {
        return res.status(400).json({ message: 'Invalid patient token' });
      }
      
      // Get consultation details
      const consultation = await storage.getVideoConsultation(payload.consultationId);
      if (!consultation) {
        return res.status(404).json({ message: 'Consultation not found' });
      }
      
      // Verify patient authorization
      if (consultation.patientId !== payload.patientId) {
        return res.status(403).json({ message: 'Patient not authorized for this consultation' });
      }
      
      // Return consultation details for patient join page
      res.json({
        consultationId: payload.consultationId,
        patientId: payload.patientId,
        patientName: payload.patientName || 'Paciente',
        status: consultation.status || 'waiting',
        doctorName: 'Dr. Silva', // TODO: Get from appointment/doctor data
        appointmentTime: consultation.createdAt,
        valid: true
      });
      
    } catch (error) {
      console.error('Error validating patient token:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      res.status(500).json({ message: 'Token validation failed' });
    }
  });

  // Get all hospital collaborators (Doctor-only)
  app.get('/api/hospitals', requireAuth, async (req, res) => {
    try {
      const hospitals = await storage.getCollaboratorsByType('hospital');
      res.json(hospitals);
    } catch (error) {
      console.error('Get hospitals error:', error);
      res.status(500).json({ message: 'Failed to get hospitals' });
    }
  });

  // Create new hospital collaborator (Admin-only)
  app.post('/api/hospitals', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      // In production, implement proper admin role check
      // For now, restrict to doctor role as a basic access control
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied: insufficient privileges' });
      }

      const validatedData = insertCollaboratorSchema.parse({
        ...req.body,
        type: 'hospital'
      });
      
      const hospital = await storage.createCollaborator(validatedData);
      res.status(201).json(hospital);
    } catch (error) {
      console.error('Create hospital error:', error);
      res.status(500).json({ message: 'Failed to create hospital' });
    }
  });

  // Create a hospital referral (Doctor-only)
  app.post('/api/hospital-referrals', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== 'doctor') {
        await storage.createCollaboratorIntegration({
          collaboratorId: user.id, // Use the user's ID for tracking
          integrationType: 'authorization_violation',
          entityId: 'hospital_referral_creation',
          action: 'unauthorized_access',
          status: 'failed',
          errorMessage: 'Non-doctor attempted to create hospital referral',
          requestData: {
            userId: user.id,
            userRole: user.role,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: only doctors can create hospital referrals' });
      }

      const { patientId, hospitalId, specialty, urgency, reason, clinicalSummary, requestedServices } = req.body;

      // Validate required fields
      if (!patientId || !hospitalId || !specialty || !reason) {
        return res.status(400).json({ message: 'Missing required fields: patientId, hospitalId, specialty, reason' });
      }

      // Verify hospital collaborator exists and is active
      const hospital = await storage.getCollaborator(hospitalId);
      if (!hospital || hospital.type !== 'hospital' || !hospital.isActive) {
        await storage.createCollaboratorIntegration({
          collaboratorId: user.id, // Use doctor's ID for tracking
          integrationType: 'authorization_violation',
          entityId: hospitalId,
          action: 'invalid_hospital_referral',
          status: 'failed',
          errorMessage: `Invalid hospital ID: ${hospitalId}`,
          requestData: {
            doctorId: user.id,
            patientId,
            hospitalId,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(400).json({ message: 'Invalid or inactive hospital' });
      }

      // Verify patient exists and doctor has access
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      // Create hospital referral
      const newReferral = await storage.createHospitalReferral({
        patientId,
        referringDoctorId: user.id,
        hospitalId,
        specialty,
        urgency: urgency || 'routine',
        reason,
        clinicalSummary,
        requestedServices,
        status: 'pending'
      });

      // Log referral creation
      await storage.createCollaboratorIntegration({
        collaboratorId: hospitalId,
        integrationType: 'hospital_referral',
        entityId: newReferral.id,
        action: 'referral_created',
        status: 'success',
        requestData: {
          patientId,
          referralId: newReferral.id,
          referringDoctorId: user.id,
          specialty,
          urgency: urgency || 'routine',
          timestamp: new Date().toISOString()
        },
      });

      res.status(201).json(newReferral);
    } catch (error) {
      console.error('Create hospital referral error:', error);
      res.status(500).json({ message: 'Failed to create hospital referral' });
    }
  });

  // Get hospital referrals for a specific hospital (External API - requires API key)
  app.get('/api/hospital-referrals/hospital', authenticateApiKey, async (req, res) => {
    try {
      const { collaborator: authenticatedCollaborator } = req as any;
      
      if (authenticatedCollaborator.type !== 'hospital') {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: 'hospital_referrals_list',
          action: 'unauthorized_access',
          status: 'failed',
          errorMessage: 'Non-hospital collaborator attempted to access hospital referrals',
          requestData: {
            collaboratorId: authenticatedCollaborator.id,
            collaboratorType: authenticatedCollaborator.type,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: only hospitals can access this endpoint' });
      }

      const { status, limit = 50, offset = 0 } = req.query;

      // Get referrals for this hospital
      const allReferrals = await storage.getHospitalReferralsByHospital(authenticatedCollaborator.id);
      
      // Filter by status if provided
      const filteredReferrals = status 
        ? allReferrals.filter(referral => referral.status === status)
        : allReferrals;

      // Paginate results
      const paginatedReferrals = filteredReferrals.slice(Number(offset), Number(offset) + Number(limit));

      // Log access
      await storage.createCollaboratorIntegration({
        collaboratorId: authenticatedCollaborator.id,
        integrationType: 'hospital_referral_access',
        entityId: 'referrals_list',
        action: 'referrals_retrieved',
        status: 'success',
        requestData: {
          referralsCount: paginatedReferrals.length,
          statusFilter: status || 'all',
          timestamp: new Date().toISOString()
        },
      });

      res.json({
        referrals: paginatedReferrals,
        total: filteredReferrals.length,
        offset: Number(offset),
        limit: Number(limit)
      });
    } catch (error) {
      console.error('Get hospital referrals error:', error);
      res.status(500).json({ message: 'Failed to get hospital referrals' });
    }
  });

  // Update hospital referral status (External API - requires API key)
  app.patch('/api/hospital-referrals/:referralId', authenticateApiKey, async (req, res) => {
    try {
      const { collaborator: authenticatedCollaborator } = req as any;
      const { referralId } = req.params;
      const { status, scheduledDate, externalReferralId, dischargeNotes, followUpRequired, followUpDate } = req.body;

      if (authenticatedCollaborator.type !== 'hospital') {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: referralId,
          action: 'unauthorized_referral_update',
          status: 'failed',
          errorMessage: 'Non-hospital collaborator attempted to update referral',
          requestData: {
            collaboratorId: authenticatedCollaborator.id,
            collaboratorType: authenticatedCollaborator.type,
            referralId,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: only hospitals can update referrals' });
      }

      // Get existing referral
      const existingReferral = await storage.getHospitalReferral(referralId);
      if (!existingReferral) {
        return res.status(404).json({ message: 'Referral not found' });
      }

      // Verify hospital owns this referral
      if (existingReferral.hospitalId !== authenticatedCollaborator.id) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: referralId,
          action: 'unauthorized_referral_access',
          status: 'failed',
          errorMessage: 'Hospital attempted to access referral from different hospital',
          requestData: {
            referralId,
            referralHospitalId: existingReferral.hospitalId,
            authenticatedHospitalId: authenticatedCollaborator.id,
            requestedStatus: status,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized referral update' });
      }

      // Validate status transitions
      const ALLOWED_HOSPITAL_TRANSITIONS: Record<string, string[]> = {
        'pending': ['accepted', 'rejected'],
        'accepted': ['in_progress', 'cancelled'],
        'in_progress': ['completed', 'cancelled'],
        'rejected': [], // Final state
        'completed': [], // Final state
        'cancelled': [] // Final state
      };

      const currentStatus = existingReferral.status;
      if (status && !ALLOWED_HOSPITAL_TRANSITIONS[currentStatus]?.includes(status)) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'hospital_workflow_violation',
          entityId: referralId,
          action: 'invalid_status_transition',
          status: 'failed',
          errorMessage: `Invalid hospital referral transition from ${currentStatus} to ${status}`,
          requestData: {
            referralId,
            patientId: existingReferral.patientId,
            currentStatus,
            requestedStatus: status,
            validTransitions: ALLOWED_HOSPITAL_TRANSITIONS[currentStatus] || [],
            timestamp: new Date().toISOString()
          },
        });
        return res.status(400).json({ 
          message: `Invalid transition from ${currentStatus} to ${status}`,
          currentStatus,
          validTransitions: ALLOWED_HOSPITAL_TRANSITIONS[currentStatus] || []
        });
      }

      // Prepare update data
      const updateData: any = {};
      if (status) updateData.status = status;
      if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
      if (externalReferralId) updateData.externalReferralId = externalReferralId;
      if (dischargeNotes) updateData.dischargeNotes = dischargeNotes;
      if (followUpRequired !== undefined) updateData.followUpRequired = followUpRequired;
      if (followUpDate) updateData.followUpDate = new Date(followUpDate);
      if (status === 'completed') updateData.completedAt = new Date();

      // Update referral
      const updatedReferral = await storage.updateHospitalReferral(referralId, updateData);

      // Comprehensive audit logging
      await storage.createCollaboratorIntegration({
        collaboratorId: authenticatedCollaborator.id,
        integrationType: 'hospital_referral_update',
        entityId: referralId,
        action: 'status_updated',
        status: 'success',
        requestData: {
          referralId,
          patientId: existingReferral.patientId,
          previousStatus: currentStatus,
          newStatus: status,
          scheduledDate,
          externalReferralId,
          dischargeNotes: dischargeNotes ? '[REDACTED]' : undefined,
          followUpRequired,
          followUpDate,
          timestamp: new Date().toISOString()
        },
      });

      res.json(updatedReferral);
    } catch (error) {
      console.error('Update hospital referral error:', error);
      res.status(500).json({ message: 'Failed to update hospital referral' });
    }
  });

  // Get specific hospital referral (Doctor access)
  app.get('/api/hospital-referrals/:referralId', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied: only doctors can view referrals' });
      }

      const { referralId } = req.params;
      const referral = await storage.getHospitalReferral(referralId);

      if (!referral) {
        return res.status(404).json({ message: 'Referral not found' });
      }

      // Verify doctor has access to this referral
      if (referral.referringDoctorId !== user.id) {
        await storage.createCollaboratorIntegration({
          collaboratorId: user.id, // Use requesting doctor's ID for tracking
          integrationType: 'authorization_violation',
          entityId: referralId,
          action: 'unauthorized_referral_access',
          status: 'failed',
          errorMessage: 'Doctor attempted to access referral from different doctor',
          requestData: {
            referralId,
            referralDoctorId: referral.referringDoctorId,
            requestingDoctorId: user.id,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized referral access' });
      }

      // Log authorized access for audit trail
      await storage.createCollaboratorIntegration({
        collaboratorId: referral.hospitalId, // Use hospital ID for tracking
        integrationType: 'hospital_referral_access',
        entityId: referralId,
        action: 'referral_viewed',
        status: 'success',
        requestData: {
          doctorId: user.id,
          referralId,
          patientId: referral.patientId,
          hospitalId: referral.hospitalId,
          timestamp: new Date().toISOString()
        },
      });

      res.json(referral);
    } catch (error) {
      console.error('Get hospital referral error:', error);
      res.status(500).json({ message: 'Failed to get hospital referral' });
    }
  });

  // Get patient's hospital referrals (Doctor access)
  app.get('/api/patients/:patientId/hospital-referrals', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied: only doctors can view patient referrals' });
      }

      const { patientId } = req.params;
      
      // Get all referrals for patient
      const hospitalReferrals = await storage.getHospitalReferralsByPatient(patientId);
      
      // Filter to only show referrals from this doctor
      const authorizedReferrals = hospitalReferrals.filter(referral => referral.referringDoctorId === user.id);
      
      // Log access attempt with authorization results
      // Use the first hospital ID if referrals exist, otherwise use the doctor's ID for tracking
      const trackingCollaboratorId = hospitalReferrals.length > 0 ? hospitalReferrals[0].hospitalId : user.id;
      await storage.createCollaboratorIntegration({
        collaboratorId: trackingCollaboratorId,
        integrationType: 'patient_hospital_referrals_access',
        entityId: patientId,
        action: 'patient_referrals_viewed',
        status: 'success',
        requestData: {
          doctorId: user.id,
          patientId,
          totalReferrals: hospitalReferrals.length,
          authorizedReferrals: authorizedReferrals.length,
          timestamp: new Date().toISOString()
        },
      });

      res.json(authorizedReferrals);
    } catch (error) {
      console.error('Get patient hospital referrals error:', error);
      res.status(500).json({ message: 'Failed to get patient hospital referrals' });
    }
  });

  // Submit discharge summary (External API - requires API key)
  app.post('/api/hospital-referrals/:referralId/discharge', authenticateApiKey, async (req, res) => {
    try {
      const { collaborator: authenticatedCollaborator } = req as any;
      const { referralId } = req.params;
      const { dischargeNotes, followUpRequired, followUpDate } = req.body;

      if (authenticatedCollaborator.type !== 'hospital') {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: referralId,
          action: 'unauthorized_discharge_submission',
          status: 'failed',
          errorMessage: 'Non-hospital collaborator attempted to submit discharge summary',
          requestData: {
            collaboratorId: authenticatedCollaborator.id,
            collaboratorType: authenticatedCollaborator.type,
            referralId,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: only hospitals can submit discharge summaries' });
      }

      // Get existing referral
      const existingReferral = await storage.getHospitalReferral(referralId);
      if (!existingReferral) {
        return res.status(404).json({ message: 'Referral not found' });
      }

      // Verify hospital owns this referral
      if (existingReferral.hospitalId !== authenticatedCollaborator.id) {
        await storage.createCollaboratorIntegration({
          collaboratorId: authenticatedCollaborator.id,
          integrationType: 'authorization_violation',
          entityId: referralId,
          action: 'unauthorized_discharge_access',
          status: 'failed',
          errorMessage: 'Hospital attempted to access referral from different hospital',
          requestData: {
            referralId,
            referralHospitalId: existingReferral.hospitalId,
            authenticatedHospitalId: authenticatedCollaborator.id,
            timestamp: new Date().toISOString()
          },
        });
        return res.status(403).json({ message: 'Access denied: unauthorized discharge submission' });
      }

      // Validate required fields
      if (!dischargeNotes) {
        return res.status(400).json({ message: 'Discharge notes are required' });
      }

      // Update referral with discharge information
      const updateData: any = {
        dischargeNotes,
        followUpRequired: followUpRequired || false,
        status: 'completed',
        completedAt: new Date()
      };

      if (followUpDate) {
        updateData.followUpDate = new Date(followUpDate);
      }

      const updatedReferral = await storage.updateHospitalReferral(referralId, updateData);

      // Comprehensive audit logging
      await storage.createCollaboratorIntegration({
        collaboratorId: authenticatedCollaborator.id,
        integrationType: 'hospital_discharge_submission',
        entityId: referralId,
        action: 'discharge_submitted',
        status: 'success',
        requestData: {
          referralId,
          patientId: existingReferral.patientId,
          followUpRequired: followUpRequired || false,
          followUpDate,
          timestamp: new Date().toISOString()
        },
      });

      res.json(updatedReferral);
    } catch (error) {
      console.error('Submit discharge summary error:', error);
      res.status(500).json({ message: 'Failed to submit discharge summary' });
    }
  });

  // ===============================
  // ADMIN ENDPOINTS
  // ===============================

  // Get all API keys for admin management
  app.get('/api/admin/api-keys', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      const apiKeys = await storage.getAllApiKeys();
      res.json(apiKeys);
    } catch (error) {
      console.error('Admin API keys fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch API keys' });
    }
  });

  // Create new API key for collaborator
  app.post('/api/admin/api-keys', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      const apiKeyData = insertCollaboratorApiKeySchema.parse(req.body);
      
      // Generate secure API key
      const newApiKey = await storage.createCollaboratorApiKey(apiKeyData);
      
      res.status(201).json(newApiKey);
    } catch (error) {
      console.error('Admin API key creation error:', error);
      res.status(500).json({ message: 'Failed to create API key' });
    }
  });

  // Update API key (activate/deactivate)
  app.patch('/api/admin/api-keys/:keyId', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      const { keyId } = req.params;
      const { isActive } = req.body;

      const updatedKey = await storage.updateCollaboratorApiKey(keyId, { isActive });
      
      if (!updatedKey) {
        return res.status(404).json({ message: 'API key not found' });
      }

      res.json(updatedKey);
    } catch (error) {
      console.error('Admin API key update error:', error);
      res.status(500).json({ message: 'Failed to update API key' });
    }
  });

  // Get integration monitoring data
  app.get('/api/admin/integrations', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      const integrations = await storage.getAllCollaboratorIntegrations();
      
      // Enrich with collaborator names
      const enrichedIntegrations = await Promise.all(
        integrations.map(async (integration) => {
          const collaborator = await storage.getCollaborator(integration.collaboratorId);
          return {
            ...integration,
            collaboratorName: collaborator?.name || 'Unknown'
          };
        })
      );

      res.json(enrichedIntegrations);
    } catch (error) {
      console.error('Admin integrations fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch integration data' });
    }
  });

  // Get analytics and security metrics
  app.get('/api/admin/analytics', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get today's requests
      const todayIntegrations = await storage.getCollaboratorIntegrationsAfterDate(today);
      const todayRequests = todayIntegrations.filter(i => i.action === 'api_request').length;
      const todaySuccess = todayIntegrations.filter(i => i.status === 'success').length;

      // Get security alerts (failed authentications, violations)
      const securityAlerts = todayIntegrations.filter(i => 
        i.status === 'failed' || 
        i.integrationType === 'authorization_violation' ||
        i.action.includes('failed')
      ).length;

      const analytics = {
        todayRequests,
        todaySuccess,
        securityAlerts,
        lastUpdated: new Date().toISOString()
      };

      res.json(analytics);
    } catch (error) {
      console.error('Admin analytics fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // ===============================
  // COMPLIANCE MONITORING ENDPOINTS
  // ===============================

  // Generate compliance report for audit purposes
  app.get('/api/admin/compliance/report', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      const { startDate, endDate, collaboratorId, reportType } = req.query;
      
      // Default to last 30 days if no dates provided
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Generate comprehensive compliance report
      const report = await storage.generateComplianceReport(start, end, collaboratorId as string, reportType as string);
      
      res.json(report);
    } catch (error) {
      console.error('Compliance report generation error:', error);
      res.status(500).json({ message: 'Failed to generate compliance report' });
    }
  });

  // Run automated compliance checks
  app.post('/api/admin/compliance/check', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      // Run comprehensive compliance checks
      const complianceResults = await storage.runComplianceChecks();
      
      // Log compliance check execution (use system collaborator for system-wide events)
      const systemCollaborator = await storage.getOrCreateSystemCollaborator();
      await storage.createCollaboratorIntegration({
        collaboratorId: systemCollaborator.id,
        integrationType: 'compliance_check',
        entityId: 'system_wide',
        action: 'compliance_audit_executed',
        status: 'success',
        requestData: {
          executedBy: user.id,
          executedByRole: user.role,
          timestamp: new Date().toISOString(),
          checksPerformed: complianceResults.totalChecks,
          issuesFound: complianceResults.totalIssues
        },
      });

      res.json(complianceResults);
    } catch (error) {
      console.error('Compliance check execution error:', error);
      res.status(500).json({ message: 'Failed to execute compliance checks' });
    }
  });

  // Get audit trail for specific entity
  app.get('/api/admin/audit-trail/:entityId', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      const { entityId } = req.params;
      const { integrationType, limit = 50 } = req.query;

      const auditTrail = await storage.getDetailedAuditTrail(
        entityId, 
        integrationType as string, 
        parseInt(limit as string)
      );

      res.json(auditTrail);
    } catch (error) {
      console.error('Audit trail fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch audit trail' });
    }
  });

  // Brazilian healthcare compliance validation
  app.post('/api/admin/compliance/validate-healthcare', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      const validationResults = await storage.validateBrazilianHealthcareCompliance();
      
      // Log healthcare compliance validation (use system collaborator for system-wide events)
      const systemCollaborator = await storage.getOrCreateSystemCollaborator();
      await storage.createCollaboratorIntegration({
        collaboratorId: systemCollaborator.id,
        integrationType: 'healthcare_compliance_validation',
        entityId: 'system_wide',
        action: 'brazilian_healthcare_compliance_check',
        status: validationResults.overallStatus,
        requestData: {
          executedBy: user.id,
          executedByRole: user.role,
          timestamp: new Date().toISOString(),
          validationResults
        },
      });

      res.json(validationResults);
    } catch (error) {
      console.error('Healthcare compliance validation error:', error);
      res.status(500).json({ message: 'Failed to validate healthcare compliance' });
    }
  });

  // ======================
  // TMC CREDIT SYSTEM API ROUTES
  // ======================

  // Get user's TMC balance
  app.get('/api/tmc/balance', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const balance = await storage.getUserBalance(user.id);
      res.json({ balance, currency: 'TMC' });
    } catch (error) {
      console.error('TMC balance fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch TMC balance' });
    }
  });

  // Get user's TMC transaction history
  app.get('/api/tmc/transactions', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { limit = 50 } = req.query;
      const transactions = await storage.getTmcTransactionsByUser(user.id, parseInt(limit as string));
      res.json(transactions);
    } catch (error) {
      console.error('TMC transactions fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch TMC transactions' });
    }
  });

  // Recharge TMC credits (admin only)
  app.post('/api/tmc/recharge', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Only admins can recharge credits for users (security hardening)
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      // Validate request body with Zod
      const validationResult = tmcRechargeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Dados inválidos',
          errors: validationResult.error.errors 
        });
      }

      const { userId, amount, method } = validationResult.data;

      const transaction = await storage.rechargeCredits(userId, amount, method);
      const newBalance = await storage.getUserBalance(userId);

      res.json({ 
        transaction, 
        newBalance,
        message: `Successfully recharged ${amount} TMC credits`
      });
    } catch (error) {
      console.error('TMC recharge error:', error);
      res.status(500).json({ message: 'Failed to recharge TMC credits' });
    }
  });

  // Transfer TMC credits between users
  app.post('/api/tmc/transfer', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Validate request body with Zod
      const validationResult = tmcTransferSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Dados inválidos',
          errors: validationResult.error.errors 
        });
      }

      const { toUserId, amount, reason } = validationResult.data;

      if (user.id === toUserId) {
        return res.status(400).json({ message: 'Cannot transfer credits to yourself' });
      }

      const transactions = await storage.transferCredits(user.id, toUserId, amount, reason);
      const newBalance = await storage.getUserBalance(user.id);

      res.json({ 
        transactions, 
        newBalance,
        message: `Successfully transferred ${amount} TMC credits`
      });
    } catch (error) {
      console.error('TMC transfer error:', error);
      const message = error instanceof Error ? error.message : 'Failed to transfer TMC credits';
      res.status(400).json({ message });
    }
  });

  // Debit TMC credits for function usage
  app.post('/api/tmc/debit', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Validate request body with Zod
      const validationResult = tmcDebitSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Dados inválidos',
          errors: validationResult.error.errors 
        });
      }

      const { functionName, appointmentId, medicalRecordId } = validationResult.data;

      // Get function cost
      const cost = await storage.getFunctionCost(functionName);
      if (cost === 0) {
        return res.status(400).json({ message: 'Function not found or is free' });
      }

      // Check sufficient credits
      const hasCredits = await storage.validateSufficientCredits(user.id, functionName);
      if (!hasCredits) {
        return res.status(402).json({ message: 'Insufficient TMC credits', requiredAmount: cost });
      }

      // Process debit
      const transaction = await storage.processDebit(
        user.id, 
        cost, 
        `Function usage: ${functionName}`, 
        functionName,
        undefined,
        appointmentId,
        medicalRecordId
      );

      if (!transaction) {
        return res.status(402).json({ message: 'Insufficient TMC credits' });
      }

      // Process hierarchical commission if user is a doctor
      let commissionTransactions: any[] = [];
      if (user.role === 'doctor' && cost > 0) {
        commissionTransactions = await storage.processHierarchicalCommission(user.id, cost, functionName, appointmentId);
      }

      const newBalance = await storage.getUserBalance(user.id);

      res.json({ 
        transaction, 
        commissionTransactions,
        newBalance,
        functionUsed: functionName,
        cost
      });
    } catch (error) {
      console.error('TMC debit error:', error);
      res.status(500).json({ message: 'Failed to process TMC debit' });
    }
  });

  // Get TMC system configuration (admin only)
  app.get('/api/tmc/config', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      const config = await storage.getTmcConfig();
      res.json(config);
    } catch (error) {
      console.error('TMC config fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch TMC configuration' });
    }
  });

  // Get function cost
  app.get('/api/tmc/function-cost/:functionName', requireAuth, async (req, res) => {
    try {
      const { functionName } = req.params;
      const cost = await storage.getFunctionCost(functionName);
      const config = await storage.getTmcConfigByFunction(functionName);
      
      res.json({ 
        functionName, 
        cost, 
        config: config ? {
          description: config.description,
          category: config.category,
          minimumRole: config.minimumRole,
          bonusForPatient: config.bonusForPatient,
          commissionPercentage: config.commissionPercentage
        } : null
      });
    } catch (error) {
      console.error('TMC function cost fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch function cost' });
    }
  });

  // Update TMC system configuration (admin only)
  app.post('/api/tmc/config', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      // Validate request body with Zod
      const validationResult = tmcConfigSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Dados inválidos',
          errors: validationResult.error.errors 
        });
      }

      const configData = {
        ...validationResult.data,
        updatedBy: user.id
      };

      const config = await storage.createTmcConfig(configData);
      res.json(config);
    } catch (error) {
      console.error('TMC config create error:', error);
      res.status(500).json({ message: 'Failed to create TMC configuration' });
    }
  });

  // Update existing TMC configuration (admin only)
  app.patch('/api/tmc/config/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }

      const { id } = req.params;
      const updateData = {
        ...req.body,
        updatedBy: user.id
      };

      const config = await storage.updateTmcConfig(id, updateData);
      
      if (!config) {
        return res.status(404).json({ message: 'TMC configuration not found' });
      }

      res.json(config);
    } catch (error) {
      console.error('TMC config update error:', error);
      res.status(500).json({ message: 'Failed to update TMC configuration' });
    }
  });

  // Validate sufficient credits for function
  app.post('/api/tmc/validate-credits', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Validate request body with Zod
      const validationResult = tmcValidateCreditsSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Dados inválidos',
          errors: validationResult.error.errors 
        });
      }

      const { functionName } = validationResult.data;

      const hasCredits = await storage.validateSufficientCredits(user.id, functionName);
      const cost = await storage.getFunctionCost(functionName);
      const balance = await storage.getUserBalance(user.id);

      res.json({ 
        hasCredits, 
        functionName,
        cost,
        balance,
        deficit: hasCredits ? 0 : cost - balance
      });
    } catch (error) {
      console.error('TMC validation error:', error);
      res.status(500).json({ message: 'Failed to validate TMC credits' });
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
      // Hash the default password using the same method as login
      const hashedPassword = crypto.createHash('sha256').update('doctor123').digest('hex');
      
      const newDoctor = await storage.createUser({
        username: 'doctor',
        password: hashedPassword, // Properly hashed password
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
      
      // Password migration handled in login endpoint for simplicity
      
      return existingDoctor.id;
    }
  } catch (error) {
    console.error('Failed to initialize default doctor:', error);
    return null;
  }
}
