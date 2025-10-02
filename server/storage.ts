import { 
  users, patients, appointments, medicalRecords, whatsappMessages, 
  examResults, collaborators, doctorSchedule, digitalSignatures, videoConsultations,
  prescriptionShares, labOrders, hospitalReferrals, collaboratorIntegrations, collaboratorApiKeys,
  tmcTransactions, tmcConfig, supportConfig, systemSettings, chatbotReferences, patientNotes,
  consultationNotes, consultationRecordings, errorLogs, layoutSettings,
  type User, type InsertUser, type Patient, type InsertPatient,
  type Appointment, type InsertAppointment, type MedicalRecord, type InsertMedicalRecord,
  type WhatsappMessage, type InsertWhatsappMessage, type ExamResult, type InsertExamResult,
  type Collaborator, type InsertCollaborator, type DoctorSchedule, type InsertDoctorSchedule,
  type DigitalSignature, type InsertDigitalSignature, type VideoConsultation, type InsertVideoConsultation,
  type PrescriptionShare, type InsertPrescriptionShare, type LabOrder, type InsertLabOrder,
  type HospitalReferral, type InsertHospitalReferral, type CollaboratorIntegration, type InsertCollaboratorIntegration,
  type CollaboratorApiKey, type InsertCollaboratorApiKey, type SupportConfig, type InsertSupportConfig,
  type SystemSettings, type InsertSystemSettings, type ChatbotReference, type InsertChatbotReference,
  type PatientNote, type InsertPatientNote, type ConsultationNote, type InsertConsultationNote,
  type ConsultationRecording, type InsertConsultationRecording,
  type LayoutSetting, type InsertLayoutSetting
} from "@shared/schema";

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;

// Import TMC types from schema
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod";

const insertTmcTransactionSchema = createInsertSchema(tmcTransactions);
const insertTmcConfigSchema = createInsertSchema(tmcConfig);

export type TmcTransaction = typeof tmcTransactions.$inferSelect;
export type InsertTmcTransaction = z.infer<typeof insertTmcTransactionSchema>;
export type TmcConfig = typeof tmcConfig.$inferSelect;
export type InsertTmcConfig = z.infer<typeof insertTmcConfigSchema>;

