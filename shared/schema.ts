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
  role: text("role").notNull().default("visitor"), // admin, patient, doctor, visitor, researcher
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  tmcCredits: integer("tmc_credits").default(0), // Digital credits balance
  digitalCertificate: text("digital_certificate"), // For FIPS compliance
  profilePicture: text("profile_picture"),
  isBlocked: boolean("is_blocked").default(false),
  blockedBy: uuid("blocked_by"),
  superiorDoctorId: uuid("superior_doctor_id"),
  hierarchyLevel: integer("hierarchy_level").default(0),
  inviteQrCode: text("invite_qr_code"),
  percentageFromInferiors: integer("percentage_from_inferiors").default(10), // Percentage received from hierarchical inferiors
  medicalLicense: text("medical_license"), // CRM number for doctors
  specialization: text("specialization"),
  lastLogin: timestamp("last_login"),
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
  cnpj: text("cnpj"), // Brazilian tax ID for healthcare institutions
  cnes: text("cnes"), // Brazilian National Registry of Healthcare Establishments
  licenseNumber: text("license_number"), // Professional/institutional license
  specialization: text("specialization"), // e.g., cardiology, orthopedics for hospitals
  isOnline: boolean("is_online").default(false),
  isActive: boolean("is_active").default(true),
  apiEndpoint: text("api_endpoint"),
  credentials: text("credentials"), // Encrypted API credentials
  integrationConfig: jsonb("integration_config"), // Configuration for specific integration type
  complianceStatus: text("compliance_status").default("pending"), // pending, approved, suspended
  lastHealthCheck: timestamp("last_health_check"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Prescription sharing with pharmacies
export const prescriptionShares = pgTable("prescription_shares", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  medicalRecordId: uuid("medical_record_id").references(() => medicalRecords.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  pharmacyId: uuid("pharmacy_id").references(() => collaborators.id).notNull(),
  prescriptionText: text("prescription_text").notNull(),
  digitalSignatureId: uuid("digital_signature_id").references(() => digitalSignatures.id),
  status: text("status").notNull().default("shared"), // shared, dispensed, partially_dispensed, cancelled
  shareMethod: text("share_method").notNull().default("api"), // api, manual, qr_code
  accessCode: text("access_code"), // Secure code for patient verification
  expiresAt: timestamp("expires_at"), // Prescription expiry
  dispensedAt: timestamp("dispensed_at"),
  dispensingNotes: text("dispensing_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Laboratory orders and results
export const labOrders = pgTable("lab_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  laboratoryId: uuid("laboratory_id").references(() => collaborators.id).notNull(),
  orderDetails: text("order_details").notNull(), // Tests requested
  urgency: text("urgency").default("routine"), // routine, urgent, stat
  status: text("status").notNull().default("ordered"), // ordered, collected, processing, completed, cancelled
  externalOrderId: text("external_order_id"), // ID from laboratory system
  collectionDate: timestamp("collection_date"),
  expectedResultDate: timestamp("expected_result_date"),
  completedAt: timestamp("completed_at"),
  results: jsonb("results"), // Structured test results
  resultsFileUrl: text("results_file_url"), // PDF or file link
  criticalValues: boolean("critical_values").default(false),
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Hospital referrals and transfers
export const hospitalReferrals = pgTable("hospital_referrals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  referringDoctorId: uuid("referring_doctor_id").references(() => users.id).notNull(),
  hospitalId: uuid("hospital_id").references(() => collaborators.id).notNull(),
  specialty: text("specialty").notNull(), // Target specialty/department
  urgency: text("urgency").notNull().default("routine"), // routine, urgent, emergency
  reason: text("reason").notNull(), // Reason for referral
  clinicalSummary: text("clinical_summary"), // Patient condition summary
  requestedServices: text("requested_services"), // Specific services needed
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, completed
  externalReferralId: text("external_referral_id"), // ID from hospital system
  scheduledDate: timestamp("scheduled_date"),
  completedAt: timestamp("completed_date"),
  dischargeNotes: text("discharge_notes"), // Summary after treatment
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Integration monitoring and audit trail
export const collaboratorIntegrations = pgTable("collaborator_integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  collaboratorId: uuid("collaborator_id").references(() => collaborators.id).notNull(),
  integrationType: text("integration_type").notNull(), // prescription_share, lab_order, hospital_referral
  entityId: uuid("entity_id").notNull(), // ID of the related prescription/order/referral
  action: text("action").notNull(), // create, update, query, cancel
  status: text("status").notNull(), // success, failed, pending, timeout
  requestData: jsonb("request_data"), // Data sent to external system
  responseData: jsonb("response_data"), // Response from external system
  errorMessage: text("error_message"),
  responseTime: integer("response_time"), // milliseconds
  retryCount: integer("retry_count").default(0),
  processedBy: text("processed_by"), // system, user_id
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// API authentication for external collaborators
export const collaboratorApiKeys = pgTable("collaborator_api_keys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  collaboratorId: uuid("collaborator_id").references(() => collaborators.id).notNull(),
  keyName: text("key_name").notNull(), // Friendly name for the key
  hashedKey: text("hashed_key").notNull(), // Hashed version of the API key
  permissions: jsonb("permissions").notNull(), // Array of allowed actions/endpoints
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  expiresAt: timestamp("expires_at"),
  ipWhitelist: text("ip_whitelist").array(), // Allowed IP addresses
  rateLimit: integer("rate_limit").default(1000), // Requests per hour
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// TMC Credit System
export const tmcTransactions = pgTable("tmc_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // debit, credit, recharge, transfer, commission
  amount: integer("amount").notNull(), // Can be negative for debits
  reason: text("reason").notNull(), // consultation, prescription, data_access, etc.
  relatedUserId: uuid("related_user_id").references(() => users.id), // For commissions and transfers
  functionUsed: text("function_used"), // Which feature was used
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  medicalRecordId: uuid("medical_record_id").references(() => medicalRecords.id),
  metadata: jsonb("metadata"), // Additional transaction details
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// TMC System Configuration
export const tmcConfig = pgTable("tmc_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  functionName: text("function_name").notNull().unique(),
  costInCredits: integer("cost_in_credits").notNull(),
  description: text("description"),
  category: text("category").notNull(), // consultation, prescription, data_access, admin
  isActive: boolean("is_active").default(true),
  minimumRole: text("minimum_role").default("visitor"), // Minimum role required
  bonusForPatient: integer("bonus_for_patient").default(0), // Credits patient receives when their data is accessed
  commissionPercentage: integer("commission_percentage").default(10), // For hierarchical doctors
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chatbot Configuration and References
export const chatbotReferences = pgTable("chatbot_references", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // medical, procedural, emergency, general
  keywords: text("keywords").array(), // Keywords for AI matching
  priority: integer("priority").default(1), // Higher priority = used first
  source: text("source"), // Reference source (medical guidelines, etc.)
  isActive: boolean("is_active").default(true),
  language: text("language").default("pt"), // Language of content
  lastUsed: timestamp("last_used"),
  usageCount: integer("usage_count").default(0),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Laboratory Templates for PDF Processing
export const labTemplates = pgTable("lab_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  laboratoryName: text("laboratory_name").notNull(),
  templateName: text("template_name").notNull(),
  fieldMappings: jsonb("field_mappings").notNull(), // JSON mapping of PDF fields to database
  extractionRules: jsonb("extraction_rules").notNull(), // Rules for text extraction
  validationRules: jsonb("validation_rules"), // Data validation rules
  samplePdfUrl: text("sample_pdf_url"), // Example PDF for testing
  isActive: boolean("is_active").default(true),
  successRate: integer("success_rate").default(0), // Percentage of successful extractions
  lastTested: timestamp("last_tested"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Clinical Interview Templates
export const clinicalInterviews = pgTable("clinical_interviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").references(() => patients.id),
  userId: uuid("user_id").references(() => users.id), // Who initiated (can be visitor)
  currentStage: integer("current_stage").default(1),
  totalStages: integer("total_stages").default(7),
  responses: jsonb("responses").notNull(), // Array of user responses
  symptoms: jsonb("symptoms"), // Extracted symptoms data
  urgencyLevel: text("urgency_level").default("low"), // low, medium, high, emergency
  aiAnalysis: jsonb("ai_analysis"), // AI diagnostic hypotheses
  isCompleted: boolean("is_completed").default(false),
  requiresEmergency: boolean("requires_emergency").default(false),
  sessionToken: text("session_token").unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  doctorSchedule: many(doctorSchedule),
  digitalSignatures: many(digitalSignatures),
  videoConsultations: many(videoConsultations),
  tmcTransactions: many(tmcTransactions),
  chatbotReferencesCreated: many(chatbotReferences, { relationName: "chatbotCreator" }),
  chatbotReferencesUpdated: many(chatbotReferences, { relationName: "chatbotUpdater" }),
  labTemplatesCreated: many(labTemplates),
  clinicalInterviews: many(clinicalInterviews),
  superiorDoctor: one(users, { fields: [users.superiorDoctorId], references: [users.id], relationName: "hierarchy" }),
  subordinateDoctors: many(users, { relationName: "hierarchy" }),
  blockedByUser: one(users, { fields: [users.blockedBy], references: [users.id], relationName: "blocking" }),
  blockedUsers: many(users, { relationName: "blocking" }),
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

export const collaboratorsRelations = relations(collaborators, ({ many }) => ({
  prescriptionShares: many(prescriptionShares),
  labOrders: many(labOrders),
  hospitalReferrals: many(hospitalReferrals),
  integrations: many(collaboratorIntegrations),
  apiKeys: many(collaboratorApiKeys),
}));

export const prescriptionSharesRelations = relations(prescriptionShares, ({ one }) => ({
  medicalRecord: one(medicalRecords, {
    fields: [prescriptionShares.medicalRecordId],
    references: [medicalRecords.id],
  }),
  patient: one(patients, {
    fields: [prescriptionShares.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [prescriptionShares.doctorId],
    references: [users.id],
  }),
  pharmacy: one(collaborators, {
    fields: [prescriptionShares.pharmacyId],
    references: [collaborators.id],
  }),
  digitalSignature: one(digitalSignatures, {
    fields: [prescriptionShares.digitalSignatureId],
    references: [digitalSignatures.id],
  }),
}));

export const labOrdersRelations = relations(labOrders, ({ one }) => ({
  patient: one(patients, {
    fields: [labOrders.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [labOrders.doctorId],
    references: [users.id],
  }),
  laboratory: one(collaborators, {
    fields: [labOrders.laboratoryId],
    references: [collaborators.id],
  }),
}));

export const hospitalReferralsRelations = relations(hospitalReferrals, ({ one }) => ({
  patient: one(patients, {
    fields: [hospitalReferrals.patientId],
    references: [patients.id],
  }),
  referringDoctor: one(users, {
    fields: [hospitalReferrals.referringDoctorId],
    references: [users.id],
  }),
  hospital: one(collaborators, {
    fields: [hospitalReferrals.hospitalId],
    references: [collaborators.id],
  }),
}));

export const collaboratorIntegrationsRelations = relations(collaboratorIntegrations, ({ one }) => ({
  collaborator: one(collaborators, {
    fields: [collaboratorIntegrations.collaboratorId],
    references: [collaborators.id],
  }),
}));

export const collaboratorApiKeysRelations = relations(collaboratorApiKeys, ({ one }) => ({
  collaborator: one(collaborators, {
    fields: [collaboratorApiKeys.collaboratorId],
    references: [collaborators.id],
  }),
}));

// New relations for TMC and extended functionality
export const tmcTransactionsRelations = relations(tmcTransactions, ({ one }) => ({
  user: one(users, {
    fields: [tmcTransactions.userId],
    references: [users.id],
  }),
  relatedUser: one(users, {
    fields: [tmcTransactions.relatedUserId],
    references: [users.id],
  }),
  appointment: one(appointments, {
    fields: [tmcTransactions.appointmentId],
    references: [appointments.id],
  }),
  medicalRecord: one(medicalRecords, {
    fields: [tmcTransactions.medicalRecordId],
    references: [medicalRecords.id],
  }),
}));

export const tmcConfigRelations = relations(tmcConfig, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [tmcConfig.updatedBy],
    references: [users.id],
  }),
}));

export const chatbotReferencesRelations = relations(chatbotReferences, ({ one }) => ({
  creator: one(users, {
    fields: [chatbotReferences.createdBy],
    references: [users.id],
    relationName: "chatbotCreator",
  }),
  updater: one(users, {
    fields: [chatbotReferences.updatedBy],
    references: [users.id],
    relationName: "chatbotUpdater",
  }),
}));

export const labTemplatesRelations = relations(labTemplates, ({ one }) => ({
  creator: one(users, {
    fields: [labTemplates.createdBy],
    references: [users.id],
  }),
}));

export const clinicalInterviewsRelations = relations(clinicalInterviews, ({ one }) => ({
  patient: one(patients, {
    fields: [clinicalInterviews.patientId],
    references: [patients.id],
  }),
  user: one(users, {
    fields: [clinicalInterviews.userId],
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
  updatedAt: true,
});

export const insertPrescriptionShareSchema = createInsertSchema(prescriptionShares).omit({
  id: true,
  createdAt: true,
});

export const insertLabOrderSchema = createInsertSchema(labOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHospitalReferralSchema = createInsertSchema(hospitalReferrals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCollaboratorIntegrationSchema = createInsertSchema(collaboratorIntegrations).omit({
  id: true,
  createdAt: true,
});

export const insertCollaboratorApiKeySchema = createInsertSchema(collaboratorApiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertTmcTransactionSchema = createInsertSchema(tmcTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertTmcConfigSchema = createInsertSchema(tmcConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatbotReferenceSchema = createInsertSchema(chatbotReferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLabTemplateSchema = createInsertSchema(labTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClinicalInterviewSchema = createInsertSchema(clinicalInterviews).omit({
  id: true,
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

export type PrescriptionShare = typeof prescriptionShares.$inferSelect;
export type InsertPrescriptionShare = z.infer<typeof insertPrescriptionShareSchema>;

export type LabOrder = typeof labOrders.$inferSelect;
export type InsertLabOrder = z.infer<typeof insertLabOrderSchema>;

export type HospitalReferral = typeof hospitalReferrals.$inferSelect;
export type InsertHospitalReferral = z.infer<typeof insertHospitalReferralSchema>;

export type CollaboratorIntegration = typeof collaboratorIntegrations.$inferSelect;
export type InsertCollaboratorIntegration = z.infer<typeof insertCollaboratorIntegrationSchema>;

export type CollaboratorApiKey = typeof collaboratorApiKeys.$inferSelect;
export type InsertCollaboratorApiKey = z.infer<typeof insertCollaboratorApiKeySchema>;

export type DoctorSchedule = typeof doctorSchedule.$inferSelect;
export type InsertDoctorSchedule = z.infer<typeof insertDoctorScheduleSchema>;

export type DigitalSignature = typeof digitalSignatures.$inferSelect;
export type InsertDigitalSignature = z.infer<typeof insertDigitalSignatureSchema>;

export type VideoConsultation = typeof videoConsultations.$inferSelect;
export type InsertVideoConsultation = z.infer<typeof insertVideoConsultationSchema>;

export type TmcTransaction = typeof tmcTransactions.$inferSelect;
export type InsertTmcTransaction = z.infer<typeof insertTmcTransactionSchema>;

export type TmcConfig = typeof tmcConfig.$inferSelect;
export type InsertTmcConfig = z.infer<typeof insertTmcConfigSchema>;

export type ChatbotReference = typeof chatbotReferences.$inferSelect;
export type InsertChatbotReference = z.infer<typeof insertChatbotReferenceSchema>;

export type LabTemplate = typeof labTemplates.$inferSelect;
export type InsertLabTemplate = z.infer<typeof insertLabTemplateSchema>;

export type ClinicalInterview = typeof clinicalInterviews.$inferSelect;
export type InsertClinicalInterview = z.infer<typeof insertClinicalInterviewSchema>;

// Dashboard stats type
export interface DashboardStats {
  todayConsultations: number;
  whatsappMessages: number;
  aiScheduling: number;
  secureRecords: number;
  tmcCredits: number;
  activeUsers: number;
}

// TMC system types
export interface TmcBalance {
  userId: string;
  balance: number;
  lastTransaction: string;
}

export interface SystemConfig {
  functionCosts: Record<string, number>;
  commissionRates: Record<string, number>;
  bonusRates: Record<string, number>;
}
