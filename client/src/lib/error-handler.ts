interface ErrorSuggestion {
  title: string;
  description: string;
  suggestions?: string[];
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Array<{ message: string; path?: string[] }>;
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    const errorMessage = error.message;
    
    const statusMatch = errorMessage.match(/^(\d{3}):/);
    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1]);
      const restOfMessage = errorMessage.substring(statusMatch[0].length).trim();
      
      try {
        const parsed = JSON.parse(restOfMessage);
        return {
          statusCode,
          message: parsed.message || restOfMessage,
          errors: parsed.errors,
        };
      } catch {
        return {
          statusCode,
          message: restOfMessage,
        };
      }
    }
  }
  
  return {
    statusCode: 500,
    message: String(error),
  };
}

export function getErrorSuggestion(error: unknown): ErrorSuggestion {
  const apiError = parseApiError(error);
  
  switch (apiError.statusCode) {
    case 409:
      if (apiError.message.toLowerCase().includes('username')) {
        return {
          title: 'Nome de usuário já existe',
          description: 'Este nome de usuário já está sendo usado por outra conta.',
          suggestions: [
            'Tente adicionar números ou caracteres especiais ao nome',
            'Use uma variação do seu nome (ex: maria.silva, m.silva)',
            'Escolha um nome de usuário completamente diferente',
          ],
        };
      }
      if (apiError.message.toLowerCase().includes('email')) {
        return {
          title: 'Email já cadastrado',
          description: 'Este email já está associado a outra conta.',
          suggestions: [
            'Verifique se você já possui uma conta cadastrada',
            'Tente recuperar sua senha se esqueceu',
            'Use um email diferente para criar uma nova conta',
          ],
        };
      }
      if (apiError.message.toLowerCase().includes('phone')) {
        return {
          title: 'Telefone já cadastrado',
          description: 'Este número de telefone já está associado a outra conta.',
          suggestions: [
            'Verifique se você já possui uma conta cadastrada',
            'Use um número de telefone diferente',
            'Entre em contato com o suporte se houver erro',
          ],
        };
      }
      if (apiError.message.toLowerCase().includes('crm')) {
        return {
          title: 'CRM já cadastrado',
          description: 'Este número de CRM já está registrado no sistema.',
          suggestions: [
            'Verifique se você já possui uma conta de médico',
            'Confirme se digitou o CRM corretamente',
            'Entre em contato com o suporte se houver erro',
          ],
        };
      }
      return {
        title: 'Informação duplicada',
        description: 'Alguma informação fornecida já existe no sistema.',
        suggestions: [
          'Verifique se você já possui uma conta cadastrada',
          'Revise os dados preenchidos',
          'Entre em contato com o suporte se necessário',
        ],
      };
    
    case 400:
      if (apiError.errors && apiError.errors.length > 0) {
        const errorMessages = apiError.errors.map(e => e.message).join(', ');
        return {
          title: 'Dados inválidos',
          description: errorMessages,
          suggestions: [
            'Verifique todos os campos obrigatórios',
            'Certifique-se de que os dados estão no formato correto',
            'Revise as informações e tente novamente',
          ],
        };
      }
      return {
        title: 'Dados inválidos',
        description: apiError.message || 'Os dados enviados não são válidos.',
        suggestions: [
          'Verifique se todos os campos estão preenchidos corretamente',
          'Certifique-se de que email e telefone estão no formato correto',
          'Revise as informações e tente novamente',
        ],
      };
    
    case 401:
      return {
        title: 'Não autorizado',
        description: 'Suas credenciais estão incorretas ou sua sessão expirou.',
        suggestions: [
          'Verifique seu nome de usuário e senha',
          'Certifique-se de que está usando as credenciais corretas',
          'Tente fazer login novamente',
        ],
      };
    
    case 403:
      return {
        title: 'Acesso negado',
        description: 'Você não tem permissão para realizar esta ação.',
        suggestions: [
          'Verifique se sua conta tem as permissões necessárias',
          'Entre em contato com um administrador',
          'Faça login com uma conta com permissões adequadas',
        ],
      };
    
    case 404:
      return {
        title: 'Não encontrado',
        description: 'O recurso solicitado não foi encontrado.',
        suggestions: [
          'Verifique se o link está correto',
          'O item pode ter sido removido',
          'Tente atualizar a página',
        ],
      };
    
    case 422:
      return {
        title: 'Dados incompletos ou inválidos',
        description: apiError.message || 'Alguns dados não puderam ser processados.',
        suggestions: [
          'Verifique se todos os campos obrigatórios estão preenchidos',
          'Confirme que os dados estão no formato esperado',
          'Revise as informações e tente novamente',
        ],
      };
    
    case 429:
      return {
        title: 'Muitas tentativas',
        description: 'Você fez muitas tentativas em pouco tempo.',
        suggestions: [
          'Aguarde alguns minutos antes de tentar novamente',
          'Evite enviar o formulário múltiplas vezes',
          'Entre em contato com o suporte se o problema persistir',
        ],
      };
    
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        title: 'Erro no servidor',
        description: 'Ocorreu um problema no servidor. Não é sua culpa!',
        suggestions: [
          'Tente novamente em alguns instantes',
          'Verifique sua conexão com a internet',
          'Se o problema persistir, entre em contato com o suporte',
        ],
      };
    
    default:
      return {
        title: 'Erro inesperado',
        description: apiError.message || 'Ocorreu um erro inesperado.',
        suggestions: [
          'Tente novamente',
          'Verifique sua conexão com a internet',
          'Entre em contato com o suporte se o problema persistir',
        ],
      };
  }
}

export function formatErrorForToast(error: unknown) {
  const suggestion = getErrorSuggestion(error);
  
  let description = suggestion.description;
  if (suggestion.suggestions && suggestion.suggestions.length > 0) {
    description += '\n\nSugestões:\n• ' + suggestion.suggestions.join('\n• ');
  }
  
  return {
    title: suggestion.title,
    description,
  };
}
