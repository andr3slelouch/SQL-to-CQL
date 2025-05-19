// src/sql-translator/services/response-formatter.service.ts
import { Injectable } from '@nestjs/common';
import { SqlToCqlResult } from '../interfaces/sql-to-cql.interface';

@Injectable()
export class ResponseFormatterService {
  /**
   * Formatea la respuesta de una traducción SQL a CQL 
   * @param result Resultado de la traducción/ejecución
   * @param tipoOperacion Tipo de operación SQL/CQL
   * @returns Resultado formateado 
   */
  formatResponse(result: SqlToCqlResult, tipoOperacion: string | undefined): SqlToCqlResult {
    // Si la operación no fue exitosa, mantener el resultado original
    if (!result.success) {
      return result;
    }

    // Normalizar tipoOperacion para asegurar que sea string
    const operationType = tipoOperacion || 'UNKNOWN';
    
    // Obtener nombre de la tabla o keyspace de la consulta CQL
    const { tableName, keyspaceName, indexName } = this.extractNames(result.cql);
    
    // Crear el objeto de consulta CQL para copiar y pegar
    const copyableCqlQuery = this.createCopyableCqlQuery(result.cql);

    // Si no hay resultados de ejecución, solo agregar mensaje basado en la traducción
    if (!result.executionResult) {
      const message = this.getMessageForOperation(operationType, { tableName, keyspaceName, indexName });
      return {
        ...result,
        message,
        copyableCqlQuery
      };
    }

    // Formatear respuesta incluyendo resultados de ejecución y mensaje personalizado
    const formattedResult = {
      ...result,
      message: this.getMessageForOperation(operationType, { 
        tableName, 
        keyspaceName,
        indexName,
        data: result.executionResult.data
      }),
      copyableCqlQuery
    };

    return formattedResult;
  }

  /**
   * Crea un objeto con la consulta CQL formateada para ser copiada y pegada
   * @param cql Consulta CQL original
   * @returns Objeto con la consulta CQL lista para copiar y pegar
   */
  private createCopyableCqlQuery(cql: string | undefined): { query: string, description: string } | undefined {
    if (!cql) {
      return undefined;
    }

    // Asegurar que la consulta termine con punto y coma
    let formattedQuery = cql.trim();
    if (!formattedQuery.endsWith(';')) {
      formattedQuery += ';';
    }

    return {
      query: formattedQuery,
      description: 'Consulta CQL lista para copiar y pegar en Cassandra'
    };
  }

