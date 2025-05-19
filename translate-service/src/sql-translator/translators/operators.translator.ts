// src/sql-translator/translators/operators.translator.ts
import { Injectable, Logger } from '@nestjs/common';
import { Translator } from '../interfaces/translator.interface';

@Injectable()
export class OperatorsTranslator implements Translator {
  private readonly logger = new Logger(OperatorsTranslator.name);

  /**
   * Verifica si este traductor puede manejar el AST proporcionado
   * @param ast AST de la sentencia SQL
   * @returns true si puede manejar el AST, false en caso contrario
   */
  canHandle(ast: any): boolean {
    // Este traductor maneja tipos específicos de expresiones,
    // no sentencias SQL completas
    return false;
  }

  /**
   * Traduce un AST de operador a CQL
   * @param ast AST de la operación
   * @returns Sentencia CQL equivalente
   */
  translate(ast: any): string | null {
    // Este traductor no se usa directamente, solo proporciona
    // funciones auxiliares para otros traductores
    return null;
  }

  /**
   * Mapea un operador SQL a su equivalente en CQL
   * @param sqlOperator Operador SQL
   * @returns Operador CQL equivalente
   */
  mapOperator(sqlOperator: string): string {
    // La mayoría de los operadores son iguales en SQL y CQL
    switch (sqlOperator) {
      // Operadores de comparación
      case '=':
      case '!=':
      case '<>': // <> en SQL es != en CQL
      case '>':
      case '<':
      case '>=':
      case '<=':
        return sqlOperator === '<>' ? '!=' : sqlOperator;
      
      // Operadores lógicos
      case 'AND':
      case 'OR':
      case 'NOT':
        return sqlOperator;
      
      // Operadores de conjuntos
      case 'IN': // En CQL funciona igual
        return sqlOperator;
      
      // Operadores de patrones
      case 'LIKE': // LIKE no existe en CQL, se usa CONTAINS para casos simples
        this.logger.warn('LIKE no está soportado en CQL. Considere usar CONTAINS.');
        return 'CONTAINS'; // Esto es una aproximación y no funciona igual
      
      // Operadores de nulidad
      case 'IS NULL':
      case 'IS NOT NULL':
        return sqlOperator;
      
      // Operadores de rango
      case 'BETWEEN': // En CQL funciona igual
        return sqlOperator;
      
      // Otros operadores
      default:
        this.logger.warn(`Operador '${sqlOperator}' no reconocido o no soportado en CQL`);
        return sqlOperator; // Devolver el mismo operador como fallback
    }
  }

  /**
   * Verifica si una función SQL es soportada en CQL
   * @param funcName Nombre de la función SQL
   * @returns Nombre de la función CQL equivalente, o null si no está soportada
   */
  mapFunction(funcName: string): string | null {
    const upperFuncName = funcName.toUpperCase();
    
    // Funciones de agregación soportadas en CQL
    if (['COUNT', 'MIN', 'MAX', 'SUM', 'AVG'].includes(upperFuncName)) {
      return upperFuncName;
    }
    
    // Funciones de fecha y hora
    if (['NOW', 'CURRENTTIMESTAMP', 'CURRENTTIME', 'CURRENTDATE'].includes(upperFuncName)) {
      // En CQL, se usa toTimestamp(now()) o dateof(now())
      if (upperFuncName === 'NOW') {
        return 'now()';
      } else {
        this.logger.warn(`La función '${funcName}' se traduce a 'now()' en CQL`);
        return 'now()';
      }
    }
    
    // Funciones de conversión
    if (['CAST', 'CONVERT'].includes(upperFuncName)) {
      // CQL tiene funciones de conversión como toTimestamp(), toDate(), etc.
      this.logger.warn(`La función '${funcName}' se debe traducir manualmente según el tipo de destino`);
      return upperFuncName; 
    }
    
    // Funciones de cadena
    if (['CONCAT', 'SUBSTRING', 'LENGTH', 'UPPER', 'LOWER'].includes(upperFuncName)) {
      // CQL no soporta estas funciones directamente
      this.logger.warn(`La función '${funcName}' no está soportada en CQL`);
      return null;
    }
    
    // Funciones matemáticas
    if (['ABS', 'ROUND', 'FLOOR', 'CEILING'].includes(upperFuncName)) {
      // CQL no soporta estas funciones directamente
      this.logger.warn(`La función '${funcName}' no está soportada en CQL`);
      return null;
    }
    
    // Otras funciones no reconocidas
    this.logger.warn(`Función '${funcName}' no reconocida o no soportada en CQL`);
    return null;
  }
  
