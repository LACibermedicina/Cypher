import { 
  users, patients, appointments, medicalRecords, whatsappMessages, 
  examResults, collaborators, doctorSchedule, digitalSignatures, videoConsultations,
  prescriptionShares, labOrders, hospitalReferrals, collaboratorIntegrations, collaboratorApiKeys,
  type User, type InsertUser, type Patient, type InsertPatient,
  type Appointment, type InsertAppointment, type MedicalRecord, type InsertMedicalRecord,
  type WhatsappMessage, type InsertWhatsappMessage, type ExamResult, type InsertExamResult,
  type Collaborator, type InsertCollaborator, type DoctorSchedule, type InsertDoctorSchedule,
  type DigitalSignature, type InsertDigitalSignature, type VideoConsultation, type InsertVideoConsultation,
  type PrescriptionShare, type InsertPrescriptionShare, type LabOrder, type InsertLabOrder,
  type HospitalReferral, type InsertHospitalReferral, type CollaboratorIntegration, type InsertCollaboratorIntegration,
  type CollaboratorApiKey, type InsertCollaboratorApiKey
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Patients
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByPhone(phone: string): Promise<Patient | undefined>;
  getPatientByWhatsapp(whatsappNumber: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
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

  // Video Consultations
  getVideoConsultation(id: string): Promise<VideoConsultation | undefined>;
  getVideoConsultationBySessionId(sessionId: string): Promise<VideoConsultation | undefined>;
  getVideoConsultationsByAppointment(appointmentId: string): Promise<VideoConsultation[]>;
  getActiveVideoConsultations(doctorId: string): Promise<VideoConsultation[]>;
  createVideoConsultation(consultation: InsertVideoConsultation): Promise<VideoConsultation>;
  updateVideoConsultation(id: string, consultation: Partial<InsertVideoConsultation>): Promise<VideoConsultation | undefined>;
  createDigitalSignature(signature: InsertDigitalSignature): Promise<DigitalSignature>;
  updateDigitalSignature(id: string, signature: Partial<InsertDigitalSignature>): Promise<DigitalSignature | undefined>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
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
}

export const storage = new DatabaseStorage();
