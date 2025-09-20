import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Default doctor ID for development environment (proper UUID format)
export const DEFAULT_DOCTOR_ID = '550e8400-e29b-41d4-a716-446655440000';

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("doctor"), // doctor, admin, patient
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  digitalCertificate: text("digital_certificate"), // For FIPS compliance
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"),
  bloodType: text("blood_type"),
  allergies: text("allergies"),
  medicalHistory: jsonb("medical_history"),
  whatsappNumber: text("whatsapp_number"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  type: text("type").notNull(), // consultation, followup, emergency
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  notes: text("notes"),
  aiScheduled: boolean("ai_scheduled").default(false),
  videoCallUrl: text("video_call_url"),
  audioTranscript: text("audio_transcript"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const medicalRecords = pgTable("medical_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  diagnosis: text("diagnosis"),
  symptoms: text("symptoms"),
  treatment: text("treatment"),
  prescription: text("prescription"),
  observations: text("observations"), // Clinical observations from doctor
  diagnosticHypotheses: jsonb("diagnostic_hypotheses"), // AI generated hypotheses with probabilities
  audioTranscript: text("audio_transcript"),
  isEncrypted: boolean("is_encrypted").default(true),
  digitalSignature: text("digital_signature"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").references(() => patients.id),
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  message: text("message").notNull(),
  messageType: text("message_type").notNull().default("text"), // text, image, audio
  isFromAI: boolean("is_from_ai").default(false),
  appointmentScheduled: boolean("appointment_scheduled").default(false),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const examResults = pgTable("exam_results", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  examType: text("exam_type").notNull(),
  results: jsonb("results").notNull(), // Structured data extracted by AI
  rawData: text("raw_data"), // Original file content
  fileUrl: text("file_url"),
  analyzedByAI: boolean("analyzed_by_ai").default(true),
  abnormalValues: jsonb("abnormal_values"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const collaborators = pgTable("collaborators", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // pharmacy, laboratory, hospital, clinic
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  isOnline: boolean("is_online").default(false),
  apiEndpoint: text("api_endpoint"),
  credentials: text("credentials"), // Encrypted
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const doctorSchedule = pgTable("doctor_schedule", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6, Sunday to Saturday
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  consultationDuration: integer("consultation_duration").default(30), // minutes
  isActive: boolean("is_active").default(true),
});

export const digitalSignatures = pgTable("digital_signatures", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  documentType: text("document_type").notNull(), // prescription, exam_request, medical_certificate
  documentId: uuid("document_id").notNull(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  signature: text("signature").notNull(),
  certificateInfo: jsonb("certificate_info"),
  status: text("status").notNull().default("pending"), // pending, signed, rejected
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoConsultations = pgTable("video_consultations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: uuid("appointment_id").references(() => appointments.id), // nullable for direct patient calls
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  sessionId: text("session_id").notNull().unique().default(sql`gen_random_uuid()`), // Auto-generated WebRTC session identifier
  status: text("status").notNull().default("waiting"), // waiting, active, ended, cancelled
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  recordingUrl: text("recording_url"),
  audioRecordingUrl: text("audio_recording_url"),
  transcriptionStatus: text("transcription_status").default("pending"), // pending, processing, completed, failed
  fullTranscript: text("full_transcript"),
  meetingNotes: text("meeting_notes"),
  duration: integer("duration"), // in seconds
  participants: jsonb("participants"), // WebRTC participant data
  connectionLogs: jsonb("connection_logs"), // Connection quality and issues
  isRecorded: boolean("is_recorded").default(false),
  encryptionEnabled: boolean("encryption_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  doctorSchedule: many(doctorSchedule),
  digitalSignatures: many(digitalSignatures),
  videoConsultations: many(videoConsultations),
}));

export const patientsRelations = relations(patients, ({ many }) => ({
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  whatsappMessages: many(whatsappMessages),
  examResults: many(examResults),
  digitalSignatures: many(digitalSignatures),
  videoConsultations: many(videoConsultations),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [appointments.doctorId],
    references: [users.id],
  }),
  medicalRecords: many(medicalRecords),
  whatsappMessages: many(whatsappMessages),
  videoConsultations: many(videoConsultations),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  patient: one(patients, {
    fields: [medicalRecords.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [medicalRecords.doctorId],
    references: [users.id],
  }),
  appointment: one(appointments, {
    fields: [medicalRecords.appointmentId],
    references: [appointments.id],
  }),
}));

export const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  patient: one(patients, {
    fields: [whatsappMessages.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [whatsappMessages.appointmentId],
    references: [appointments.id],
  }),
}));

export const examResultsRelations = relations(examResults, ({ one }) => ({
  patient: one(patients, {
    fields: [examResults.patientId],
    references: [patients.id],
  }),
}));

export const digitalSignaturesRelations = relations(digitalSignatures, ({ one }) => ({
  patient: one(patients, {
    fields: [digitalSignatures.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [digitalSignatures.doctorId],
    references: [users.id],
  }),
}));

export const videoConsultationsRelations = relations(videoConsultations, ({ one }) => ({
  appointment: one(appointments, {
    fields: [videoConsultations.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [videoConsultations.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [videoConsultations.doctorId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({
  id: true,
  createdAt: true,
});

export const insertExamResultSchema = createInsertSchema(examResults).omit({
  id: true,
  createdAt: true,
});

export const insertCollaboratorSchema = createInsertSchema(collaborators).omit({
  id: true,
  createdAt: true,
});

export const insertDoctorScheduleSchema = createInsertSchema(doctorSchedule).omit({
  id: true,
});

export const insertDigitalSignatureSchema = createInsertSchema(digitalSignatures).omit({
  id: true,
  createdAt: true,
});

export const insertVideoConsultationSchema = createInsertSchema(videoConsultations).omit({
  id: true,
  sessionId: true, // Auto-generated by server
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;

export type ExamResult = typeof examResults.$inferSelect;
export type InsertExamResult = z.infer<typeof insertExamResultSchema>;

export type Collaborator = typeof collaborators.$inferSelect;
export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;

export type DoctorSchedule = typeof doctorSchedule.$inferSelect;
export type InsertDoctorSchedule = z.infer<typeof insertDoctorScheduleSchema>;

export type DigitalSignature = typeof digitalSignatures.$inferSelect;
export type InsertDigitalSignature = z.infer<typeof insertDigitalSignatureSchema>;

export type VideoConsultation = typeof videoConsultations.$inferSelect;
export type InsertVideoConsultation = z.infer<typeof insertVideoConsultationSchema>;

// Dashboard stats type
export interface DashboardStats {
  todayConsultations: number;
  whatsappMessages: number;
  aiScheduling: number;
  secureRecords: number;
}
