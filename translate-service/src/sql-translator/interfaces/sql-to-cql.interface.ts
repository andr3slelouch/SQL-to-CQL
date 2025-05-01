export interface SqlToCqlResult {
  success: boolean;
  cql?: string;
  error?: string;
  message?: string; // Nuevo campo para mensajes personalizados
  executionResult?: {
    success: boolean;
    data?: any;
    error?: string;
  };
}

export interface TranslationOptions {
  validateOnly?: boolean;
  throwOnError?: boolean;
  executeInCassandra?: boolean;
  token?: string;
  user?: any;
}