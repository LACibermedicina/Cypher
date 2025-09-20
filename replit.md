# MedIA Pro - Intelligent Medical System

## Overview

MedIA Pro is an AI-powered medical management system designed for healthcare professionals. The application combines traditional medical practice management with modern AI capabilities, including WhatsApp integration for patient communication, automated scheduling, clinical decision support, and FIPS-compliant digital signatures. Built as a full-stack web application, it provides real-time communication through WebSockets and comprehensive patient data management.

## User Preferences

Preferred communication style: Simple, everyday language.

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

## External Dependencies

### Third-party Services
- **Neon Database**: Serverless PostgreSQL hosting for production deployment
- **OpenAI API**: GPT-5 model integration for clinical decision support and natural language processing
- **WhatsApp Business API**: Official Meta WhatsApp integration for patient messaging
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