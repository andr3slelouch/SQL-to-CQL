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

class TranslatorService {
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

      const request: TranslationRequest = {
        sql,
        keyspace
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
   * Ejecuta una consulta CQL y devuelve los resultados
   * @param cql Consulta CQL a ejecutar
   * @param keyspace Keyspace seleccionado
   * @returns Resultados de la consulta
   */
  async executeQuery(cql: string, keyspace: string): Promise<any[]> {
    try {
      if (!cql.trim() || !keyspace) {
        throw new Error('Se requiere una consulta CQL y un keyspace seleccionado');
      }

      const response = await HttpService.post<{results: any[]}>('/translator/execute', {
        cql,
        keyspace
      });
      
      return response.results || [];
    } catch (error) {
      console.error('Error al ejecutar la consulta:', error);
      throw error;
    }
  }
}

export default new TranslatorService();