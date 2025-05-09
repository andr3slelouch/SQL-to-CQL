export interface SqlToCqlResult {
  success: boolean;
  cql?: string;
  error?: string;
  message?: string;
  executionResult?: any;
  copyableCqlQuery?: {
    query: string;
    description: string;
  };
}

export interface TranslationOptions {
  validateOnly?: boolean;
  throwOnError?: boolean;
  targetVersion?: string;
  executeInCassandra?: boolean;  // Añadido esta propiedad
  token?: string;                // Añadido esta propiedad
  user?: any;                    // Añadido esta propiedad
}