# Telemed - Sistema de Telemedicina

## Overview
Telemed is an AI-powered telemedicine platform designed to modernize healthcare delivery and improve patient-doctor interactions. It integrates traditional medical practice management with advanced telemedicine features such as multilingual support, video consultations, WhatsApp integration, automated scheduling, clinical decision support, and FIPS-compliant digital signatures. This responsive full-stack web application offers real-time communication, comprehensive patient data management, and an optimized mobile experience for both patients and doctors.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built with React and TypeScript, using Wouter for routing. It leverages Shadcn/ui components (based on Radix UI) styled with Tailwind CSS for a responsive, medical-themed design. State management is handled by TanStack React Query, form handling by React Hook Form with Zod validation, and real-time updates via a custom WebSocket hook. The UI features a warm autumn pastel color scheme.

### Backend Architecture
The server is a RESTful API built with Node.js and Express.js, using TypeScript in ESModule format. It includes middleware for JSON parsing, CORS, and request logging. A WebSocket server provides live updates. API endpoints are domain-organized, and centralized error handling ensures structured error responses.

### Data Storage Solutions
The application uses PostgreSQL with Drizzle ORM and Neon serverless driver. The schema includes entities for users, patients, appointments, medical records, WhatsApp messages, exam results, and digital signatures. Drizzle-Zod integration provides runtime type checking and API validation.

### Authentication and Authorization
Security is implemented with user-based authentication and role-based access control (doctor, admin, patient), aiming for healthcare compliance. It incorporates FIPS 140-2 Level 3 compliance indicators, integrated digital certificate management for document signing, and PostgreSQL-based session management.

### Key Features
- **AI Clinical Assistant**: Integration with the Gemini API for diagnostic support, medication interaction analysis, and clinical Q&A, prioritizing medical PDF references for responses.
- **WhatsApp Integration**: Automated patient communication.
- **Real-time Dashboards**: Simplified dashboards displaying production-backed statistics.
- **Medical Records Management**: Strict role-based access control.
- **Appointment Scheduling**: AI-powered scheduling with various appointment types.
- **Digital Document Signing**: A system for FIPS-compliant digital signatures for medical documents with QR code verification (note: current private key storage is not production-ready for FIPS compliance).
- **Video Consultation Feature**: Real-time video/audio using Agora.io with multi-tab panels for chat, AI diagnostics, and doctor notes.
- **TMC Credits System**: Manages credit purchases, debits, transfers, and commissions, with PayPal integration for secure purchases.
- **Enhanced Registration & Profile Management**: Role-based registration with mandatory fields and secure profile picture uploads.
- **AI Reference Management**: Admin-only PDF upload system for AI knowledge base with secure file validation and role-based access control.
- **Comprehensive Error Handling**: User-friendly error messages with practical suggestions for common HTTP errors, and an admin error logging system for detailed error tracking and resolution.
- **Database Cleanup Endpoint**: Admin-only endpoint for removing test data with strict confirmation.
- **Visitor Chatbot**: Publicly accessible AI chatbot with limited, safe functionality, referencing public medical PDFs.

## External Dependencies

### Third-party Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Google Gemini API**: Gemini 1.5 Flash model for AI features.
- **WhatsApp Business API**: Meta's official integration for messaging.
- **Agora.io**: Real-time video/audio communication SDK.
- **PayPal**: Payment gateway for credit purchases.

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
- **Zod**: TypeScript-first schema validation.
- **Date-fns**: Date manipulation library.