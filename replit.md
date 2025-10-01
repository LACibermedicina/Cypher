# Telemed - Sistema de Telemedicina

## Overview

Telemed is an AI-powered telemedicine platform designed for modern healthcare delivery. The application combines traditional medical practice management with cutting-edge telemedicine capabilities, including multilingual support, video consultations, WhatsApp integration for patient communication, automated scheduling, clinical decision support, and FIPS-compliant digital signatures. Built as a responsive full-stack web application, it provides real-time communication through WebSockets, comprehensive patient data management, and optimized mobile experience for both patients and doctors.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 2025)

### Authorization Foundation (October 1, 2025)
- **Schema updates**: Added `userId` (unique, FK to users) and `primaryDoctorId` (FK to users) to patients table
- **User-Patient linking**: `/api/patients/me` endpoint now uses userId for direct lookup with email/phone fallback for legacy data
- **Auto-linking**: When fallback match is found, automatically updates patient record with userId
- **Frontend updates**: Patient dashboard now references `primaryDoctorId` instead of deprecated `assignedDoctorId`
- **Next steps**: Implement centralized `authorizePatientAccess` helper for RBAC across all patient data endpoints

### Patient Agenda Feature
- **New table**: `patient_notes` with fields: id, patientId, userId, date, title, content, isPrivate, createdAt, updatedAt
- **RBAC**: Only patients and admins can create/view/edit notes; doctors explicitly denied
- **Security**: Field whitelisting on POST/PATCH, server-side ID enforcement, ownership verification
- **Frontend**: Calendar-based interface at `/patient-agenda` for patients to create/view/edit personal health notes
- **Known limitation**: Admin UI lacks patient selector - functional for patients only

### Enhanced Patient Dashboard
- Added quick navigation buttons: "Agendar Consulta" (scheduling), "Minha Agenda" (personal notes), "Minhas Prescrições" (prescriptions), "Chat Médico" (WhatsApp redirect)
- Health status now displayed dynamically based on physician assessment
- Dashboard now displays actual logged-in patient name and data (fixed hardcoded "Olá, Maria!" greeting)

### Prescriptions Page Access
- Route now allows patient access at `/prescriptions`
- UI adapts by role: patients see view-only interface, doctors/admins can create prescriptions
- "Nova Prescrição" button hidden for patients via conditional rendering

### Video Consultation Feature (October 1, 2025)
- **Agora.io Integration**: Real-time video/audio using Agora RTC SDK with server-side token generation
- **Fullscreen Interface**: 70% minimum video display, picture-in-picture for local video, floating control bar
- **Multi-tab Panel**: Chat messages, AI Diagnostic queries, and Doctor notes with real-time synchronization
- **Interactive Controls**: Camera toggle, microphone toggle, recording start/stop, fullscreen mode, end call
- **Data Persistence**: All chat messages, AI queries, and notes saved to `consultation_notes` table
- **Recording Segments**: Support for video segment URLs stored in `consultation_recordings` table
- **API Endpoints**: Token generation (`POST /api/video-consultations/agora-token`), consultation creation/retrieval (`POST /api/video-consultations/start-with-patient/:patientId`), notes management, recordings
- **Route**: `/consultation/video/:patientId` - Accessible to authenticated doctors only
- **Security**: Endpoint requires authentication and doctor/admin role; idempotent (returns existing active/waiting consultation for patient-doctor pair)
- **Database Schema**: Added `agora_channel_name` and `agora_app_id` columns to `video_consultations` table
- **Known Limitation**: AI response pipeline not yet implemented (queries saved but no automated response generation)

## System Architecture

### Frontend Architecture
The client-side is built using React with TypeScript, featuring a modern component-based architecture:
- **UI Framework**: React 18 with TypeScript, utilizing Wouter for routing
- **Component Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom medical-themed color variables and responsive design
- **State Management**: TanStack React Query for server state management and caching
- **Form Handling**: React Hook Form with Zod validation schemas
- **Real-time Updates**: Custom WebSocket hook for live data synchronization

### Backend Architecture
The server follows a RESTful API design with Express.js:
- **Runtime**: Node.js with TypeScript in ESModule format
- **Web Framework**: Express.js with middleware for JSON parsing, CORS, and request logging
- **Real-time Communication**: WebSocket server integrated with HTTP server for live updates
- **API Design**: RESTful endpoints organized by domain (patients, appointments, WhatsApp, etc.)
- **Error Handling**: Centralized error middleware with structured error responses

### Data Storage Solutions
The application uses a PostgreSQL database with Drizzle ORM:
- **Database**: PostgreSQL with Neon serverless driver for cloud deployment
- **ORM**: Drizzle ORM with type-safe schema definitions and migrations
- **Schema Design**: Comprehensive medical entities including users, patients, appointments, medical records, WhatsApp messages, exam results, and digital signatures
- **Data Validation**: Drizzle-Zod integration for runtime type checking and API validation

### Authentication and Authorization
Security implementation focuses on healthcare compliance:
- **Authentication**: User-based authentication with role-based access control (doctor, admin, patient)
- **Compliance**: FIPS 140-2 Level 3 compliance indicators throughout the UI
- **Digital Signatures**: Integrated digital certificate management for medical document signing
- **Session Management**: PostgreSQL-based session storage with connect-pg-simple

### Key Features and Integrations
- **AI Clinical Assistant**: OpenAI integration for diagnostic hypothesis generation and symptom analysis
- **WhatsApp Integration**: Automated patient communication with webhook support for message processing
- **Real-time Dashboard**: Live updates for appointments, messages, and system status
- **Medical Records Management**: Comprehensive patient data handling with exam result analysis
- **Appointment Scheduling**: AI-powered scheduling with support for different appointment types
- **Digital Document Signing**: FIPS-compliant digital signature workflow for prescriptions and medical documents
- **Patient Health Status**: Physicians can determine patient health status after consultations (excellent/good/regular/critical/to_be_determined)
- **Patient Personal Agenda**: Private note-taking system for patients to track health information by date
- **Enhanced Patient Dashboard**: Quick navigation buttons to scheduling, agenda, prescriptions, and WhatsApp team chat
- **Prescription Management**: Role-based access - patients view/download, doctors create/manage

## External Dependencies

### Third-party Services
- **Neon Database**: Serverless PostgreSQL hosting for production deployment
- **OpenAI API**: GPT-5 model integration for clinical decision support and natural language processing
- **WhatsApp Business API**: Official Meta WhatsApp integration for patient messaging
- **Agora.io**: Real-time video/audio communication SDK for telemedicine consultations
- **Font Awesome**: Icon library for medical and UI icons throughout the application

### Development and Build Tools
- **Vite**: Frontend build tool with React plugin and development server
- **ESBuild**: Backend bundling for production deployment
- **Drizzle Kit**: Database migration and schema management tool
- **PostCSS**: CSS processing with Tailwind CSS and Autoprefixer

### UI and Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled React components
- **Tailwind CSS**: Utility-first CSS framework with custom medical theme
- **Lucide React**: Icon library for modern UI elements
- **React Hook Form**: Form state management with validation
- **TanStack React Query**: Server state management and caching solution

### Security and Compliance
- **WebSocket (ws)**: Real-time communication protocol implementation
- **Zod**: TypeScript-first schema declaration and validation library
- **Class Variance Authority**: Type-safe variant API for component styling
- **Date-fns**: Date manipulation library with internationalization support