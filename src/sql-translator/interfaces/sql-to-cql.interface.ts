export interface SqlToCqlResult {
  success: boolean;
  cql?: string;
  error?: string;
  executionResult?: {
    success: boolean;
    data?: any;
    error?: string;
  };
}
  
export interface TranslationOptions {
  validateOnly?: boolean;
  throwOnError?: boolean;
  targetVersion?: string;
  executeInCassandra?: boolean;
}