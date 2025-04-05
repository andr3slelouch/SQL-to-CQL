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
      
      // Realizar el análisis sintáctico para obtener el AST
      const ast = this.parser.astify(sqlQuery);
      
      // Determinar el tipo de consulta
      const type = this.determineQueryType(ast);
      
      return {
        success: true,
        ast,
        type
      };
    } catch (error) {
      this.logger.error(`Error al analizar consulta SQL: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
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