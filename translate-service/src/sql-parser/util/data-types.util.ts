// src/sql-parser/util/data-types.util.ts
import { Logger } from '@nestjs/common';

/**
 * Clase utilitaria para manejar la conversión de tipos de datos entre SQL y CQL
 */
export class DataTypesMapper {
  private static readonly logger = new Logger('DataTypesMapper');

  /**
   * Mapa de tipos de datos SQL a tipos CQL
   * Basado en la documentación oficial de Cassandra
   */
  private static readonly SQL_TO_CQL_TYPE_MAP: Record<string, string> = {
    // Tipos numéricos
    'INT': 'int',
    'INTEGER': 'int',
    'SMALLINT': 'smallint',
    'TINYINT': 'tinyint',
    'BIGINT': 'bigint',
    'FLOAT': 'float',
    'DOUBLE': 'double',
    'DECIMAL': 'decimal',
    'REAL': 'float',
    'NUMERIC': 'decimal',
    
    // Tipos de texto
    'CHAR': 'text',
    'VARCHAR': 'text',
    'TEXT': 'text',
    'LONGTEXT': 'text',
    'MEDIUMTEXT': 'text',
    'CLOB': 'text',
    
    // Tipos binarios
    'BINARY': 'blob',
    'VARBINARY': 'blob',
    'BLOB': 'blob',
    'LONGBLOB': 'blob',
    'MEDIUMBLOB': 'blob',
    
    // Tipos de fecha y hora
    'DATE': 'date',
    'TIME': 'time',
    'TIMESTAMP': 'timestamp',
    'DATETIME': 'timestamp',
    
    // Tipos booleanos
    'BOOLEAN': 'boolean',
    'BOOL': 'boolean',
    
    // Tipos de UUID
    'UUID': 'uuid',
    
    // Tipos específicos de Cassandra
    'TIMEUUID': 'timeuuid',
    'INET': 'inet',
    'VARINT': 'varint',
    'DURATION': 'duration',
    'COUNTER': 'counter',
    'ASCII': 'ascii'
  };

  /**
   * Mapea un tipo de datos SQL a su equivalente en CQL
   * @param sqlType Tipo de datos SQL (sin parámetros)
   * @returns Tipo de datos CQL equivalente
   */
  public static mapSQLTypeToCQL(sqlType: string): string {
    // Normalizar el tipo para la búsqueda
    const normalizedType = this.normalizeTypeName(sqlType);
    
    // Buscar en el mapa de tipos
    const cqlType = this.SQL_TO_CQL_TYPE_MAP[normalizedType];
    
    if (!cqlType) {
      this.logger.warn(`Tipo de datos SQL no reconocido: ${sqlType}, usando 'text' como valor predeterminado`);
      return 'text'; // Tipo predeterminado si no se encuentra una correspondencia
    }
    
    return cqlType;
  }

  /**
   * Extrae el tipo base de una definición de tipo SQL (elimina parámetros de longitud, precisión, etc.)
   * @param sqlTypeWithParams Tipo SQL completo (ej: VARCHAR(255))
   * @returns Tipo base SQL (ej: VARCHAR)
   */
  public static extractBaseType(sqlTypeWithParams: string): string {
    // Eliminar espacios iniciales y finales
    const trimmedType = sqlTypeWithParams.trim();
    
    // Extraer el tipo base (sin parámetros)
    const match = trimmedType.match(/^([A-Za-z]+)(?:\s*\(.*\))?$/);
    
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
    
    // Si no se puede extraer, devolver el tipo original
    return trimmedType.toUpperCase();
  }

  /**
   * Normaliza el nombre del tipo para la búsqueda en el mapa
   * @param typeName Nombre del tipo SQL
   * @returns Nombre normalizado (en mayúsculas, sin parámetros)
   */
  private static normalizeTypeName(typeName: string): string {
    return this.extractBaseType(typeName);
  }

  /**
   * Extrae parámetros de un tipo SQL (longitud, precisión, escala)
   * @param sqlTypeWithParams Tipo SQL completo (ej: VARCHAR(255))
   * @returns Objeto con los parámetros extraídos
   */
  public static extractTypeParameters(sqlTypeWithParams: string): any {
    const params: any = {};
    
    // Buscar parámetros entre paréntesis
    const match = sqlTypeWithParams.match(/^[A-Za-z]+\s*\((.*)\)$/);
    
    if (match && match[1]) {
      const paramStr = match[1];
      
      // Para tipos como DECIMAL(10,2) o NUMERIC(p,s)
      if (paramStr.includes(',')) {
        const [precision, scale] = paramStr.split(',').map(p => parseInt(p.trim(), 10));
        params.precision = precision;
        params.scale = scale;
      } 
      // Para tipos como VARCHAR(255) o CHAR(n)
      else {
        params.length = parseInt(paramStr.trim(), 10);
      }
    }
    
    return params;
  }

  /**
   * Verifica si un tipo SQL requiere comillas en sus valores literales
   * @param sqlType Tipo SQL
   * @returns true si el tipo requiere comillas
   */
  public static requiresQuotes(sqlType: string): boolean {
    const baseType = this.normalizeTypeName(sqlType);
    
    // Tipos que requieren comillas en sus valores literales
    const quotedTypes = [
      'CHAR', 'VARCHAR', 'TEXT', 'LONGTEXT', 'MEDIUMTEXT', 'CLOB',
      'DATE', 'TIME', 'TIMESTAMP', 'DATETIME',
      'UUID', 'TIMEUUID', 'ASCII'
    ];
    
    return quotedTypes.includes(baseType);
  }
  
  /**
   * Formatea un valor literal según el tipo de datos SQL
   * @param value Valor literal
   * @param sqlType Tipo SQL del valor
   * @returns Valor formateado para CQL
   */
  public static formatValueForCQL(value: any, sqlType: string): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    const baseType = this.normalizeTypeName(sqlType);
    
    // Formatear según el tipo
    switch (baseType) {
      case 'BOOLEAN':
      case 'BOOL':
        return value.toString().toLowerCase();
        
      case 'DATE':
      case 'TIME':
      case 'TIMESTAMP':
      case 'DATETIME':
      case 'CHAR':
      case 'VARCHAR':
      case 'TEXT':
      case 'UUID':
      case 'TIMEUUID':
      case 'ASCII':
        return `'${value}'`;
        
      case 'INT':
      case 'INTEGER':
      case 'SMALLINT':
      case 'TINYINT':
      case 'BIGINT':
      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL':
      case 'REAL':
      case 'NUMERIC':
      case 'VARINT':
        return value.toString();
        
      default:
        // Para tipos binarios u otros, convertir a string y citar
        return `'${value}'`;
    }
  }
}