  /**
   * Extrae nombres de tabla, keyspace e índice de una consulta CQL
   * @param cql Consulta CQL
   * @returns Nombres de tabla, keyspace e índice encontrados
   */
  private extractNames(cql: string | undefined): { tableName: string, keyspaceName: string, indexName: string } {
    let tableName = '';
    let keyspaceName = '';
    let indexName = '';
    
    // Si no hay CQL, retornar valores vacíos
    if (!cql) {
      return { tableName, keyspaceName, indexName };
    }
    
    // Normalizar consulta para facilitar la extracción
    const normalizedCql = cql.trim().toUpperCase();
    
    // Extraer nombre de tabla
    if (normalizedCql.includes(' TABLE ')) {
      const tableMatch = cql.match(/TABLE\s+([^\s(,;]+)/i);
      if (tableMatch && tableMatch[1]) {
        tableName = tableMatch[1].replace(/["`']/g, '');
      }
    } else if (normalizedCql.includes(' INTO ')) {
      const tableMatch = cql.match(/INTO\s+([^\s(,;]+)/i);
      if (tableMatch && tableMatch[1]) {
        tableName = tableMatch[1].replace(/["`']/g, '');
      }
    } else if (normalizedCql.includes(' FROM ')) {
      const tableMatch = cql.match(/FROM\s+([^\s(,;]+)/i);
      if (tableMatch && tableMatch[1]) {
        tableName = tableMatch[1].replace(/["`']/g, '');
      }
    } else if (normalizedCql.includes(' UPDATE ')) {
      const tableMatch = cql.match(/UPDATE\s+([^\s(,;]+)/i);
      if (tableMatch && tableMatch[1]) {
        tableName = tableMatch[1].replace(/["`']/g, '');
      }
    }
    
    // Extraer nombre de keyspace
    if (normalizedCql.includes(' KEYSPACE ')) {
      const keyspaceMatch = cql.match(/KEYSPACE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?([^\s(,;]+)/i);
      if (keyspaceMatch && keyspaceMatch[1]) {
        keyspaceName = keyspaceMatch[1].replace(/["`']/g, '');
      }
    }
    
    // Extraer nombre de índice para DROP INDEX
    if (normalizedCql.startsWith('DROP INDEX')) {
      const indexMatch = cql.match(/DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?([^\s(,;]+)/i);
      if (indexMatch && indexMatch[1]) {
        indexName = indexMatch[1].replace(/["`']/g, '');
      }
    }
    // Extraer nombre de índice para CREATE INDEX
    else if (normalizedCql.startsWith('CREATE INDEX')) {
      const indexMatch = cql.match(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(,;]+)/i);
      if (indexMatch && indexMatch[1]) {
        indexName = indexMatch[1].replace(/["`']/g, '');
      }
    }
    
    return { tableName, keyspaceName, indexName };
  }

  /**
   * Obtiene un mensaje personalizado según el tipo de operación
   * @param tipoOperacion Tipo de operación SQL/CQL
   * @param params Parámetros adicionales (nombres de tabla/keyspace/índice, datos)
   * @returns Mensaje personalizado
   */
  private getMessageForOperation(tipoOperacion: string, params: { 
    tableName?: string, 
    keyspaceName?: string,
    indexName?: string,
    data?: any
  }): string {
    const { tableName, keyspaceName, indexName, data } = params;
    
    // Normalizar valores para evitar undefined
    const table = tableName || 'desconocida';
    const keyspace = keyspaceName || 'desconocida';
    const index = indexName || 'desconocido';
    
    switch (tipoOperacion) {
      case 'CREATE KEYSPACE':
        return `La base de datos ${keyspace} ha sido creada correctamente`;
      case 'ALTER KEYSPACE':
        return `La base de datos ${keyspace} ha sido modificada`;
      case 'DROP KEYSPACE':
        return `La base de datos ${keyspace} ha sido eliminada correctamente`;
      case 'DESCRIBE KEYSPACES':
        return `Información de keyspaces disponibles`;
      case 'CREATE TABLE':
        return `La tabla ${table} ha sido creada correctamente`;
      case 'ALTER TABLE ADD':
        return `La tabla ${table} ha sido alterada con nuevas columnas`;
      case 'ALTER TABLE DROP':
        return `Se han eliminado columnas de la tabla ${table}`;
      case 'ALTER TABLE RENAME':
        return `La tabla ${table} ha sido renombrada correctamente`;
      case 'DROP TABLE':
        return `La tabla ${table} ha sido eliminada correctamente`;
      case 'TRUNCATE TABLE':
        return `La tabla ${table} ha sido truncada correctamente`;
      case 'DESCRIBE TABLES':
        return `Información de tablas disponibles`;
      case 'DESCRIBE TABLE':
        return `Estructura de la tabla ${table}`;
      case 'CREATE INDEX':
        return `Índice ${index} creado correctamente`;
      case 'DROP INDEX':
        return `Índice ${index} eliminado correctamente`;
      case 'INSERT':
        return `Datos insertados correctamente en la tabla ${table}`;
      case 'UPDATE':
        return `Datos actualizados correctamente en la tabla ${table}`;
      case 'DELETE':
        return `Datos eliminados correctamente de la tabla ${table}`;
      case 'SELECT':
        const rowCount = data?.rows?.length || 0;
        return `Consulta ejecutada: se encontraron ${rowCount} registros en la tabla ${table}`;
      default:
        return `Operación ${tipoOperacion} ejecutada correctamente`;
    }
  }
}