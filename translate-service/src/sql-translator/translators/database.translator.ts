// src/sql-translator/translators/database.translator.ts
import { Injectable, Logger } from '@nestjs/common';
import { Translator } from '../interfaces/translator.interface';

@Injectable()
export class DatabaseTranslator implements Translator {
  private readonly logger = new Logger(DatabaseTranslator.name);

  /**
   * Verifica si este traductor puede manejar el AST proporcionado
   * @param ast AST de la sentencia SQL
   * @returns true si puede manejar el AST, false en caso contrario
   */
  canHandle(ast: any): boolean {
    if (!ast) return false;
    
    // Operaciones de base de datos - MODIFICADO para soportar más variantes
    const result = (
      (ast.type === 'create' && (ast.keyword === 'database' || ast.keyword === 'schema' || ast.keyword === 'keyspace')) ||
      (ast.type === 'alter' && (ast.keyword === 'database' || ast.keyword === 'schema' || ast.keyword === 'keyspace')) ||
      (ast.type === 'drop' && (ast.keyword === 'database' || ast.keyword === 'schema' || ast.keyword === 'keyspace')) ||
      // Añadir soporte para SHOW DATABASES con diferentes posibles estructuras
      (ast.type === 'show' && (ast.keyword === 'databases' || ast.keyword === 'schemas')) ||
      (ast.type === 'show' && (ast.target === 'databases' || ast.target === 'schemas')) ||
      (ast.type === 'show' && (ast.table === 'databases' || ast.table === 'schemas')) ||
      // Soporte para DESCRIBE KEYSPACES/DATABASES
      (ast.type === 'desc' && (ast.table === 'databases' || ast.table === 'schemas' || ast.table === 'keyspaces')) ||
      (ast.type === 'describe' && (ast.table === 'databases' || ast.table === 'schemas' || ast.table === 'keyspaces')) ||
      // Para sentencias USE DATABASE/KEYSPACE
      (ast.type === 'use')
    );
    
    // Añadir log para depuración
    if (result) {
      this.logger.log(`DatabaseTranslator puede manejar AST: ${JSON.stringify(ast)}`);
    }
    
    return result;
  }

  /**
   * Traduce un AST de operación de base de datos a CQL
   * @param ast AST de la sentencia SQL
   * @returns Sentencia CQL equivalente
   */
  translate(ast: any): string | null {
    if (!this.canHandle(ast)) {
      return null;
    }
    
    try {
      // Verificar si la sentencia SQL original está disponible para más contexto
      const sqlOriginal = ast.sourceText ? ast.sourceText.toUpperCase() : '';
      
      switch (ast.type) {
        case 'create':
          return this.translateCreateDatabase(ast);
        case 'alter':
          return this.translateAlterDatabase(ast);
        case 'drop':
          return this.translateDropDatabase(ast);
        case 'show':
          // SHOW DATABASES/SCHEMAS -> DESCRIBE KEYSPACES
          if (ast.keyword === 'databases' || 
              ast.keyword === 'schemas' || 
              ast.target === 'databases' || 
              ast.target === 'schemas' || 
              ast.table === 'databases' || 
              ast.table === 'schemas' ||
              sqlOriginal.includes('SHOW DATABASES') ||
              sqlOriginal.includes('SHOW SCHEMAS')) {
            this.logger.log(`Traduciendo SHOW DATABASES/SCHEMAS a DESCRIBE KEYSPACES`);
            return this.translateShowDatabases(ast);
          }
          // Añadir un return por defecto para asegurar que siempre haya un valor de retorno
          return this.createErrorComment(`Operación no soportada: ${ast.type} ${ast.keyword || ast.table || ''}`);
        case 'desc':
        case 'describe':
          // DESC/DESCRIBE KEYSPACES/DATABASES -> DESCRIBE KEYSPACES
          if (ast.table === 'databases' || 
              ast.table === 'schemas' || 
              ast.table === 'keyspaces' ||
              sqlOriginal.includes('DESC KEYSPACES') ||
              sqlOriginal.includes('DESCRIBE KEYSPACES') ||
              sqlOriginal.includes('DESC DATABASES') ||
              sqlOriginal.includes('DESCRIBE DATABASES') ||
              sqlOriginal.includes('DESC SCHEMAS') ||
              sqlOriginal.includes('DESCRIBE SCHEMAS')) {
            this.logger.log(`Traduciendo DESC/DESCRIBE KEYSPACES/DATABASES a DESCRIBE KEYSPACES`);
            return 'DESCRIBE KEYSPACES';
          }
          // Añadir un return por defecto para asegurar que siempre haya un valor de retorno
          return this.createErrorComment(`Operación no soportada: ${ast.type} ${ast.keyword || ast.table || ''}`);
        case 'use':
          return this.translateUseDatabase(ast);
        default:
          return this.createErrorComment(`Tipo de operación no soportado: ${ast.type}`);
      }
    } catch (error: any) {
      this.logger.error(`Error al traducir operación de base de datos: ${error.message}`);
      return this.createErrorComment(error.message);
    }
  }
  
