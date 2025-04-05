// src/sql-translator/interfaces/translator.interface.ts
export interface Translator {
    /**
     * Traduce un AST de SQL a una sentencia CQL
     * @param ast AST generado por el parser SQL
     * @returns Sentencia CQL equivalente
     */
    translate(ast: any): string | null;
    
    /**
     * Verifica si el traductor puede manejar el AST proporcionado
     * @param ast AST generado por el parser SQL
     * @returns true si puede manejar el AST, false en caso contrario
     */
    canHandle(ast: any): boolean;
  }
  
  // src/sql-translator/interfaces/sql-to-cql.interface.ts
  export interface SqlToCqlResult {
    success: boolean;
    cql?: string;
    error?: string;
  }
  
  export interface TranslationOptions {
    validateOnly?: boolean;
    throwOnError?: boolean;
    targetVersion?: string;
  }