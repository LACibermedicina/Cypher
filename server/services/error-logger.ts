import type { Request } from 'express';
import { db } from '../db';
import { errorLogs, type InsertErrorLog } from '@shared/schema';

export interface ErrorContext {
  endpoint?: string;
  method?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export interface UserFriendlyError {
  userMessage: string;
  errorCode: string;
}

// Generate unique error code in format ERR-YYYYMMDD-XXXX
function generateErrorCode(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `ERR-${year}${month}${day}-${random}`;
}

// Map technical errors to user-friendly messages
function getUserFriendlyMessage(error: Error, errorType: string): string {
  const errorMessage = error.message.toLowerCase();
  
  // Authentication errors
  if (errorType === 'authentication' || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
    return 'Não foi possível verificar suas credenciais. Por favor, verifique seu usuário e senha.';
  }
  
  // Validation errors
  if (errorType === 'validation' || errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    if (errorMessage.includes('username')) {
      return 'Nome de usuário inválido. Use apenas letras, números e underscore.';
    }
    if (errorMessage.includes('email')) {
      return 'Email inválido. Verifique o formato do email.';
    }
    if (errorMessage.includes('password')) {
      return 'Senha deve ter pelo menos 6 caracteres.';
    }
    if (errorMessage.includes('phone')) {
      return 'Número de telefone inválido. Use apenas números.';
    }
    return 'Alguns dados estão incompletos ou incorretos. Verifique os campos destacados.';
  }
  
  // Duplicate/conflict errors
  if (errorType === 'conflict' || errorMessage.includes('duplicate') || errorMessage.includes('already exists') || errorMessage.includes('unique')) {
    if (errorMessage.includes('username')) {
      return 'Este nome de usuário já está em uso. Por favor, escolha outro.';
    }
    if (errorMessage.includes('email')) {
      return 'Este email já está cadastrado. Use outro email ou faça login.';
    }
    if (errorMessage.includes('phone')) {
      return 'Este telefone já está cadastrado no sistema.';
    }
    if (errorMessage.includes('medical_license') || errorMessage.includes('crm')) {
      return 'Este CRM já está cadastrado. Verifique o número informado.';
    }
    return 'Já existe um registro com estes dados. Verifique as informações.';
  }
  
  // Database errors
  if (errorType === 'database' || errorMessage.includes('database') || errorMessage.includes('connection')) {
    return 'Problema temporário com o banco de dados. Tente novamente em alguns instantes.';
  }
  
  // External API errors
  if (errorType === 'external_api' || errorMessage.includes('api') || errorMessage.includes('external')) {
    return 'Serviço externo temporariamente indisponível. Tente novamente mais tarde.';
  }
  
  // Permission errors
  if (errorType === 'permission' || errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
    return 'Você não tem permissão para realizar esta ação.';
  }
  
  // Not found errors
  if (errorType === 'not_found' || errorMessage.includes('not found')) {
    return 'Registro não encontrado. Verifique se as informações estão corretas.';
  }
  
  // Generic fallback
  return 'Ocorreu um problema inesperado. Nossa equipe foi notificada e está trabalhando na solução.';
}

// Determine error type from error
function determineErrorType(error: Error, context?: ErrorContext): string {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('credentials')) {
    return 'authentication';
  }
  if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorMessage.includes('required')) {
    return 'validation';
  }
  if (errorMessage.includes('duplicate') || errorMessage.includes('unique') || errorMessage.includes('conflict')) {
    return 'conflict';
  }
  if (errorMessage.includes('database') || errorMessage.includes('sql') || errorMessage.includes('connection')) {
    return 'database';
  }
  if (errorMessage.includes('permission') || errorMessage.includes('forbidden') || errorMessage.includes('access denied')) {
    return 'permission';
  }
  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return 'not_found';
  }
  if (errorMessage.includes('api') || errorMessage.includes('external')) {
    return 'external_api';
  }
  
  return 'internal';
}

export class ErrorLoggerService {
  /**
   * Log an error and return user-friendly information
   */
  async logError(
    error: Error,
    context?: ErrorContext,
    req?: Request
  ): Promise<UserFriendlyError> {
    const errorCode = generateErrorCode();
    const errorType = determineErrorType(error, context);
    const userMessage = getUserFriendlyMessage(error, errorType);
    
    try {
      const errorLog: InsertErrorLog = {
        errorCode,
        userId: context?.userId || (req?.user as any)?.id || null,
        errorType,
        endpoint: context?.endpoint || req?.path || null,
        method: context?.method || req?.method || null,
        technicalMessage: error.message,
        userMessage,
        stackTrace: error.stack || null,
        context: context?.additionalData ? JSON.stringify(context.additionalData) : null,
        ipAddress: (req?.ip || req?.socket?.remoteAddress) || null,
        userAgent: req?.get('user-agent') || null,
        resolved: false,
      };
      
      await db.insert(errorLogs).values(errorLog);
      
      console.error(`[${errorCode}] ${errorType.toUpperCase()}: ${error.message}`, {
        stack: error.stack,
        context,
      });
    } catch (loggingError) {
      // If logging fails, at least log to console
      console.error('Failed to log error to database:', loggingError);
      console.error('Original error:', error);
    }
    
    return {
      userMessage,
      errorCode,
    };
  }
  
  /**
   * Get all error logs with optional filters
   * This is a pass-through to the storage layer
   */
  async getErrorLogs(filters?: {
    errorType?: string;
    userId?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    // Import dynamically to avoid circular dependency
    const { storage } = await import('../storage');
    return await storage.getErrorLogs(filters);
  }
}

export const errorLoggerService = new ErrorLoggerService();