import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  blockUser(userId: string, blockedById: string, reason?: string): Promise<User | undefined>;
  unblockUser(userId: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getRecentUserActivity(limit?: number): Promise<User[]>;

  // Patients
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByPhone(phone: string): Promise<Patient | undefined>;
  getPatientByWhatsapp(whatsappNumber: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string): Promise<boolean>;
  getAllPatients(): Promise<Patient[]>;

  // Appointments
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByPatient(patientId: string): Promise<Appointment[]>;
  getAppointmentsByDoctor(doctorId: string, date?: Date): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  getTodayAppointments(doctorId: string): Promise<Appointment[]>;

  // Medical Records
  getMedicalRecord(id: string): Promise<MedicalRecord | undefined>;
  getMedicalRecordsByPatient(patientId: string): Promise<MedicalRecord[]>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: string, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined>;

  // WhatsApp Messages
  getWhatsappMessage(id: string): Promise<WhatsappMessage | undefined>;
  getWhatsappMessagesByPatient(patientId: string): Promise<WhatsappMessage[]>;
  getUnprocessedWhatsappMessages(): Promise<WhatsappMessage[]>;
  createWhatsappMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage>;
  updateWhatsappMessage(id: string, message: Partial<InsertWhatsappMessage>): Promise<WhatsappMessage | undefined>;

  // Exam Results
  getExamResult(id: string): Promise<ExamResult | undefined>;
  getExamResultsByPatient(patientId: string): Promise<ExamResult[]>;
  createExamResult(result: InsertExamResult): Promise<ExamResult>;

  // Collaborators
  getAllCollaborators(): Promise<Collaborator[]>;
  getCollaborator(id: string): Promise<Collaborator | undefined>;
  getCollaboratorsByType(type: string): Promise<Collaborator[]>;
  createCollaborator(collaborator: InsertCollaborator): Promise<Collaborator>;
  updateCollaborator(id: string, collaborator: Partial<InsertCollaborator>): Promise<Collaborator | undefined>;
  updateCollaboratorStatus(id: string, isOnline: boolean): Promise<void>;

  // Prescription Sharing
  createPrescriptionShare(share: InsertPrescriptionShare): Promise<PrescriptionShare>;
  getPrescriptionShare(id: string): Promise<PrescriptionShare | undefined>;
  getPrescriptionSharesByPatient(patientId: string): Promise<PrescriptionShare[]>;
  getPrescriptionSharesByPharmacy(pharmacyId: string): Promise<PrescriptionShare[]>;
  updatePrescriptionShare(id: string, share: Partial<InsertPrescriptionShare>): Promise<PrescriptionShare | undefined>;

  // Laboratory Orders
  createLabOrder(order: InsertLabOrder): Promise<LabOrder>;
  getLabOrder(id: string): Promise<LabOrder | undefined>;
  getLabOrdersByPatient(patientId: string): Promise<LabOrder[]>;
  getLabOrdersByLaboratory(laboratoryId: string): Promise<LabOrder[]>;
  updateLabOrder(id: string, order: Partial<InsertLabOrder>): Promise<LabOrder | undefined>;

  // Hospital Referrals
  createHospitalReferral(referral: InsertHospitalReferral): Promise<HospitalReferral>;
  getHospitalReferral(id: string): Promise<HospitalReferral | undefined>;
  getHospitalReferralsByPatient(patientId: string): Promise<HospitalReferral[]>;
  getHospitalReferralsByHospital(hospitalId: string): Promise<HospitalReferral[]>;
  updateHospitalReferral(id: string, referral: Partial<InsertHospitalReferral>): Promise<HospitalReferral | undefined>;

  // Integration Monitoring
  createCollaboratorIntegration(integration: InsertCollaboratorIntegration): Promise<CollaboratorIntegration>;
  getCollaboratorIntegrationsByEntity(entityId: string, integrationType: string): Promise<CollaboratorIntegration[]>;
  getCollaboratorIntegrationsByCollaborator(collaboratorId: string): Promise<CollaboratorIntegration[]>;

  // API Key Management
  createCollaboratorApiKey(apiKey: InsertCollaboratorApiKey): Promise<CollaboratorApiKey>;
  getCollaboratorApiKey(id: string): Promise<CollaboratorApiKey | undefined>;
  getCollaboratorApiKeysByCollaborator(collaboratorId: string): Promise<CollaboratorApiKey[]>;
  updateCollaboratorApiKey(id: string, apiKey: Partial<InsertCollaboratorApiKey>): Promise<CollaboratorApiKey | undefined>;
  validateApiKey(hashedKey: string): Promise<CollaboratorApiKey | undefined>;

  // Doctor Schedule
  getDoctorSchedule(doctorId: string): Promise<DoctorSchedule[]>;
  createDoctorSchedule(schedule: InsertDoctorSchedule): Promise<DoctorSchedule>;

  // Digital Signatures
  getPendingSignatures(doctorId: string): Promise<DigitalSignature[]>;
  getDigitalSignature(id: string): Promise<DigitalSignature | undefined>;

  // Video Consultations
  getVideoConsultation(id: string): Promise<VideoConsultation | undefined>;
  getVideoConsultationBySessionId(sessionId: string): Promise<VideoConsultation | undefined>;
  getVideoConsultationsByAppointment(appointmentId: string): Promise<VideoConsultation[]>;
  getActiveVideoConsultations(doctorId: string): Promise<VideoConsultation[]>;
  createVideoConsultation(consultation: InsertVideoConsultation): Promise<VideoConsultation>;
  updateVideoConsultation(id: string, consultation: Partial<InsertVideoConsultation>): Promise<VideoConsultation | undefined>;
  createDigitalSignature(signature: InsertDigitalSignature): Promise<DigitalSignature>;
  updateDigitalSignature(id: string, signature: Partial<InsertDigitalSignature>): Promise<DigitalSignature | undefined>;

  // Compliance and Audit Methods
  getOrCreateSystemCollaborator(): Promise<Collaborator>;
  generateComplianceReport(startDate: Date, endDate: Date, collaboratorId?: string, reportType?: string): Promise<any>;
  runComplianceChecks(): Promise<any>;
  getDetailedAuditTrail(entityId: string, integrationType?: string, limit?: number): Promise<CollaboratorIntegration[]>;
  validateBrazilianHealthcareCompliance(): Promise<any>;

  // TMC Credit System
  createTmcTransaction(transaction: InsertTmcTransaction): Promise<TmcTransaction>;
  getTmcTransactionsByUser(userId: string, limit?: number): Promise<TmcTransaction[]>;
  getTmcTransaction(id: string): Promise<TmcTransaction | undefined>;
  processCredit(userId: string, amount: number, reason: string, functionUsed?: string, relatedUserId?: string, appointmentId?: string, medicalRecordId?: string): Promise<TmcTransaction>;
  processDebit(userId: string, amount: number, reason: string, functionUsed?: string, relatedUserId?: string, appointmentId?: string, medicalRecordId?: string): Promise<TmcTransaction | null>;
  transferCredits(fromUserId: string, toUserId: string, amount: number, reason: string): Promise<TmcTransaction[]>;
  processHierarchicalCommission(doctorId: string, amount: number, functionUsed: string, appointmentId?: string): Promise<TmcTransaction[]>;
  rechargeCredits(userId: string, amount: number, method: string): Promise<TmcTransaction>;
  getUserBalance(userId: string): Promise<number>;
  
  // TMC Configuration
  getTmcConfig(): Promise<TmcConfig[]>;
  getTmcConfigByFunction(functionName: string): Promise<TmcConfig | undefined>;
  createTmcConfig(config: InsertTmcConfig): Promise<TmcConfig>;
  updateTmcConfig(id: string, config: Partial<InsertTmcConfig>): Promise<TmcConfig | undefined>;
  getFunctionCost(functionName: string): Promise<number>;
  validateSufficientCredits(userId: string, functionName: string): Promise<boolean>;

  // System Settings
  getSystemSetting(settingKey: string): Promise<SystemSettings | undefined>;
  getAllSystemSettings(): Promise<SystemSettings[]>;
  createSystemSetting(setting: InsertSystemSettings): Promise<SystemSettings>;
  updateSystemSetting(settingKey: string, settingValue: string): Promise<SystemSettings | undefined>;

  // Chatbot References
  getChatbotReferences(filters?: { allowedRoles?: string[], useForDiagnostics?: boolean, category?: string }): Promise<ChatbotReference[]>;
  getChatbotReference(id: string): Promise<ChatbotReference | undefined>;
  createChatbotReference(reference: InsertChatbotReference): Promise<ChatbotReference>;
  updateChatbotReference(id: string, reference: Partial<InsertChatbotReference>): Promise<ChatbotReference | undefined>;
  deleteChatbotReference(id: string): Promise<boolean>;

  // Patient Notes (Personal Agenda)
  getPatientNotes(patientId: string, userId: string, userRole: string): Promise<PatientNote[]>;
  getPatientNotesByDate(patientId: string, date: Date, userId: string, userRole: string): Promise<PatientNote[]>;
  getPatientNoteById(id: string): Promise<PatientNote | undefined>;
  createPatientNote(note: InsertPatientNote): Promise<PatientNote>;
  updatePatientNote(id: string, note: Partial<InsertPatientNote>): Promise<PatientNote | undefined>;
  deletePatientNote(id: string): Promise<boolean>;

  // Consultation Notes & Recordings
  getConsultationNotes(consultationId: string): Promise<ConsultationNote[]>;
  createConsultationNote(note: InsertConsultationNote): Promise<ConsultationNote>;
  getConsultationRecordings(consultationId: string): Promise<ConsultationRecording[]>;
  createConsultationRecording(recording: InsertConsultationRecording): Promise<ConsultationRecording>;
  
  // Error Logs
  getErrorLogs(filters?: {
    errorType?: string;
    userId?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ErrorLog[]>;
  getErrorLog(id: string): Promise<ErrorLog | undefined>;
  markErrorAsResolved(id: string, resolvedById: string, adminNotes?: string): Promise<ErrorLog | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updateUser: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ ...updateUser })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async blockUser(userId: string, blockedById: string, reason?: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ 
        isBlocked: true, 
        blockedBy: blockedById,
        // Note: we could add a blockedReason field to schema later if needed
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async unblockUser(userId: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ 
        isBlocked: false, 
        blockedBy: null 
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users)
      .where(eq(users.role, role))
      .orderBy(desc(users.createdAt));
  }

  async getRecentUserActivity(limit: number = 50): Promise<User[]> {
    return await db.select().from(users)
      .where(sql`last_login IS NOT NULL`)
      .orderBy(desc(users.lastLogin))
      .limit(limit);
  }

  // Visitor Management
  async getVisitorByIp(ipAddress: string): Promise<User | undefined> {
    const [visitor] = await db.select().from(users)
      .where(and(
        eq(users.role, 'visitor'),
        eq(users.username, ipAddress)
      ));
    return visitor || undefined;
  }

  async createVisitorAccount(ipAddress: string): Promise<User> {
    // Create a visitor account with IP as username
    const visitorData = {
      username: ipAddress,
      password: crypto.createHash('sha256').update(`visitor-${ipAddress}-${Date.now()}`).digest('hex'),
      role: 'visitor' as const,
      name: `Visitante ${ipAddress}`,
      email: undefined,
      phone: undefined,
      tmcCredits: 0
    };
    
    const [visitor] = await db.insert(users).values(visitorData).returning();
    return visitor;
  }

  async upgradeVisitorToUser(ipAddress: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    // Find existing visitor by IP
    const visitor = await this.getVisitorByIp(ipAddress);
    if (!visitor) {
      return undefined;
    }

    // Update visitor account with full user data
    const [upgradedUser] = await db.update(users)
      .set({
        ...userData,
        role: userData.role || 'patient', // Default to patient if no role specified
        lastLogin: new Date()
      })
      .where(eq(users.id, visitor.id))
      .returning();
    
    return upgradedUser || undefined;
  }

  // Patients
  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientByPhone(phone: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.phone, phone));
    return patient || undefined;
  }

  async getPatientByWhatsapp(whatsappNumber: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.whatsappNumber, whatsappNumber));
    return patient || undefined;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(insertPatient).returning();
    return patient;
  }

  async updatePatient(id: string, updatePatient: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [patient] = await db.update(patients)
      .set({ ...updatePatient, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return patient || undefined;
  }

  async deletePatient(id: string): Promise<boolean> {
    const result = await db.delete(patients)
      .where(eq(patients.id, id))
      .returning({ id: patients.id });
    return result.length > 0;
  }

  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  // Appointments
  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.scheduledAt));
  }

  async getAppointmentsByDoctor(doctorId: string, date?: Date): Promise<Appointment[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return await db.select().from(appointments)
        .where(and(
          eq(appointments.doctorId, doctorId),
          gte(appointments.scheduledAt, startOfDay),
          lte(appointments.scheduledAt, endOfDay)
        ))
        .orderBy(appointments.scheduledAt);
    }

    return await db.select().from(appointments)
      .where(eq(appointments.doctorId, doctorId))
      .orderBy(appointments.scheduledAt);
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db.insert(appointments).values(insertAppointment).returning();
    return appointment;
  }

  async updateAppointment(id: string, updateAppointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [appointment] = await db.update(appointments)
      .set({ ...updateAppointment, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return appointment || undefined;
  }

  async getTodayAppointments(doctorId: string): Promise<Appointment[]> {
    return await this.getAppointmentsByDoctor(doctorId, new Date());
  }

  // Medical Records
  async getMedicalRecord(id: string): Promise<MedicalRecord | undefined> {
    const [record] = await db.select().from(medicalRecords).where(eq(medicalRecords.id, id));
    return record || undefined;
  }

  async getMedicalRecordsByPatient(patientId: string): Promise<MedicalRecord[]> {
    return await db.select().from(medicalRecords)
      .where(eq(medicalRecords.patientId, patientId))
      .orderBy(desc(medicalRecords.createdAt));
  }

  async createMedicalRecord(insertRecord: InsertMedicalRecord): Promise<MedicalRecord> {
    const [record] = await db.insert(medicalRecords).values(insertRecord).returning();
    return record;
  }

  async updateMedicalRecord(id: string, updateRecord: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined> {
    const [record] = await db.update(medicalRecords)
      .set({ ...updateRecord, updatedAt: new Date() })
      .where(eq(medicalRecords.id, id))
      .returning();
    return record || undefined;
  }

  // WhatsApp Messages
  async getWhatsappMessage(id: string): Promise<WhatsappMessage | undefined> {
    const [message] = await db.select().from(whatsappMessages).where(eq(whatsappMessages.id, id));
    return message || undefined;
  }

  async getWhatsappMessagesByPatient(patientId: string): Promise<WhatsappMessage[]> {
    return await db.select().from(whatsappMessages)
      .where(eq(whatsappMessages.patientId, patientId))
      .orderBy(whatsappMessages.createdAt);
  }

  async getUnprocessedWhatsappMessages(): Promise<WhatsappMessage[]> {
    return await db.select().from(whatsappMessages)
      .where(eq(whatsappMessages.processed, false))
      .orderBy(whatsappMessages.createdAt);
  }

  async createWhatsappMessage(insertMessage: InsertWhatsappMessage): Promise<WhatsappMessage> {
    const [message] = await db.insert(whatsappMessages).values(insertMessage).returning();
    return message;
  }

  async updateWhatsappMessage(id: string, updateMessage: Partial<InsertWhatsappMessage>): Promise<WhatsappMessage | undefined> {
    const [message] = await db.update(whatsappMessages)
      .set(updateMessage)
      .where(eq(whatsappMessages.id, id))
      .returning();
    return message || undefined;
  }

  // Exam Results
  async getExamResult(id: string): Promise<ExamResult | undefined> {
    const [result] = await db.select().from(examResults).where(eq(examResults.id, id));
    return result || undefined;
  }

  async getExamResultsByPatient(patientId: string): Promise<ExamResult[]> {
    return await db.select().from(examResults)
      .where(eq(examResults.patientId, patientId))
      .orderBy(desc(examResults.createdAt));
  }

  async createExamResult(insertResult: InsertExamResult): Promise<ExamResult> {
    const [result] = await db.insert(examResults).values(insertResult).returning();
    return result;
  }

  // Collaborators
  async getAllCollaborators(): Promise<Collaborator[]> {
    return await db.select().from(collaborators).orderBy(collaborators.name);
  }

  async updateCollaboratorStatus(id: string, isOnline: boolean): Promise<void> {
    await db.update(collaborators)
      .set({ isOnline })
      .where(eq(collaborators.id, id));
  }

  // Doctor Schedule
  async getDoctorSchedule(doctorId: string): Promise<DoctorSchedule[]> {
    return await db.select().from(doctorSchedule)
      .where(and(eq(doctorSchedule.doctorId, doctorId), eq(doctorSchedule.isActive, true)))
      .orderBy(doctorSchedule.dayOfWeek, doctorSchedule.startTime);
  }

  async createDoctorSchedule(insertSchedule: InsertDoctorSchedule): Promise<DoctorSchedule> {
    const [schedule] = await db.insert(doctorSchedule).values(insertSchedule).returning();
    return schedule;
  }

  // Digital Signatures
  async getPendingSignatures(doctorId: string): Promise<DigitalSignature[]> {
    return await db.select().from(digitalSignatures)
      .where(and(eq(digitalSignatures.doctorId, doctorId), eq(digitalSignatures.status, 'pending')))
      .orderBy(desc(digitalSignatures.createdAt));
  }

  async getDigitalSignature(id: string): Promise<DigitalSignature | undefined> {
    const [signature] = await db.select().from(digitalSignatures).where(eq(digitalSignatures.id, id));
    return signature || undefined;
  }

  async createDigitalSignature(insertSignature: InsertDigitalSignature): Promise<DigitalSignature> {
    const [signature] = await db.insert(digitalSignatures).values(insertSignature).returning();
    return signature;
  }

  async updateDigitalSignature(id: string, updateSignature: Partial<InsertDigitalSignature>): Promise<DigitalSignature | undefined> {
    const [signature] = await db.update(digitalSignatures)
      .set(updateSignature)
      .where(eq(digitalSignatures.id, id))
      .returning();
    return signature || undefined;
  }

  // Enhanced method for efficient signature lookup by document
  async getSignatureByDocument(documentId: string, documentType: string): Promise<DigitalSignature | undefined> {
    const [signature] = await db.select().from(digitalSignatures)
      .where(and(
        eq(digitalSignatures.documentId, documentId),
        eq(digitalSignatures.documentType, documentType)
      ))
      .orderBy(desc(digitalSignatures.createdAt))
      .limit(1);
    return signature || undefined;
  }

  // Video Consultations
  async getVideoConsultation(id: string): Promise<VideoConsultation | undefined> {
    const [consultation] = await db.select().from(videoConsultations).where(eq(videoConsultations.id, id));
    return consultation || undefined;
  }

  async getVideoConsultationBySessionId(sessionId: string): Promise<VideoConsultation | undefined> {
    const [consultation] = await db.select().from(videoConsultations)
      .where(eq(videoConsultations.sessionId, sessionId));
    return consultation || undefined;
  }

  async getVideoConsultationsByAppointment(appointmentId: string): Promise<VideoConsultation[]> {
    return await db.select().from(videoConsultations)
      .where(eq(videoConsultations.appointmentId, appointmentId))
      .orderBy(desc(videoConsultations.createdAt));
  }

  async getActiveVideoConsultations(doctorId: string): Promise<VideoConsultation[]> {
    return await db.select().from(videoConsultations)
      .where(and(
        eq(videoConsultations.doctorId, doctorId),
        eq(videoConsultations.status, 'active')
      ))
      .orderBy(desc(videoConsultations.startedAt));
  }

  async createVideoConsultation(insertConsultation: InsertVideoConsultation): Promise<VideoConsultation> {
    const [consultation] = await db.insert(videoConsultations).values(insertConsultation).returning();
    return consultation;
  }

  async updateVideoConsultation(id: string, updateConsultation: Partial<InsertVideoConsultation>): Promise<VideoConsultation | undefined> {
    const [consultation] = await db.update(videoConsultations)
      .set(updateConsultation)
      .where(eq(videoConsultations.id, id))
      .returning();
    return consultation || undefined;
  }

  // Enhanced Collaborator Methods
  async getCollaborator(id: string): Promise<Collaborator | undefined> {
    const [collaborator] = await db.select().from(collaborators).where(eq(collaborators.id, id));
    return collaborator || undefined;
  }

  async getCollaboratorsByType(type: string): Promise<Collaborator[]> {
    return await db.select().from(collaborators)
      .where(eq(collaborators.type, type))
      .orderBy(collaborators.name);
  }

  async createCollaborator(insertCollaborator: InsertCollaborator): Promise<Collaborator> {
    const [collaborator] = await db.insert(collaborators).values(insertCollaborator).returning();
    return collaborator;
  }

  async updateCollaborator(id: string, updateCollaborator: Partial<InsertCollaborator>): Promise<Collaborator | undefined> {
    const [collaborator] = await db.update(collaborators)
      .set(updateCollaborator)
      .where(eq(collaborators.id, id))
      .returning();
    return collaborator || undefined;
  }

  // Prescription Sharing Methods
  async createPrescriptionShare(insertShare: InsertPrescriptionShare): Promise<PrescriptionShare> {
    const [share] = await db.insert(prescriptionShares).values(insertShare).returning();
    return share;
  }

  async getPrescriptionShare(id: string): Promise<PrescriptionShare | undefined> {
    const [share] = await db.select().from(prescriptionShares).where(eq(prescriptionShares.id, id));
    return share || undefined;
  }

  async getPrescriptionSharesByPatient(patientId: string): Promise<PrescriptionShare[]> {
    return await db.select().from(prescriptionShares)
      .where(eq(prescriptionShares.patientId, patientId))
      .orderBy(desc(prescriptionShares.createdAt));
  }

  async getPrescriptionSharesByPharmacy(pharmacyId: string): Promise<PrescriptionShare[]> {
    return await db.select().from(prescriptionShares)
      .where(eq(prescriptionShares.pharmacyId, pharmacyId))
      .orderBy(desc(prescriptionShares.createdAt));
  }

  async updatePrescriptionShare(id: string, updateShare: Partial<InsertPrescriptionShare>): Promise<PrescriptionShare | undefined> {
    const [share] = await db.update(prescriptionShares)
      .set(updateShare)
      .where(eq(prescriptionShares.id, id))
      .returning();
    return share || undefined;
  }

  // Laboratory Order Methods
  async createLabOrder(insertOrder: InsertLabOrder): Promise<LabOrder> {
    const [order] = await db.insert(labOrders).values(insertOrder).returning();
    return order;
  }

  async getLabOrder(id: string): Promise<LabOrder | undefined> {
    const [order] = await db.select().from(labOrders).where(eq(labOrders.id, id));
    return order || undefined;
  }

  async getLabOrdersByPatient(patientId: string): Promise<LabOrder[]> {
    return await db.select().from(labOrders)
      .where(eq(labOrders.patientId, patientId))
      .orderBy(desc(labOrders.createdAt));
  }

  async getLabOrdersByLaboratory(laboratoryId: string): Promise<LabOrder[]> {
    return await db.select().from(labOrders)
      .where(eq(labOrders.laboratoryId, laboratoryId))
      .orderBy(desc(labOrders.createdAt));
  }

  async updateLabOrder(id: string, updateOrder: Partial<InsertLabOrder>): Promise<LabOrder | undefined> {
    const [order] = await db.update(labOrders)
      .set(updateOrder)
      .where(eq(labOrders.id, id))
      .returning();
    return order || undefined;
  }

  // Hospital Referral Methods
  async createHospitalReferral(insertReferral: InsertHospitalReferral): Promise<HospitalReferral> {
    const [referral] = await db.insert(hospitalReferrals).values(insertReferral).returning();
    return referral;
  }

  async getHospitalReferral(id: string): Promise<HospitalReferral | undefined> {
    const [referral] = await db.select().from(hospitalReferrals).where(eq(hospitalReferrals.id, id));
    return referral || undefined;
  }

  async getHospitalReferralsByPatient(patientId: string): Promise<HospitalReferral[]> {
    return await db.select().from(hospitalReferrals)
      .where(eq(hospitalReferrals.patientId, patientId))
      .orderBy(desc(hospitalReferrals.createdAt));
  }

  async getHospitalReferralsByHospital(hospitalId: string): Promise<HospitalReferral[]> {
    return await db.select().from(hospitalReferrals)
      .where(eq(hospitalReferrals.hospitalId, hospitalId))
      .orderBy(desc(hospitalReferrals.createdAt));
  }

  async updateHospitalReferral(id: string, updateReferral: Partial<InsertHospitalReferral>): Promise<HospitalReferral | undefined> {
    const [referral] = await db.update(hospitalReferrals)
      .set(updateReferral)
      .where(eq(hospitalReferrals.id, id))
      .returning();
    return referral || undefined;
  }

  // Integration Monitoring Methods
  async createCollaboratorIntegration(insertIntegration: InsertCollaboratorIntegration): Promise<CollaboratorIntegration> {
    const [integration] = await db.insert(collaboratorIntegrations).values(insertIntegration).returning();
    return integration;
  }

  async getCollaboratorIntegrationsByEntity(entityId: string, integrationType: string): Promise<CollaboratorIntegration[]> {
    return await db.select().from(collaboratorIntegrations)
      .where(and(
        eq(collaboratorIntegrations.entityId, entityId),
        eq(collaboratorIntegrations.integrationType, integrationType)
      ))
      .orderBy(desc(collaboratorIntegrations.createdAt));
  }

  async getCollaboratorIntegrationsByCollaborator(collaboratorId: string): Promise<CollaboratorIntegration[]> {
    return await db.select().from(collaboratorIntegrations)
      .where(eq(collaboratorIntegrations.collaboratorId, collaboratorId))
      .orderBy(desc(collaboratorIntegrations.createdAt));
  }

  // API Key Management Methods
  async createCollaboratorApiKey(insertApiKey: InsertCollaboratorApiKey): Promise<CollaboratorApiKey> {
    const [apiKey] = await db.insert(collaboratorApiKeys).values(insertApiKey).returning();
    return apiKey;
  }

  async getCollaboratorApiKey(id: string): Promise<CollaboratorApiKey | undefined> {
    const [apiKey] = await db.select().from(collaboratorApiKeys).where(eq(collaboratorApiKeys.id, id));
    return apiKey || undefined;
  }

  async getCollaboratorApiKeysByCollaborator(collaboratorId: string): Promise<CollaboratorApiKey[]> {
    return await db.select().from(collaboratorApiKeys)
      .where(eq(collaboratorApiKeys.collaboratorId, collaboratorId))
      .orderBy(desc(collaboratorApiKeys.createdAt));
  }

  async updateCollaboratorApiKey(id: string, updateApiKey: Partial<InsertCollaboratorApiKey>): Promise<CollaboratorApiKey | undefined> {
    const [apiKey] = await db.update(collaboratorApiKeys)
      .set(updateApiKey)
      .where(eq(collaboratorApiKeys.id, id))
      .returning();
    return apiKey || undefined;
  }

  async validateApiKey(hashedKey: string): Promise<CollaboratorApiKey | undefined> {
    const [apiKey] = await db.select().from(collaboratorApiKeys)
      .where(and(
        eq(collaboratorApiKeys.hashedKey, hashedKey),
        eq(collaboratorApiKeys.isActive, true)
      ));
    return apiKey || undefined;
  }

  // Admin Methods for API Key Management
  async getAllApiKeys(): Promise<CollaboratorApiKey[]> {
    return await db.select().from(collaboratorApiKeys)
      .orderBy(desc(collaboratorApiKeys.createdAt));
  }

  // Admin Methods for Integration Monitoring
  async getAllCollaboratorIntegrations(): Promise<CollaboratorIntegration[]> {
    return await db.select().from(collaboratorIntegrations)
      .orderBy(desc(collaboratorIntegrations.createdAt))
      .limit(1000); // Limit to prevent overwhelming the admin interface
  }

  async getCollaboratorIntegrationsAfterDate(date: Date): Promise<CollaboratorIntegration[]> {
    return await db.select().from(collaboratorIntegrations)
      .where(gte(collaboratorIntegrations.createdAt, date))
      .orderBy(desc(collaboratorIntegrations.createdAt));
  }

  // Enhanced Compliance Monitoring Methods
  async generateComplianceReport(startDate: Date, endDate: Date, collaboratorId?: string, reportType?: string): Promise<any> {
    const whereConditions = [
      gte(collaboratorIntegrations.createdAt, startDate),
      lte(collaboratorIntegrations.createdAt, endDate)
    ];

    if (collaboratorId) {
      whereConditions.push(eq(collaboratorIntegrations.collaboratorId, collaboratorId));
    }

    const integrations = await db.select().from(collaboratorIntegrations)
      .where(and(...whereConditions))
      .orderBy(desc(collaboratorIntegrations.createdAt));

    // Generate comprehensive compliance metrics
    const totalRequests = integrations.length;
    const successfulRequests = integrations.filter(i => i.status === 'success').length;
    const failedRequests = integrations.filter(i => i.status === 'failed').length;
    const securityViolations = integrations.filter(i => 
      i.integrationType === 'authorization_violation' || 
      i.action.includes('failed')
    ).length;

    // Group by integration type
    const byIntegrationType = integrations.reduce((acc, integration) => {
      acc[integration.integrationType] = (acc[integration.integrationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by collaborator
    const byCollaborator = integrations.reduce((acc, integration) => {
      acc[integration.collaboratorId] = (acc[integration.collaboratorId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate compliance score (percentage of successful requests)
    const complianceScore = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;

    return {
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        reportPeriod: { startDate, endDate },
        collaboratorId,
        reportType: reportType || 'comprehensive'
      },
      summary: {
        totalRequests,
        successfulRequests,
        failedRequests,
        securityViolations,
        complianceScore: Math.round(complianceScore * 100) / 100
      },
      breakdown: {
        byIntegrationType,
        byCollaborator
      },
      detailedEvents: integrations.slice(0, 100), // Limit for report size
      recommendations: this.generateComplianceRecommendations(complianceScore, securityViolations, failedRequests)
    };
  }

  async runComplianceChecks(): Promise<any> {
    const checks = [];
    let totalIssues = 0;

    // Check 1: Verify all collaborators have valid CNPJ and CNES using enhanced validation
    const collaboratorsList = await db.select().from(collaborators);
    const invalidCollaborators = collaboratorsList.filter((c: any) => 
      !this.isValidCNPJ(c.cnpj) || !this.isValidCNES(c.cnes)
    );
    checks.push({
      checkName: 'CNPJ/CNES Validation',
      status: invalidCollaborators.length === 0 ? 'PASS' : 'FAIL',
      issues: invalidCollaborators.length,
      details: invalidCollaborators.map((c: any) => {
        const cnpjValid = this.isValidCNPJ(c.cnpj);
        const cnesValid = this.isValidCNES(c.cnes);
        return `${c.name}: ${!cnpjValid ? 'Invalid CNPJ' : ''}${!cnpjValid && !cnesValid ? ' and ' : ''}${!cnesValid ? 'Invalid CNES' : ''}`;
      })
    });
    totalIssues += invalidCollaborators.length;

    // Check 2: Verify API keys are not expired
    const apiKeys = await db.select().from(collaboratorApiKeys)
      .where(eq(collaboratorApiKeys.isActive, true));
    const expiredKeys = apiKeys.filter(k => 
      k.expiresAt && new Date(k.expiresAt) < new Date()
    );
    checks.push({
      checkName: 'API Key Expiration',
      status: expiredKeys.length === 0 ? 'PASS' : 'FAIL',
      issues: expiredKeys.length,
      details: expiredKeys.map(k => `Key ${k.keyName}: Expired on ${k.expiresAt}`)
    });
    totalIssues += expiredKeys.length;

    // Check 3: Review recent security violations
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentViolations = await db.select().from(collaboratorIntegrations)
      .where(and(
        gte(collaboratorIntegrations.createdAt, yesterday),
        eq(collaboratorIntegrations.integrationType, 'authorization_violation')
      ));
    checks.push({
      checkName: 'Recent Security Violations',
      status: recentViolations.length < 5 ? 'PASS' : 'WARNING',
      issues: recentViolations.length,
      details: recentViolations.map(v => `${v.action}: ${v.errorMessage}`)
    });
    if (recentViolations.length >= 5) totalIssues += 1;

    // Check 4: Verify digital signature compliance
    const prescriptionSharesList = await db.select().from(prescriptionShares);
    const unsignedPrescriptions = prescriptionSharesList.filter((p: any) => !p.signature);
    checks.push({
      checkName: 'Digital Signature Compliance',
      status: unsignedPrescriptions.length === 0 ? 'PASS' : 'FAIL',
      issues: unsignedPrescriptions.length,
      details: unsignedPrescriptions.map((p: any) => `Prescription ${p.id}: Missing digital signature`)
    });
    totalIssues += unsignedPrescriptions.length;

    return {
      executedAt: new Date().toISOString(),
      overallStatus: totalIssues === 0 ? 'COMPLIANT' : totalIssues < 5 ? 'MINOR_ISSUES' : 'CRITICAL_ISSUES',
      totalChecks: checks.length,
      totalIssues,
      checks,
      nextRecommendedCheck: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Weekly
    };
  }

  async getDetailedAuditTrail(entityId: string, integrationType?: string, limit: number = 50): Promise<CollaboratorIntegration[]> {
    const whereConditions = [eq(collaboratorIntegrations.entityId, entityId)];
    
    if (integrationType) {
      whereConditions.push(eq(collaboratorIntegrations.integrationType, integrationType));
    }

    return await db.select().from(collaboratorIntegrations)
      .where(and(...whereConditions))
      .orderBy(desc(collaboratorIntegrations.createdAt))
      .limit(limit);
  }

  async validateBrazilianHealthcareCompliance(): Promise<any> {
    const validations = [];
    let overallStatus = 'success';

    // Validation 1: CNPJ format compliance
    const collaboratorsForValidation = await db.select().from(collaborators);
    const cnpjValidation = this.validateCNPJCompliance(collaboratorsForValidation);
    validations.push(cnpjValidation);
    if (cnpjValidation.status === 'failed') overallStatus = 'failed';

    // Validation 2: CNES registration compliance
    const cnesValidation = this.validateCNESCompliance(collaboratorsForValidation);
    validations.push(cnesValidation);
    if (cnesValidation.status === 'failed') overallStatus = 'failed';

    // Validation 3: Digital signature compliance (ICP-Brasil)
    const prescriptionSharesForValidation = await db.select().from(prescriptionShares);
    const signatureValidation = this.validateDigitalSignatureCompliance(prescriptionSharesForValidation);
    validations.push(signatureValidation);
    if (signatureValidation.status === 'failed') overallStatus = 'failed';

    // Validation 4: Ministry of Health protocol compliance
    const protocolValidation = await this.validateMinistryProtocolCompliance();
    validations.push(protocolValidation);
    if (protocolValidation.status === 'failed') overallStatus = 'failed';

    return {
      validatedAt: new Date().toISOString(),
      overallStatus,
      validations,
      complianceScore: this.calculateComplianceScore(validations),
      recommendations: this.generateHealthcareComplianceRecommendations(validations)
    };
  }

  // Helper methods for compliance validation
  private validateCNPJCompliance(collaborators: any[]): any {
    const invalidCNPJ = collaborators.filter(c => !this.isValidCNPJ(c.cnpj));
    return {
      validation: 'CNPJ Compliance',
      status: invalidCNPJ.length === 0 ? 'success' : 'failed',
      issues: invalidCNPJ.length,
      details: invalidCNPJ.map(c => `${c.name}: Invalid CNPJ format - ${c.cnpj}`)
    };
  }

  private validateCNESCompliance(collaborators: any[]): any {
    const invalidCNES = collaborators.filter(c => !this.isValidCNES(c.cnes));
    return {
      validation: 'CNES Registration',
      status: invalidCNES.length === 0 ? 'success' : 'failed',
      issues: invalidCNES.length,
      details: invalidCNES.map(c => `${c.name}: Invalid CNES format - ${c.cnes}`)
    };
  }

  private validateDigitalSignatureCompliance(prescriptionShares: any[]): any {
    const unsignedPrescriptions = prescriptionShares.filter(p => !p.signature);
    return {
      validation: 'Digital Signature (ICP-Brasil)',
      status: unsignedPrescriptions.length === 0 ? 'success' : 'failed',
      issues: unsignedPrescriptions.length,
      details: unsignedPrescriptions.map(p => `Prescription ${p.id}: Missing ICP-Brasil compliant signature`)
    };
  }

  private async validateMinistryProtocolCompliance(): Promise<any> {
    // Validate that all workflow transitions follow Ministry of Health protocols
    const recentIntegrations = await db.select().from(collaboratorIntegrations)
      .where(gte(collaboratorIntegrations.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
    
    const protocolViolations = recentIntegrations.filter(i => 
      i.status === 'failed' && i.errorMessage?.includes('Invalid transition')
    );

    return {
      validation: 'Ministry of Health Protocols',
      status: protocolViolations.length === 0 ? 'success' : 'failed',
      issues: protocolViolations.length,
      details: protocolViolations.map(v => `Protocol violation: ${v.errorMessage}`)
    };
  }


  private calculateComplianceScore(validations: any[]): number {
    const passedValidations = validations.filter(v => v.status === 'success').length;
    return Math.round((passedValidations / validations.length) * 100);
  }

  private generateComplianceRecommendations(complianceScore: number, securityViolations: number, failedRequests: number): string[] {
    const recommendations = [];
    
    if (complianceScore < 95) {
      recommendations.push('Review and address failed requests to improve compliance score');
    }
    
    if (securityViolations > 0) {
      recommendations.push('Investigate security violations and strengthen access controls');
    }
    
    if (failedRequests > 10) {
      recommendations.push('Analyze failed request patterns and provide additional collaborator training');
    }
    
    recommendations.push('Schedule regular compliance audits (weekly recommended)');
    
    return recommendations;
  }

  private generateHealthcareComplianceRecommendations(validations: any[]): string[] {
    const recommendations = [];
    
    validations.forEach(v => {
      if (v.status === 'failed') {
        switch (v.validation) {
          case 'CNPJ Compliance':
            recommendations.push('Update collaborator CNPJ information to valid Brazilian tax IDs');
            break;
          case 'CNES Registration':
            recommendations.push('Verify and update CNES registrations with Ministry of Health');
            break;
          case 'Digital Signature (ICP-Brasil)':
            recommendations.push('Ensure all prescriptions use ICP-Brasil compliant digital signatures');
            break;
          case 'Ministry of Health Protocols':
            recommendations.push('Review workflow transitions to ensure Ministry of Health protocol compliance');
            break;
        }
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('System is compliant with Brazilian healthcare regulations');
      recommendations.push('Continue monitoring and maintain current compliance standards');
    }
    
    return recommendations;
  }

  // System Collaborator Management for system-wide events
  async getOrCreateSystemCollaborator(): Promise<any> {
    // Check if system collaborator exists
    const [existingSystemCollaborator] = await db.select().from(collaborators)
      .where(eq(collaborators.email, 'system@media.med.br'));

    if (existingSystemCollaborator) {
      return existingSystemCollaborator;
    }

    // Create system collaborator for audit logging
    const [systemCollaborator] = await db.insert(collaborators).values({
      name: 'Sistema MedIA - Compliance Monitor',
      type: 'system',
      email: 'system@media.med.br',
      phone: '+55 11 0000-0000',
      address: 'Sistema Interno',
      cnpj: '00.000.000/0000-00',
      cnes: '0000000',
      specialization: 'system_monitoring,compliance_auditing',
      isActive: true
    }).returning();

    return systemCollaborator;
  }

  // Enhanced CNPJ validation with checksum
  private isValidCNPJ(cnpj: string): boolean {
    if (!cnpj) return false;
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    
    // Check length
    if (cleanCNPJ.length !== 14) return false;
    
    // Check for invalid patterns (all same digits)
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
    
    // CNPJ checksum validation
    let sum = 0;
    let weight = 2;
    for (let i = 11; i >= 0; i--) {
      sum += parseInt(cleanCNPJ.charAt(i)) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    sum = 0;
    weight = 2;
    for (let i = 12; i >= 0; i--) {
      sum += parseInt(cleanCNPJ.charAt(i)) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    return parseInt(cleanCNPJ.charAt(12)) === digit1 && parseInt(cleanCNPJ.charAt(13)) === digit2;
  }

  // Enhanced CNES validation
  private isValidCNES(cnes: string): boolean {
    if (!cnes) return false;
    const cleanCNES = cnes.replace(/[^\d]/g, '');
    
    // Check length - CNES must be exactly 7 digits
    if (cleanCNES.length !== 7) return false;
    
    // Check for invalid patterns (all same digits)
    if (/^(\d)\1{6}$/.test(cleanCNES)) return false;
    
    return true;
  }

  // TMC Credit System Implementation
  async createTmcTransaction(insertTransaction: InsertTmcTransaction): Promise<TmcTransaction> {
    const [transaction] = await db.insert(tmcTransactions).values(insertTransaction).returning();
    return transaction;
  }

  async getTmcTransactionsByUser(userId: string, limit: number = 50): Promise<TmcTransaction[]> {
    return await db.select().from(tmcTransactions)
      .where(eq(tmcTransactions.userId, userId))
      .orderBy(desc(tmcTransactions.createdAt))
      .limit(limit);
  }

  async getTmcTransaction(id: string): Promise<TmcTransaction | undefined> {
    const [transaction] = await db.select().from(tmcTransactions).where(eq(tmcTransactions.id, id));
    return transaction || undefined;
  }

  async getUserBalance(userId: string): Promise<number> {
    const [user] = await db.select({ tmcCredits: users.tmcCredits }).from(users).where(eq(users.id, userId));
    return user?.tmcCredits || 0;
  }

  async processCredit(userId: string, amount: number, reason: string, functionUsed?: string, relatedUserId?: string, appointmentId?: string, medicalRecordId?: string): Promise<TmcTransaction> {
    // Use database transaction for atomic operation with row locking
    return await db.transaction(async (tx) => {
      // Lock user's row for balance update to prevent concurrent modifications
      const [user] = await tx.select({ tmcCredits: users.tmcCredits })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const balanceBefore = user.tmcCredits;
      const balanceAfter = balanceBefore + amount;
      
      // Update user balance atomically
      await tx.update(users)
        .set({ tmcCredits: balanceAfter })
        .where(eq(users.id, userId));

      // Record transaction
      const [transaction] = await tx.insert(tmcTransactions).values({
        userId,
        type: 'credit',
        amount,
        reason,
        functionUsed,
        relatedUserId,
        balanceBefore,
        balanceAfter,
        appointmentId,
        medicalRecordId
      }).returning();

      return transaction;
    });
  }

  async processDebit(userId: string, amount: number, reason: string, functionUsed?: string, relatedUserId?: string, appointmentId?: string, medicalRecordId?: string): Promise<TmcTransaction | null> {
    // Use database transaction for atomic operation with row locking
    return await db.transaction(async (tx) => {
      // Lock user's row for balance check to prevent concurrent modifications
      const [user] = await tx.select({ tmcCredits: users.tmcCredits })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      
      if (!user || user.tmcCredits < amount) {
        return null; // Insufficient balance
      }
      
      const balanceBefore = user.tmcCredits;
      const balanceAfter = balanceBefore - amount;
      
      // Update user balance atomically
      await tx.update(users)
        .set({ tmcCredits: balanceAfter })
        .where(eq(users.id, userId));

      // Record transaction
      const [transaction] = await tx.insert(tmcTransactions).values({
        userId,
        type: 'debit',
        amount: -amount, // Negative for debits
        reason,
        functionUsed,
        relatedUserId,
        balanceBefore,
        balanceAfter,
        appointmentId,
        medicalRecordId
      }).returning();

      return transaction;
    });
  }

  async transferCredits(fromUserId: string, toUserId: string, amount: number, reason: string): Promise<TmcTransaction[]> {
    // Use database transaction for atomic operation
    return await db.transaction(async (tx) => {
      // Lock sender's row for balance check
      const [sender] = await tx.select({ tmcCredits: users.tmcCredits })
        .from(users)
        .where(eq(users.id, fromUserId))
        .for('update');
      
      if (!sender || sender.tmcCredits < amount) {
        throw new Error('Insufficient balance for transfer');
      }

      // Atomically update both balances
      const fromBalanceBefore = sender.tmcCredits;
      const fromBalanceAfter = fromBalanceBefore - amount;
      
      const [recipient] = await tx.select({ tmcCredits: users.tmcCredits })
        .from(users)
        .where(eq(users.id, toUserId))
        .for('update');
      
      if (!recipient) {
        throw new Error('Recipient not found');
      }
      
      const toBalanceBefore = recipient.tmcCredits;
      const toBalanceAfter = toBalanceBefore + amount;

      // Update balances atomically
      await tx.update(users)
        .set({ tmcCredits: fromBalanceAfter })
        .where(eq(users.id, fromUserId));
        
      await tx.update(users)
        .set({ tmcCredits: toBalanceAfter })
        .where(eq(users.id, toUserId));

      // Record both transactions
      const [debitTransaction] = await tx.insert(tmcTransactions).values({
        userId: fromUserId,
        type: 'transfer',
        amount: -amount,
        reason: `Transfer to user - ${reason}`,
        functionUsed: 'transfer',
        relatedUserId: toUserId,
        balanceBefore: fromBalanceBefore,
        balanceAfter: fromBalanceAfter
      }).returning();

      const [creditTransaction] = await tx.insert(tmcTransactions).values({
        userId: toUserId,
        type: 'transfer',
        amount: amount,
        reason: `Transfer from user - ${reason}`,
        functionUsed: 'transfer',
        relatedUserId: fromUserId,
        balanceBefore: toBalanceBefore,
        balanceAfter: toBalanceAfter
      }).returning();

      return [debitTransaction, creditTransaction];
    });
  }

  async processHierarchicalCommission(doctorId: string, amount: number, functionUsed: string, appointmentId?: string): Promise<TmcTransaction[]> {
    // Use database transaction for atomic commission processing across hierarchy
    return await db.transaction(async (tx) => {
      const transactions: TmcTransaction[] = [];
      
      // Build complete hierarchy first to avoid recursive transactions
      const hierarchy: Array<{id: string, superiorId: string, percentage: number, level: number}> = [];
      let currentDoctorId = doctorId;
      let level = 0;
      
      while (currentDoctorId && level < 3) {
        const [doctor] = await tx.select({
          id: users.id,
          superiorDoctorId: users.superiorDoctorId,
          percentageFromInferiors: users.percentageFromInferiors,
          hierarchyLevel: users.hierarchyLevel
        }).from(users).where(eq(users.id, currentDoctorId));

        if (!doctor || !doctor.superiorDoctorId) break;

        hierarchy.push({
          id: doctor.superiorDoctorId,
          superiorId: doctor.id,
          percentage: doctor.percentageFromInferiors || 10,
          level: level + 1
        });

        currentDoctorId = doctor.superiorDoctorId;
        level++;
      }

      // Process all commissions atomically
      let currentAmount = amount;
      for (const hierItem of hierarchy) {
        const commissionAmount = Math.floor((currentAmount * hierItem.percentage) / 100);
        
        if (commissionAmount > 0) {
          // Lock user's row for balance update
          const [user] = await tx.select({ tmcCredits: users.tmcCredits })
            .from(users)
            .where(eq(users.id, hierItem.id))
            .for('update');
          
          if (user) {
            const balanceBefore = user.tmcCredits;
            const balanceAfter = balanceBefore + commissionAmount;
            
            // Update balance atomically
            await tx.update(users)
              .set({ tmcCredits: balanceAfter })
              .where(eq(users.id, hierItem.id));

            // Record transaction
            const [transaction] = await tx.insert(tmcTransactions).values({
              userId: hierItem.id,
              type: 'credit',
              amount: commissionAmount,
              reason: `Level ${hierItem.level} commission from doctor hierarchy - ${functionUsed}`,
              functionUsed,
              relatedUserId: doctorId,
              balanceBefore,
              balanceAfter,
              appointmentId
            }).returning();

            transactions.push(transaction);
            currentAmount = commissionAmount; // Next level gets percentage of this commission
          }
        }
      }

      return transactions;
    });
  }

  async rechargeCredits(userId: string, amount: number, method: string): Promise<TmcTransaction> {
    // Use atomic processCredit which already has transaction support
    return await this.processCredit(userId, amount, `Credit recharge via ${method}`, 'recharge');
  }

  // TMC Configuration Implementation
  async getTmcConfig(): Promise<TmcConfig[]> {
    return await db.select().from(tmcConfig)
      .where(eq(tmcConfig.isActive, true))
      .orderBy(tmcConfig.category, tmcConfig.functionName);
  }

  async getTmcConfigByFunction(functionName: string): Promise<TmcConfig | undefined> {
    const [config] = await db.select().from(tmcConfig)
      .where(and(eq(tmcConfig.functionName, functionName), eq(tmcConfig.isActive, true)));
    return config || undefined;
  }

  async createTmcConfig(insertConfig: InsertTmcConfig): Promise<TmcConfig> {
    const [config] = await db.insert(tmcConfig).values(insertConfig).returning();
    return config;
  }

  async updateTmcConfig(id: string, updateConfig: Partial<InsertTmcConfig>): Promise<TmcConfig | undefined> {
    const [config] = await db.update(tmcConfig)
      .set({ ...updateConfig, updatedAt: sql`now()` })
      .where(eq(tmcConfig.id, id))
      .returning();
    return config || undefined;
  }

  async getFunctionCost(functionName: string): Promise<number> {
    const config = await this.getTmcConfigByFunction(functionName);
    return config?.costInCredits || 0;
  }

  async validateSufficientCredits(userId: string, functionName: string): Promise<boolean> {
    const userBalance = await this.getUserBalance(userId);
    const functionCost = await this.getFunctionCost(functionName);
    return userBalance >= functionCost;
  }

  // Support System Implementation
  async getSupportConfig(): Promise<SupportConfig | undefined> {
    const [config] = await db.select().from(supportConfig)
      .where(eq(supportConfig.isActive, true))
      .orderBy(desc(supportConfig.createdAt))
      .limit(1);
    return config || undefined;
  }

  async createSupportConfig(insertConfig: InsertSupportConfig): Promise<SupportConfig> {
    const [config] = await db.insert(supportConfig).values(insertConfig).returning();
    return config;
  }

  async updateSupportConfig(id: string, updateConfig: Partial<InsertSupportConfig>): Promise<SupportConfig | undefined> {
    const [config] = await db.update(supportConfig)
      .set({ ...updateConfig, updatedAt: sql`now()` })
      .where(eq(supportConfig.id, id))
      .returning();
    return config || undefined;
  }

  async getOrCreateDefaultSupportConfig(): Promise<SupportConfig> {
    let config = await this.getSupportConfig();
    
    if (!config) {
      // Create default support configuration
      config = await this.createSupportConfig({
        whatsappNumber: "5511960708817", // +55 11 96070-8817 - Default admin support number
        supportEmail: "info@interligas.org",
        samuWhatsapp: "5517933004006",
        samuOnlineUrl: "https://samu.saude.gov.br/emergencia",
        supportChatbotEnabled: true,
        emergencyGeolocationEnabled: true,
        paraguayEmergencyNumber: "911",
        emergencySmsEnabled: true,
        autoResponderEnabled: true,
        autoResponderMessage: "Obrigado por entrar em contato! Nossa equipe responderá em breve.",
        isActive: true
      });
    }
    
    return config;
  }

  // System Settings Implementation
  async getSystemSetting(settingKey: string): Promise<SystemSettings | undefined> {
    const [setting] = await db.select().from(systemSettings)
      .where(eq(systemSettings.settingKey, settingKey));
    return setting || undefined;
  }

  async getAllSystemSettings(): Promise<SystemSettings[]> {
    return await db.select().from(systemSettings)
      .orderBy(systemSettings.settingKey);
  }

  async createSystemSetting(insertSetting: InsertSystemSettings): Promise<SystemSettings> {
    const [setting] = await db.insert(systemSettings).values(insertSetting).returning();
    return setting;
  }

  async updateSystemSetting(settingKey: string, settingValue: string): Promise<SystemSettings | undefined> {
    const [setting] = await db.update(systemSettings)
      .set({ settingValue, updatedAt: sql`now()` })
      .where(eq(systemSettings.settingKey, settingKey))
      .returning();
    return setting || undefined;
  }

  // Chatbot References Implementation
  async getChatbotReferences(filters?: { allowedRoles?: string[], useForDiagnostics?: boolean, category?: string }): Promise<ChatbotReference[]> {
    let query = db.select().from(chatbotReferences).where(eq(chatbotReferences.isActive, true));

    // Apply filters if provided
    if (filters?.category) {
      query = query.where(eq(chatbotReferences.category, filters.category)) as any;
    }

    if (filters?.useForDiagnostics !== undefined) {
      query = query.where(eq(chatbotReferences.useForDiagnostics, filters.useForDiagnostics)) as any;
    }

    // Note: allowedRoles filter would require additional logic based on schema structure
    // For now, returning all active references matching other filters

    return await query.orderBy(chatbotReferences.title) as any;
  }

  async getChatbotReference(id: string): Promise<ChatbotReference | undefined> {
    const [reference] = await db.select().from(chatbotReferences)
      .where(eq(chatbotReferences.id, id));
    return reference || undefined;
  }

  async createChatbotReference(insertReference: InsertChatbotReference): Promise<ChatbotReference> {
    const [reference] = await db.insert(chatbotReferences).values(insertReference).returning();
    return reference;
  }

  async updateChatbotReference(id: string, updateReference: Partial<InsertChatbotReference>): Promise<ChatbotReference | undefined> {
    const [reference] = await db.update(chatbotReferences)
      .set({ ...updateReference, updatedAt: sql`now()` })
      .where(eq(chatbotReferences.id, id))
      .returning();
    return reference || undefined;
  }

  async deleteChatbotReference(id: string): Promise<boolean> {
    const result = await db.delete(chatbotReferences)
      .where(eq(chatbotReferences.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Patient Notes Implementation
  async getPatientNotes(patientId: string, userId: string, userRole: string): Promise<PatientNote[]> {
    // Patient can see their own notes, admin can see all notes
    if (userRole === 'admin') {
      return await db.select().from(patientNotes)
        .where(eq(patientNotes.patientId, patientId))
        .orderBy(desc(patientNotes.date));
    } else if (userRole === 'patient') {
      // Patient sees their own notes
      return await db.select().from(patientNotes)
        .where(and(
          eq(patientNotes.patientId, patientId),
          eq(patientNotes.userId, userId)
        ))
        .orderBy(desc(patientNotes.date));
    }
    return [];
  }

  async getPatientNotesByDate(patientId: string, date: Date, userId: string, userRole: string): Promise<PatientNote[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    if (userRole === 'admin') {
      return await db.select().from(patientNotes)
        .where(and(
          eq(patientNotes.patientId, patientId),
          gte(patientNotes.date, startOfDay),
          lte(patientNotes.date, endOfDay)
        ))
        .orderBy(patientNotes.date);
    } else if (userRole === 'patient') {
      return await db.select().from(patientNotes)
        .where(and(
          eq(patientNotes.patientId, patientId),
          eq(patientNotes.userId, userId),
          gte(patientNotes.date, startOfDay),
          lte(patientNotes.date, endOfDay)
        ))
        .orderBy(patientNotes.date);
    }
    return [];
  }

  async getPatientNoteById(id: string): Promise<PatientNote | undefined> {
    const [note] = await db.select().from(patientNotes).where(eq(patientNotes.id, id)).limit(1);
    return note || undefined;
  }

  async createPatientNote(insertNote: InsertPatientNote): Promise<PatientNote> {
    const [note] = await db.insert(patientNotes).values(insertNote).returning();
    return note;
  }

  async updatePatientNote(id: string, updateNote: Partial<InsertPatientNote>): Promise<PatientNote | undefined> {
    const [note] = await db.update(patientNotes)
      .set({ ...updateNote, updatedAt: sql`now()` })
      .where(eq(patientNotes.id, id))
      .returning();
    return note || undefined;
  }

  async deletePatientNote(id: string): Promise<boolean> {
    const result = await db.delete(patientNotes)
      .where(eq(patientNotes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Consultation Notes & Recordings Implementation
  async getConsultationNotes(consultationId: string): Promise<ConsultationNote[]> {
    return await db.select().from(consultationNotes)
      .where(eq(consultationNotes.consultationId, consultationId))
      .orderBy(consultationNotes.timestamp);
  }

  async createConsultationNote(insertNote: InsertConsultationNote): Promise<ConsultationNote> {
    const [note] = await db.insert(consultationNotes).values(insertNote).returning();
    return note;
  }

  async getConsultationRecordings(consultationId: string): Promise<ConsultationRecording[]> {
    return await db.select().from(consultationRecordings)
      .where(eq(consultationRecordings.consultationId, consultationId))
      .orderBy(consultationRecordings.startTime);
  }

  async createConsultationRecording(insertRecording: InsertConsultationRecording): Promise<ConsultationRecording> {
    const [recording] = await db.insert(consultationRecordings).values(insertRecording).returning();
    return recording;
  }
  
  // Error Logs Implementation
  async getErrorLogs(filters?: {
    errorType?: string;
    userId?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ErrorLog[]> {
    const conditions = [];
    
    if (filters?.errorType) {
      conditions.push(eq(errorLogs.errorType, filters.errorType));
    }
    if (filters?.userId) {
      conditions.push(eq(errorLogs.userId, filters.userId));
    }
    if (filters?.resolved !== undefined) {
      conditions.push(eq(errorLogs.resolved, filters.resolved));
    }
    if (filters?.startDate) {
      conditions.push(gte(errorLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(errorLogs.createdAt, filters.endDate));
    }
    
    const query = db.select().from(errorLogs)
      .orderBy(desc(errorLogs.createdAt));
    
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    
    if (filters?.limit) {
      query.limit(filters.limit);
    }
    
    return await query;
  }
  
  async getErrorLog(id: string): Promise<ErrorLog | undefined> {
    const [errorLog] = await db.select().from(errorLogs)
      .where(eq(errorLogs.id, id))
      .limit(1);
    return errorLog || undefined;
  }
  
  async markErrorAsResolved(id: string, resolvedById: string, adminNotes?: string): Promise<ErrorLog | undefined> {
    const [errorLog] = await db.update(errorLogs)
      .set({
        resolved: true,
        resolvedBy: resolvedById,
        resolvedAt: sql`now()`,
        adminNotes: adminNotes || null
      })
      .where(eq(errorLogs.id, id))
      .returning();
    return errorLog || undefined;
  }

  // Layout Settings methods
  async getLayoutSettings(): Promise<LayoutSetting[]> {
    return await db.select().from(layoutSettings).orderBy(layoutSettings.category, layoutSettings.settingKey);
  }

  async getLayoutSettingByKey(key: string): Promise<LayoutSetting | undefined> {
    const [setting] = await db.select().from(layoutSettings)
      .where(eq(layoutSettings.settingKey, key))
      .limit(1);
    return setting || undefined;
  }

  async createOrUpdateLayoutSetting(data: InsertLayoutSetting): Promise<LayoutSetting> {
    const existing = await this.getLayoutSettingByKey(data.settingKey);
    
    if (existing) {
      const [updated] = await db.update(layoutSettings)
        .set({
          ...data,
          updatedAt: sql`now()`
        })
        .where(eq(layoutSettings.settingKey, data.settingKey))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(layoutSettings)
        .values(data)
        .returning();
      return created;
    }
  }

  async deleteLayoutSetting(key: string): Promise<boolean> {
    const result = await db.delete(layoutSettings)
      .where(eq(layoutSettings.settingKey, key))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