  /**
   * 
   * @param errorMessage Mensaje de error
   * @returns Comentario SQL
   */
  private createErrorComment(errorMessage: string): string {
    return `-- Error en la traducción de operación de base de datos: ${errorMessage}`;
  }
  
  /**
   * Traduce una sentencia CREATE DATABASE a CREATE KEYSPACE
   * @param ast AST de la sentencia CREATE DATABASE
   * @returns Sentencia CQL equivalente
   */
  private translateCreateDatabase(ast: any): string {
    this.logger.debug(`Traduciendo CREATE DATABASE. AST: ${JSON.stringify(ast)}`);
    
    let databaseName: string | null = null;
    
    // Estructura específica: ast.database.schema[0].value
    if (ast.database && 
        ast.database.schema && 
        Array.isArray(ast.database.schema) && 
        ast.database.schema.length > 0 &&
        ast.database.schema[0].type === 'default' &&
        ast.database.schema[0].value) {
      
      databaseName = ast.database.schema[0].value;
    }
    
    if (!databaseName) {
      throw new Error(`No se pudo encontrar el nombre de la base de datos en el AST: ${JSON.stringify(ast)}`);
    }
    
    // Verificar IF NOT EXISTS
    const ifNotExists = ast.if_not_exists ? 'IF NOT EXISTS ' : '';
    
    // En Cassandra, se requiere especificar la estrategia de replicación
    return `CREATE KEYSPACE ${ifNotExists}${databaseName} WITH REPLICATION = {'class': 'SimpleStrategy', 'replication_factor': 1}`;
  }
  
  /**
   * Traduce una sentencia ALTER DATABASE a ALTER KEYSPACE
   * @param ast AST de la sentencia ALTER DATABASE
   * @returns Sentencia CQL equivalente
   */
  private translateAlterDatabase(ast: any): string {
    let databaseName: string | null = null;
    
    // Intentar extraer el nombre de la base de datos usando la misma estructura que en CREATE DATABASE
    if (ast.database && 
        ast.database.schema && 
        Array.isArray(ast.database.schema) && 
        ast.database.schema.length > 0 &&
        ast.database.schema[0].type === 'default' &&
        ast.database.schema[0].value) {
      
      databaseName = ast.database.schema[0].value;
    }
    
    if (!databaseName) {
      throw new Error('No se encontró un nombre de base de datos válido');
    }
    
    // En Cassandra, normalmente se altera la estrategia de replicación
    return `ALTER KEYSPACE ${databaseName} WITH REPLICATION = {'class': 'SimpleStrategy', 'replication_factor': 1}`;
  }
  
  /**
   * Traduce una sentencia DROP DATABASE a DROP KEYSPACE
   * @param ast AST de la sentencia DROP DATABASE
   * @returns Sentencia CQL equivalente
   */
  private translateDropDatabase(ast: any): string {
    this.logger.debug(`Traduciendo DROP DATABASE. AST: ${JSON.stringify(ast)}`);
    
    // El nombre en DROP DATABASE está directamente en la propiedad 'name'
    if (!ast.name) {
      throw new Error('No se encontró un nombre de base de datos válido');
    }
    
    let databaseName: string;
    
    // Extraer el nombre según la estructura
    if (typeof ast.name === 'string') {
      databaseName = ast.name;
    } else {
      throw new Error('Formato de nombre de base de datos no reconocido');
    }
    
    // Verificar si hay una cláusula IF EXISTS
    const prefix = ast.prefix || '';
    const ifExists = prefix.toLowerCase() === 'if exists' ? 'IF EXISTS ' : '';
    
    return `DROP KEYSPACE ${ifExists}${databaseName}`;
  }
  
  /**
   * Traduce una sentencia SHOW DATABASES a DESCRIBE KEYSPACES
   * @param ast AST de la sentencia SHOW DATABASES
   * @returns Sentencia CQL equivalente
   */
  private translateShowDatabases(ast: any): string {
    this.logger.log('Traduciendo SHOW DATABASES/SCHEMAS a DESCRIBE KEYSPACES');
    return 'DESCRIBE KEYSPACES';
  }
  
  /**
   * Traduce una sentencia USE DATABASE a USE KEYSPACE
   * @param ast AST de la sentencia USE DATABASE
   * @returns Sentencia CQL equivalente
   */
  private translateUseDatabase(ast: any): string {
    this.logger.debug(`Traduciendo USE DATABASE. AST: ${JSON.stringify(ast)}`);
    
    // Verificar si ast.db existe, que es donde suele estar el nombre en USE
    if (!ast.db) {
      throw new Error('No se encontró un nombre de base de datos válido');
    }
    
    // En el caso de USE, normalmente el nombre está directamente en db
    const databaseName = ast.db;
    
    return `USE ${databaseName}`;
  }
}