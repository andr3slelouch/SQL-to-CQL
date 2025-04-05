// src/sql-translator/services/validation.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  /**
   * Valida si una sentencia SQL es compatible con las capacidades de traducción a CQL
   * @param ast AST generado por el parser SQL
   * @returns Objeto con el resultado de la validación
   */
  validateSqlAst(ast: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Si es un array de sentencias, validar cada una
    if (Array.isArray(ast)) {
      const statements = ast;
      
      if (statements.length > 1) {
        errors.push('Cassandra no soporta la ejecución de múltiples sentencias en una sola consulta');
      }
      
      for (const statement of statements) {
        const result = this.validateStatement(statement);
        errors.push(...result.errors);
      }
    } else {
      // Si es una sola sentencia
      const result = this.validateStatement(ast);
      errors.push(...result.errors);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Valida una sentencia SQL individual
   * @param statement Sentencia SQL (AST)
   * @returns Objeto con el resultado de la validación
   */
  private validateStatement(statement: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    switch (statement.type) {
      case 'select':
        this.validateSelectStatement(statement, errors);
        break;
      case 'insert':
        this.validateInsertStatement(statement, errors);
        break;
      case 'update':
        this.validateUpdateStatement(statement, errors);
        break;
      case 'delete':
        this.validateDeleteStatement(statement, errors);
        break;
      case 'create':
        if (statement.keyword === 'table') {
          this.validateCreateTableStatement(statement, errors);
        } else if (statement.keyword === 'database') {
          this.validateCreateDatabaseStatement(statement, errors);
        } else if (statement.keyword === 'index') {
          this.validateCreateIndexStatement(statement, errors);
        } else if (statement.keyword === 'view') {
          this.validateCreateViewStatement(statement, errors);
        }
        break;
      case 'drop':
        // La mayoría de las operaciones DROP se traducen directamente
        break;
      case 'alter':
        if (statement.keyword === 'table') {
          this.validateAlterTableStatement(statement, errors);
        } else if (statement.keyword === 'database') {
          this.validateAlterDatabaseStatement(statement, errors);
        }
        break;
      case 'truncate':
        // TRUNCATE se traduce directamente
        break;
      case 'show':
        // SHOW se traduce a DESCRIBE en Cassandra
        break;
      default:
        errors.push(`Tipo de sentencia no soportada: ${statement.type}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Valida una sentencia SELECT
   * @param statement Sentencia SELECT (AST)
   * @param errors Array donde se acumularán los errores
   */
  private validateSelectStatement(statement: any, errors: string[]): void {
    // Verificar JOINs (Cassandra tiene limitaciones con JOINs)
    if (statement.from && Array.isArray(statement.from) && statement.from.length > 1) {
      const hasJoins = statement.from.some((item: any) => item.join);
      
      if (hasJoins) {
        errors.push('Cassandra no soporta JOINs de la misma manera que SQL. Considera rediseñar tu modelo de datos.');
      }
    }
    
    // Verificar funciones de agregación no soportadas
    if (statement.columns && Array.isArray(statement.columns)) {
      for (const col of statement.columns) {
        if (col.expr && col.expr.type === 'aggr_func') {
          const funcName = col.expr.name.toUpperCase();
          
          if (!['COUNT', 'MIN', 'MAX', 'SUM', 'AVG'].includes(funcName)) {
            errors.push(`Función de agregación no soportada: ${funcName}`);
          }
        }
      }
    }
    
    // Verificar cláusula GROUP BY (limitada en Cassandra)
    if (statement.groupby) {
      errors.push('Cassandra tiene soporte limitado para GROUP BY. Puede requerir ajustes en la traducción.');
    }
    
    // Verificar cláusula HAVING (no soportada directamente)
    if (statement.having) {
      errors.push('Cassandra no soporta la cláusula HAVING');
    }
  }
  
  /**
   * Valida una sentencia INSERT
   * @param statement Sentencia INSERT (AST)
   * @param errors Array donde se acumularán los errores
   */
  private validateInsertStatement(statement: any, errors: string[]): void {
    // Cassandra no soporta INSERT con subconsultas
    if (statement.values && statement.values.type === 'select') {
      errors.push('Cassandra no soporta INSERT con subconsultas');
    }
  }
  
  /**
   * Valida una sentencia UPDATE
   * @param statement Sentencia UPDATE (AST)
   * @param errors Array donde se acumularán los errores
   */
  private validateUpdateStatement(statement: any, errors: string[]): void {
    // Verificar que haya una cláusula WHERE
    if (!statement.where) {
      errors.push('Cassandra requiere una cláusula WHERE para operaciones UPDATE');
    }
    
    // Verificar si se está actualizando una clave primaria (no permitido en Cassandra)
    // Nota: Esto requeriría conocimiento del esquema, lo cual no tenemos aquí
  }
  
  /**
   * Valida una sentencia DELETE
   * @param statement Sentencia DELETE (AST)
   * @param errors Array donde se acumularán los errores
   */
  private validateDeleteStatement(statement: any, errors: string[]): void {
    // Verificar que haya una cláusula WHERE
    if (!statement.where) {
      errors.push('Cassandra requiere una cláusula WHERE para operaciones DELETE');
    }
  }
  
  /**
   * Valida una sentencia CREATE TABLE
   * @param statement Sentencia CREATE TABLE (AST)
   * @param errors Array donde se acumularán los errores
   */
  private validateCreateTableStatement(statement: any, errors: string[]): void {
    // Verificar que haya una clave primaria definida
    if (statement.create_definitions) {
      const hasPrimaryKey = statement.create_definitions.some(
        (def: any) => def.resource === 'constraint' && def.constraint_type === 'primary key'
      );
      
      if (!hasPrimaryKey) {
        errors.push('Cassandra requiere una clave primaria para cada tabla');
      }
    }
    
    // Verificar tipos de datos no soportados
    if (statement.create_definitions) {
      for (const def of statement.create_definitions) {
        if (def.resource === 'column' && def.definition && def.definition.dataType) {
          const dataType = def.definition.dataType.toUpperCase();
          
          // Lista no exhaustiva de tipos no soportados en Cassandra
          const unsupportedTypes = ['ENUM', 'SET', 'JSON', 'GEOMETRY', 'POINT', 'LINESTRING', 'POLYGON'];
          
          if (unsupportedTypes.includes(dataType)) {
            errors.push(`Tipo de datos no soportado: ${dataType}`);
          }
        }
      }
    }
  }
  
  /**
   * Valida una sentencia CREATE DATABASE
   * @param statement Sentencia CREATE DATABASE (AST)
   * @param errors Array donde se acumularán los errores
   */
  private validateCreateDatabaseStatement(statement: any, errors: string[]): void {
    // En Cassandra, los KEYSPACE requieren estrategia de replicación
    // Pero lo manejaremos en la traducción
  }
  
  /**
   * Valida una sentencia CREATE INDEX
   * @param statement Sentencia CREATE INDEX (AST)
   * @param errors Array donde se acumularán los errores
   */
  private validateCreateIndexStatement(statement: any, errors: string[]): void {
    // Cassandra tiene tipos específicos de índices
    // Pero podemos manejar la traducción básica
  }
  
  /**
   * Valida una sentencia CREATE VIEW
   * @param statement Sentencia CREATE VIEW (AST)
   * @param errors Array donde se acumularán los errores
   */
  private validateCreateViewStatement(statement: any, errors: string[]): void {
    // En Cassandra, las vistas materializadas tienen restricciones específicas
    // Pero manejaremos las básicas en la traducción
  }
  
  /**
   * Valida una sentencia ALTER TABLE
   * @param statement Sentencia ALTER TABLE (AST)
   * @param errors Array donde se acumularán los errores
   */
  private validateAlterTableStatement(statement: any, errors: string[]): void {
    // Cassandra no permite modificar la clave primaria una vez creada
    // Pero esto requeriría conocimiento del esquema actual
  }
  
  /**
   * Valida una sentencia ALTER DATABASE
   * @param statement Sentencia ALTER DATABASE (AST)
   * @param errors Array donde se acumularán los errores
   */
  private validateAlterDatabaseStatement(statement: any, errors: string[]): void {
    // Se traduce a ALTER KEYSPACE en Cassandra
  }
}