  /**
   * Verifica si un tipo de datos SQL es soportado en CQL
   * @param sqlType Tipo de datos SQL
   * @returns Tipo de datos CQL equivalente
   */
  mapDataType(sqlType: string): string {
    const upperSqlType = sqlType.toUpperCase();
    
    // Mapear tipos de datos SQL a CQL
    const typeMap: Record<string, string> = {
      // Numéricos
      'INT': 'int',
      'INTEGER': 'int',
      'SMALLINT': 'smallint',
      'TINYINT': 'tinyint',
      'BIGINT': 'bigint',
      'DECIMAL': 'decimal',
      'NUMERIC': 'decimal',
      'FLOAT': 'float',
      'DOUBLE': 'double',
      'REAL': 'float',
      
      // Texto
      'CHAR': 'text',
      'VARCHAR': 'text',
      'TEXT': 'text',
      'CLOB': 'text',
      'STRING': 'text',
      
      // Fecha y hora
      'DATE': 'date',
      'TIME': 'time',
      'TIMESTAMP': 'timestamp',
      'DATETIME': 'timestamp',
      
      // Booleanos
      'BOOLEAN': 'boolean',
      'BOOL': 'boolean',
      
      // Binarios
      'BLOB': 'blob',
      'BINARY': 'blob',
      'VARBINARY': 'blob',
      
      // Otros
      'UUID': 'uuid',
      'TIMEUUID': 'timeuuid',
      'INET': 'inet',
      'COUNTER': 'counter'
    };
    
    // Verificar si el tipo existe en el mapa
    if (typeMap[upperSqlType]) {
      return typeMap[upperSqlType];
    }
    
    // Manejar tipos con parámetros (como VARCHAR(255))
    const match = upperSqlType.match(/^([A-Z]+)(\(.*\))?$/);
    if (match && match[1] && typeMap[match[1]]) {
      // Para tipos con parámetros
      const baseType = match[1];
      const params = match[2] || '';
      
      // En CQL, muchos tipos no llevan parámetros
      if (['CHAR', 'VARCHAR', 'TEXT'].includes(baseType)) {
        return 'text'; // Sin parámetros
      } else if (baseType === 'DECIMAL' || baseType === 'NUMERIC') {
        return `decimal${params}`; // Mantener los parámetros
      } else {
        return typeMap[baseType];
      }
    }
    
    // Tipo no soportado
    this.logger.warn(`Tipo de datos '${sqlType}' no reconocido o no soportado en CQL. Se usará 'text' como fallback.`);
    return 'text'; // Fallback a text
  }
  
  /**
   * Verifica las limitaciones de Cassandra para ciertas operaciones
   * @param operation Tipo de operación
   * @param options Opciones adicionales para la verificación
   * @returns Lista de advertencias sobre limitaciones
   */
  checkCassandraLimitations(operation: string, options: any = {}): string[] {
    const warnings: string[] = [];
    
    switch (operation) {
      case 'select':
        if (options.join) {
          warnings.push('Cassandra no soporta JOIN de la misma manera que SQL.');
        }
        if (options.groupBy) {
          warnings.push('Cassandra tiene soporte limitado para GROUP BY.');
        }
        if (options.having) {
          warnings.push('Cassandra no soporta la cláusula HAVING.');
        }
        if (options.orderBy && !options.clusteringColumn) {
          warnings.push('Cassandra solo permite ORDER BY en columnas que sean parte de la clave de clustering.');
        }
        break;
        
      case 'update':
      case 'delete':
        if (!options.where) {
          warnings.push(`Cassandra requiere una cláusula WHERE para operaciones ${operation.toUpperCase()}.`);
        }
        break;
        
      case 'index':
        if (options.multiple) {
          warnings.push('Cassandra tiene limitaciones con índices en múltiples columnas.');
        }
        if (options.unique) {
          warnings.push('Cassandra no soporta índices UNIQUE.');
        }
        break;
        
      case 'view':
        warnings.push('Las vistas materializadas en Cassandra tienen requisitos específicos.');
        warnings.push('Deben incluir todas las columnas de la clave primaria de la tabla base.');
        break;
    }
    
    return warnings;
  }
}