# Telemed - Sistema de Telemedicina

## Overview
Telemed is an AI-powered telemedicine platform designed for modern healthcare delivery. It integrates traditional medical practice management with advanced telemedicine features, including multilingual support, video consultations, WhatsApp integration, automated scheduling, clinical decision support, and FIPS-compliant digital signatures. This responsive full-stack web application provides real-time communication, comprehensive patient data management, and an optimized mobile experience for both patients and doctors. The platform aims to modernize healthcare delivery and improve patient-doctor interactions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built using React with TypeScript, utilizing Wouter for routing. It features Shadcn/ui components based on Radix UI, styled with Tailwind CSS for a responsive, medical-themed design. State management is handled by TanStack React Query, form handling by React Hook Form with Zod validation, and real-time updates via a custom WebSocket hook.

### Backend Architecture
The server is a RESTful API built with Node.js and Express.js, using TypeScript in ESModule format. It includes middleware for JSON parsing, CORS, and request logging. A WebSocket server is integrated for live updates. API endpoints are organized by domain, and centralized error handling provides structured error responses.

### Data Storage Solutions
The application uses PostgreSQL with Drizzle ORM and Neon serverless driver for cloud deployment. The schema includes comprehensive medical entities such as users, patients, appointments, medical records, WhatsApp messages, exam results, and digital signatures. Drizzle-Zod integration ensures runtime type checking and API validation.

### Authentication and Authorization
Security is implemented with user-based authentication and role-based access control (doctor, admin, patient), aiming for healthcare compliance. It includes FIPS 140-2 Level 3 compliance indicators, integrated digital certificate management for document signing, and PostgreSQL-based session management.

### Key Features
- **AI Clinical Assistant**: Gemini API integration (migrated from OpenAI) for diagnostic support, medication interaction analysis, and clinical Q&A.
- **WhatsApp Integration**: Automated patient communication.
- **Real-time Dashboard**: Simplified dashboards showing only production-backed statistics via /api/dashboard/stats endpoint.
- **Medical Records Management**: Strict role-based access control - patients denied access, doctors see only assigned patients, admins see all records.
- **Appointment Scheduling**: AI-powered scheduling with different appointment types.
- **Digital Document Signing**: FIPS-compliant workflow for medical documents.
- **Patient Health Status**: Physician-determined health status after consultations.
- **Patient Personal Agenda**: Private note-taking for patients.
- **Enhanced Patient Dashboard**: Quick navigation to key functionalities.
- **Prescription Management**: Role-based access for viewing, creating, and managing prescriptions.
- **Video Consultation Feature**: Real-time video/audio using Agora.io with multi-tab panels for chat, AI diagnostics, and doctor notes. Fullscreen mode, consultation notes persistence, and recording infrastructure (requires Agora Cloud Recording for complete capture).
- **Post-Consultation Rating System**: Patients can rate completed appointments with feedback, and doctors receive real-time updates and average rating statistics.
- **Appointment Rescheduling System**: Allows doctors, admins, or patients to reschedule appointments with validation and real-time notifications.
- **Profile Picture Upload System**: Secure profile picture management with server-side validation and storage.
- **TMC Credits System**: Promotional credits for new users, automatic charging for video consultations and AI queries, doctor commissions, and PayPal integration for secure credit purchases.
- **Enhanced Registration System**: Role-based registration (Patient, Doctor, Admin) with mandatory fields and transactional database writes. Registration links available on login page.
- **AI Reference Management**: Admin-only PDF upload system for AI knowledge base with secure file validation and role-based access control.
- **Friendly Error Handling System**: User-friendly error messages with practical suggestions for common HTTP errors (400, 401, 403, 404, 409, 422, 429, 500+), implemented across all forms using formatErrorForToast helper.

## Error Handling

### User-Friendly Error Messages
The platform implements a comprehensive error handling system that provides clear, actionable feedback to users:
- **Helper Location**: `client/src/lib/error-handler.ts`
- **Coverage**: All forms including registration, login, patient management, appointments, prescriptions, and admin functions
- **Error Types Handled**:
  - 409 Conflict: Specific suggestions for duplicate username, email, phone, or CRM
  - 400 Bad Request: Validation error details with formatting guidance
  - 401 Unauthorized: Credential verification suggestions
  - 403 Forbidden: Permission requirement explanations
  - 404 Not Found: Resource location guidance
  - 422 Unprocessable: Data completeness suggestions
  - 429 Too Many Requests: Rate limit advice
  - 500+ Server Errors: Server issue acknowledgment with retry suggestions
- **Implementation Pattern**: All form error handlers use `formatErrorForToast(error)` to parse HTTP errors and return structured, user-friendly messages with practical suggestions

## External Dependencies

### Third-party Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Google Gemini API**: Gemini 1.5 Flash model for AI features (WhatsApp triage, scheduling, diagnostics, clinical Q&A, exam analysis, drug interactions).
- **WhatsApp Business API**: Meta's official integration for messaging.
- **Agora.io**: Real-time video/audio communication SDK.
- **PayPal**: Payment gateway for credit purchases.
- **Font Awesome**: Icon library.

### Development and Build Tools
- **Vite**: Frontend build tool.
- **ESBuild**: Backend bundling.
- **Drizzle Kit**: Database migration and schema management.
- **PostCSS**: CSS processing.

### UI and Component Libraries
- **Radix UI**: Accessible React components.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **React Hook Form**: Form state management.
- **TanStack React Query**: Server state management.

### Security and Compliance
- **WebSocket (ws)**: Real-time communication.
- **Zod**: TypeScript-first schema validation.
- **Class Variance Authority**: Type-safe component styling.
- **Date-fns**: Date manipulation library.