import { Injectable } from '@nestjs/common';
import { SqlToCqlResult } from '../interfaces/sql-to-cql.interface';

@Injectable()
export class ResponseFormatterService {
  /**
   * Formatea la respuesta de una traducción SQL a CQL añadiendo mensajes personalizados
   * @param result Resultado de la traducción/ejecución
   * @param tipoOperacion Tipo de operación SQL/CQL
   * @returns Resultado formateado con mensajes personalizados
   */
  formatResponse(result: SqlToCqlResult, tipoOperacion: string | undefined): SqlToCqlResult {
    // Si la operación no fue exitosa, mantener el resultado original
    if (!result.success) {
      return result;
    }

    // Normalizar tipoOperacion para asegurar que sea string
    const operationType = tipoOperacion || 'UNKNOWN';

    // Obtener nombre de la tabla o keyspace de la consulta CQL
    const { tableName, keyspaceName } = this.extractNames(result.cql);
    
    // Si no hay resultados de ejecución, solo agregar mensaje basado en la traducción
    if (!result.executionResult) {
      const message = this.getMessageForOperation(operationType, { tableName, keyspaceName });
      return {
        ...result,
        message
      };
    }

    // Formatear respuesta incluyendo resultados de ejecución y mensaje personalizado
    const formattedResult = {
      ...result,
      message: this.getMessageForOperation(operationType, { 
        tableName, 
        keyspaceName,
        data: result.executionResult.data
      })
    };

    return formattedResult;
  }

  /**
   * Extrae nombres de tabla y keyspace de una consulta CQL
   * @param cql Consulta CQL
   * @returns Nombres de tabla y keyspace encontrados
   */
  private extractNames(cql: string | undefined): { tableName: string, keyspaceName: string } {
    let tableName = '';
    let keyspaceName = '';

    // Si no hay CQL, retornar valores vacíos
    if (!cql) {
      return { tableName, keyspaceName };
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
      const keyspaceMatch = cql.match(/KEYSPACE\s+([^\s(,;]+)/i);
      if (keyspaceMatch && keyspaceMatch[1]) {
        keyspaceName = keyspaceMatch[1].replace(/["`']/g, '');
      }
    }

    return { tableName, keyspaceName };
  }

  /**
   * Obtiene un mensaje personalizado según el tipo de operación
   * @param tipoOperacion Tipo de operación SQL/CQL
   * @param params Parámetros adicionales (nombres de tabla/keyspace, datos)
   * @returns Mensaje personalizado
   */
  private getMessageForOperation(tipoOperacion: string, params: { 
    tableName?: string, 
    keyspaceName?: string,
    data?: any
  }): string {
    const { tableName, keyspaceName, data } = params;
    
    // Normalizar valores para evitar undefined
    const table = tableName || 'desconocida';
    const keyspace = keyspaceName || 'desconocida';

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
        return `Índice creado correctamente`;
        
      case 'DROP INDEX':
        return `Índice eliminado correctamente`;
        
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