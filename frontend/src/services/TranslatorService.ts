// src/services/TranslatorService.ts
import HttpService from './HttpService';

export interface TranslationRequest {
  sql: string;
  keyspace: string;
}

export interface TranslationResponse {
  cql: string;
  results?: any[];
  error?: string;
}

export interface ExecuteResponse {
  success: boolean;
  cql?: string;
  translatedQuery?: string;
  copyableCqlQuery?: {
    query: string;
    description: string;
  };
  message?: string;
  data?: any[];
  metadata?: {
    columns: string[];
  };
  executionResult?: {
    success: boolean;
    data: {
      info?: any;
      rows: any[];
      rowLength: number;
      columns: {
        name: string;
        type: {
          code: number;
          type: any;
        };
      }[];
      pageState: any;
    };
  };
}

class TranslatorService {
  /**
   * Normaliza el nombre del keyspace a minúsculas
   * @param keyspace Nombre del keyspace
   * @returns Nombre normalizado (en minúsculas)
   */
  private normalizeKeyspaceName(keyspace: string): string {
    return keyspace ? keyspace.toLowerCase() : '';
  }

  /**
   * Mejora los mensajes de respuesta agregando información útil
   * @param message Mensaje original del backend
   * @param query Consulta SQL ejecutada
   * @returns Mensaje mejorado
   */
  private enhanceResponseMessage(message: string, query: string): string {
    if (!message || !query) return message;

    const trimmedQuery = query.trim().toLowerCase();
    let enhancedMessage = message;

    // Detectar CREATE DATABASE
    if (trimmedQuery.includes('create') && trimmedQuery.includes('database')) {
      enhancedMessage += ' Para observar la base creada recargue la página.';
    }
    
    // Detectar CREATE TABLE
    else if (trimmedQuery.includes('create') && trimmedQuery.includes('table')) {
      enhancedMessage += ' Para observar la tabla creada recargue la página.';
    }

    // Detectar mensajes de ALLOW FILTERING
    if (message.toLowerCase().includes('allow filtering') || 
        message.toLowerCase().includes('allowfiltering')) {
      enhancedMessage += ' Se recomienda crear un índice a la columna.';
    }

    // Detectar consultas WHERE que devuelven 0 registros
    if (message.toLowerCase().includes('se encontraron 0 registros') && 
        trimmedQuery.includes('where')) {
      enhancedMessage += ' Se sugiere crear un índice a la columna.';
    }

    return enhancedMessage;
  }

  /**
   * Mejora una respuesta del backend aplicando las mejoras de mensajes
   * @param response Respuesta original del backend
   * @param query Consulta SQL ejecutada
   * @returns Respuesta con mensajes mejorados
   */
  private enhanceExecuteResponse(response: ExecuteResponse, query: string): ExecuteResponse {
    const enhancedResponse = { ...response };

    // Mejorar el mensaje principal si existe
    if (enhancedResponse.message) {
      enhancedResponse.message = this.enhanceResponseMessage(enhancedResponse.message, query);
    }

    return enhancedResponse;
  }

  /**
   * Traduce una consulta SQL a CQL
   * @param sql Consulta SQL a traducir
   * @param keyspace Keyspace seleccionado
   * @returns Resultado de la traducción
   */
  async translateQuery(sql: string, keyspace: string): Promise<TranslationResponse> {
    try {
      if (!sql.trim() || !keyspace) {
        throw new Error('Se requiere una consulta SQL y un keyspace seleccionado');
      }

      // Normalizar el keyspace a minúsculas
      const normalizedKeyspace = this.normalizeKeyspaceName(keyspace);

      const request: TranslationRequest = {
        sql,
        keyspace: normalizedKeyspace
      };

      const response = await HttpService.post<TranslationResponse>('/translator/translate', request);
      return response;
    } catch (error) {
      console.error('Error al traducir la consulta:', error);
      if (error instanceof Error) {
        return { cql: '', error: error.message };
      }
      return { cql: '', error: 'Error desconocido al traducir la consulta' };
    }
  }

  /**
   * Ejecuta una consulta SQL (traducida a CQL) y devuelve los resultados mejorados
   * @param sql Consulta SQL a ejecutar
   * @returns Resultado de la ejecución con mensajes mejorados
   */
  async executeQuery(sql: string): Promise<ExecuteResponse> {
    try {
      if (!sql.trim()) {
        throw new Error('Se requiere una consulta SQL');
      }

      const response = await HttpService.post<ExecuteResponse>(
        '/translator/execute',
        { sql },
        { service: 'translator' }
      );

      // Aplicar mejoras a los mensajes antes de devolver la respuesta
      return this.enhanceExecuteResponse(response, sql);
    } catch (error) {
      console.error('Error al ejecutar la consulta:', error);
      
      // Crear respuesta de error mejorada
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al ejecutar la consulta';
      const enhancedErrorMessage = this.enhanceResponseMessage(errorMessage, sql);
      
      return {
        success: false,
        message: enhancedErrorMessage
      };
    }
  }

  /**
   * Ejecuta una consulta CQL directa y devuelve los resultados
   * @param cql Consulta CQL a ejecutar
   * @param keyspace Keyspace seleccionado
   * @returns Resultados de la consulta
   */
  async executeCqlQuery(cql: string, keyspace: string): Promise<any[]> {
    try {
      if (!cql.trim() || !keyspace) {
        throw new Error('Se requiere una consulta CQL y un keyspace seleccionado');
      }

      // Normalizar el keyspace a minúsculas
      const normalizedKeyspace = this.normalizeKeyspaceName(keyspace);

      const response = await HttpService.post<{results: any[]}>('/translator/execute', {
        cql,
        keyspace: normalizedKeyspace
      });
      
      return response.results || [];
    } catch (error) {
      console.error('Error al ejecutar la consulta CQL:', error);
      throw error;
    }
  }
}

export default new TranslatorService();