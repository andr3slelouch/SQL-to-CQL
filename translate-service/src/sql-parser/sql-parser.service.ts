// src/sql-parser/sql-parser.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Parser } from 'node-sql-parser';

export interface SqlParseResult {
  success: boolean;
  ast?: any;
  type?: string;
  error?: string;
}

@Injectable()
export class SqlParserService {
  private readonly logger = new Logger(SqlParserService.name);
  private parser: Parser;
  
  constructor() {
    this.parser = new Parser();
    this.logger.log('Servicio de análisis SQL inicializado');
  }

  /**
   * Analiza una sentencia SQL y devuelve el AST (Abstract Syntax Tree)
   * @param sqlQuery Sentencia SQL a analizar
   * @returns Resultado del análisis con el AST si es exitoso
   */
  parseSQL(sqlQuery: string): SqlParseResult {
    try {
      this.logger.debug(`Analizando consulta SQL: ${sqlQuery}`);
      
      // Preprocesar la consulta SQL para manejar casos especiales
      const processedQuery = this.preprocessQuery(sqlQuery);
      if (processedQuery !== sqlQuery) {
        this.logger.debug(`Consulta SQL preprocesada: ${processedQuery}`);
      }
      
      // Realizar el análisis sintáctico para obtener el AST
      const ast = this.parser.astify(processedQuery);
      
      // Si es un DROP INDEX de Cassandra, marcar el AST para que el traductor lo reconozca
      if (this.isCassandraDropIndex(sqlQuery)) {
        this.markAsCassandraDropIndex(ast, sqlQuery);
      }
      
      // Determinar el tipo de consulta
      const type = this.determineQueryType(ast);
      
      return {
        success: true,
        ast,
        type
      };
    } catch (error) {
      // Intentar manejo especial para DROP INDEX si falla el parsing normal
      if (this.isCassandraDropIndex(sqlQuery)) {
        try {
          const specialAst = this.createSpecialDropIndexAst(sqlQuery);
          this.logger.debug(`Creado AST especial para DROP INDEX: ${JSON.stringify(specialAst)}`);
          return {
            success: true,
            ast: specialAst,
            type: 'drop'
          };
        } catch (specialError) {
          this.logger.error(`Error al crear AST especial para DROP INDEX: ${specialError.message}`);
        }
      }
      
      this.logger.error(`Error al analizar consulta SQL: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Preprocesa la consulta SQL para manejar casos especiales como DROP INDEX en Cassandra
   * @param query Consulta SQL original
   * @returns Consulta SQL procesada lista para el parser
   */
  private preprocessQuery(query: string): string {
    const trimmedQuery = query.trim();
    const upperQuery = trimmedQuery.toUpperCase();
    
    // Caso especial: DROP INDEX en Cassandra
    if (this.isCassandraDropIndex(trimmedQuery)) {
      // Extraer el nombre del índice y si hay IF EXISTS
      const dropIndexRegex = /DROP\s+INDEX\s+(IF\s+EXISTS\s+)?([^\s;]+)/i;
      const matches = trimmedQuery.match(dropIndexRegex);
      
      if (matches && matches[2]) {
        const ifExists = matches[1] || '';
        const indexName = matches[2];
        
        // Convertir a formato compatible con el parser SQL estándar
        return `DROP INDEX ${ifExists}${indexName} ON dummy_table`;
      }
    }
    
    return trimmedQuery;
  }

  /**
   * Verifica si la consulta es un DROP INDEX de Cassandra
   * @param query Consulta SQL
   * @returns true si es un DROP INDEX de Cassandra
   */
  private isCassandraDropIndex(query: string): boolean {
    const upperQuery = query.trim().toUpperCase();
    return upperQuery.startsWith('DROP INDEX') && !upperQuery.includes(' ON ');
  }

  /**
   * Marca un AST como DROP INDEX de Cassandra para que el traductor lo reconozca
   * @param ast AST a marcar
   * @param originalQuery Consulta original
   */
  private markAsCassandraDropIndex(ast: any, originalQuery: string): void {
    if (Array.isArray(ast)) {
      ast.forEach(item => {
        if (item.type === 'drop') {
          item.cassandra_drop_index = true;
          
          // Extraer el nombre real del índice de la consulta original
          const matches = originalQuery.match(/DROP\s+INDEX\s+(IF\s+EXISTS\s+)?([^\s;]+)/i);
          if (matches && matches[2]) {
            item.real_index_name = matches[2];
            item.if_exists = !!matches[1];
          }
        }
      });
    } else if (ast.type === 'drop') {
      ast.cassandra_drop_index = true;
      
      // Extraer el nombre real del índice de la consulta original
      const matches = originalQuery.match(/DROP\s+INDEX\s+(IF\s+EXISTS\s+)?([^\s;]+)/i);
      if (matches && matches[2]) {
        ast.real_index_name = matches[2];
        ast.if_exists = !!matches[1];
      }
    }
  }

  /**
   * Crea un AST especial para DROP INDEX de Cassandra cuando el parser normal falla
   * @param query Consulta DROP INDEX original
   * @returns AST especial para DROP INDEX
   */
  private createSpecialDropIndexAst(query: string): any {
    // Extraer el nombre del índice y si hay IF EXISTS
    const matches = query.match(/DROP\s+INDEX\s+(IF\s+EXISTS\s+)?([^\s;]+)/i);
    if (!matches || !matches[2]) {
      throw new Error('No se pudo extraer el nombre del índice de la consulta DROP INDEX');
    }
    
    const ifExists = !!matches[1];
    const indexName = matches[2];
    
    // Crear un AST con la estructura necesaria para IndexTranslator
    return {
      type: 'drop',
      keyword: 'index',
      cassandra_drop_index: true,
      name: indexName,
      if_exists: ifExists,
      real_index_name: indexName
    };
  }

  /**
   * Determina el tipo de consulta SQL
   * @param ast AST de la consulta SQL
   * @returns Tipo de consulta (SELECT, INSERT, UPDATE, DELETE, etc.)
   */
  private determineQueryType(ast: any): string {
    // Si ast es un array, tomamos el primer elemento
    const statement = Array.isArray(ast) ? ast[0] : ast;
    return statement.type;
  }
  
  /**
   * Genera una representación SQL a partir de un AST
   * @param ast AST de la sentencia SQL
   * @returns Sentencia SQL generada
   */
  toSQL(ast: any): string {
    try {
      // La función toSQL de node-sql-parser convierte el AST de nuevo a SQL
      return this.parser.sqlify(ast);
    } catch (error) {
      this.logger.error(`Error al convertir AST a SQL: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Método para inspeccionar la estructura del AST
   * @param ast AST a inspeccionar
   * @returns Información sobre la estructura del AST
   */
  inspectAst(ast: any): any {
    const inspectResult: any = {
      type: null,
      structure: {},
      keys: []
    };
    
    if (!ast) return inspectResult;
    
    // Si es un array, tomamos el primer elemento para la inspección
    const statement = Array.isArray(ast) ? ast[0] : ast;
    
    inspectResult.type = statement.type;
    inspectResult.keys = Object.keys(statement);
    
    // Analizar la estructura básica según el tipo de declaración
    switch (statement.type) {
      case 'select':
        inspectResult.structure = {
          columns: statement.columns,
          from: statement.from,
          where: statement.where,
          groupby: statement.groupby,
          having: statement.having,
          orderby: statement.orderby,
          limit: statement.limit,
        };
        break;
      case 'insert':
        inspectResult.structure = {
          table: statement.table,
          columns: statement.columns,
          values: statement.values,
        };
        break;
      case 'update':
        inspectResult.structure = {
          table: statement.table,
          set: statement.set,
          where: statement.where,
        };
        break;
      case 'delete':
        inspectResult.structure = {
          table: statement.from,
          where: statement.where,
        };
        break;
      case 'create':
        inspectResult.structure = {
          keyword: statement.keyword,
          table: statement.table,
          definitions: statement.create_definitions
        };
        break;
      default:
        inspectResult.structure = statement;
    }
    
    return inspectResult;
  }
}