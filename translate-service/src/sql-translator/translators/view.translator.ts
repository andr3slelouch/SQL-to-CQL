// src/sql-translator/translators/view.translator.ts
import { Injectable, Logger } from '@nestjs/common';
import { Translator } from '../interfaces/translator.interface';

@Injectable()
export class ViewTranslator implements Translator {
  private readonly logger = new Logger(ViewTranslator.name);

  /**
   * Verifica si este traductor puede manejar el AST proporcionado
   * @param ast AST de la sentencia SQL
   * @returns true si puede manejar el AST, false en caso contrario
   */
  canHandle(ast: any): boolean {
    if (!ast) return false;
    
    // Operaciones de vista
    return (
      (ast.type === 'create' && ast.keyword === 'view') ||
      (ast.type === 'drop' && ast.keyword === 'view')
    );
  }

  /**
   * Traduce un AST de operación de vista a CQL
   * @param ast AST de la sentencia SQL
   * @returns Sentencia CQL equivalente
   */
  translate(ast: any): string | null {
    if (!this.canHandle(ast)) {
      return null;
    }
    
    try {
      switch (ast.type) {
        case 'create':
          return this.translateCreateView(ast);
        case 'drop':
          return this.translateDropView(ast);
        default:
          return this.createErrorComment(`Tipo de operación no soportado: ${ast.type}`);
      }
    } catch (error: any) {
      this.logger.error(`Error al traducir operación de vista: ${error.message}`);
      return this.createErrorComment(error.message);
    }
  }

  /**
   * Crea un comentario para errores
   * @param errorMessage Mensaje de error
   * @returns Comentario SQL
   */
  private createErrorComment(errorMessage: string): string {
    return `-- Error en la traducción de vista materializada: ${errorMessage}`;
  }
  
  /**
   * Traduce una sentencia CREATE VIEW a CREATE MATERIALIZED VIEW de Cassandra
   * @param ast AST de la sentencia CREATE VIEW
   * @returns Sentencia CQL equivalente
   */
  private translateCreateView(ast: any): string {
    // Extraer componentes de la sentencia CREATE VIEW
    if (!ast.view) {
      return this.createErrorComment('No se encontró un nombre de vista válido');
    }
    
    const viewName = typeof ast.view === 'string' ? ast.view : 
                    (ast.view.view || ast.view.name || ast.view.value || 
                    JSON.stringify(ast.view).replace(/["{}]/g, ''));
    
    const dbName = ast.view.db || null;
    
    // Manejar OR REPLACE
    const orReplace = ast.replace === 'or replace';
    const ifNotExists = ast.if_not_exists ? 'IF NOT EXISTS ' : '';
    
    // No se puede usar OR REPLACE e IF NOT EXISTS juntos en Cassandra
    if (orReplace && ifNotExists) {
      this.logger.warn('En Cassandra no se puede usar OR REPLACE e IF NOT EXISTS juntos. Se usará IF NOT EXISTS.');
    }
    
    // La definición de una vista en SQL es una consulta SELECT
    if (!ast.select || ast.select.type !== 'select') {
      return this.createErrorComment('No se encontró una consulta SELECT válida para la vista');
    }
    
    const selectAst = ast.select;
    
    // Extraer componentes de la consulta SELECT
    const baseTable = this.extractBaseTable(selectAst);
    
    if (!baseTable) {
      return this.createErrorComment('No se encontró una tabla base válida para la vista');
    }
    
  
    
    const columns = this.extractColumns(selectAst);
    const whereClause = selectAst.where ? this.formatWhereExpression(selectAst.where) : 'status is not null';
    
    // Para la clave primaria, usaremos una columna que probablemente exista en la WHERE
    // En un caso real, necesitaríamos conocer el esquema de la tabla
    const primaryKey = this.extractPrimaryKeyFromWhere(selectAst);
    
    // Construir la sentencia CQL para CREATE MATERIALIZED VIEW
    const fullViewName = `${dbName ? dbName + '.' : ''}${viewName}`;
    
    let cql = `CREATE MATERIALIZED VIEW ${ifNotExists}${fullViewName} AS\n`;
    cql += `  SELECT ${columns}\n`;
    cql += `  FROM ${baseTable}\n`;
    cql += `  WHERE ${whereClause}\n`;
    cql += `  PRIMARY KEY (${primaryKey})`;
    
    return cql;
  }
  
  /**
   * Traduce una sentencia DROP VIEW a DROP MATERIALIZED VIEW de Cassandra
   * @param ast AST de la sentencia DROP VIEW
   * @returns Sentencia CQL equivalente
   */
  private translateDropView(ast: any): string {
    // Extraer componentes de la sentencia DROP VIEW
    if (!ast.name) {
      return this.createErrorComment('No se encontró un nombre de vista válido');
    }
    
    const viewName = typeof ast.name === 'string' ? ast.name : 
                    (ast.name.name || ast.name.value || 
                    JSON.stringify(ast.name).replace(/["{}]/g, ''));
    
    const ifExists = ast.if_exists ? 'IF EXISTS ' : '';
    
    return `DROP MATERIALIZED VIEW ${ifExists}${viewName}`;
  }
  
  /**
   * Extrae la tabla base de la consulta SELECT
   * @param selectAst AST de la consulta SELECT
   * @returns Nombre de la tabla base o null si no se encuentra
   */
  private extractBaseTable(selectAst: any): string | null {
    if (!selectAst.from || !Array.isArray(selectAst.from) || selectAst.from.length === 0) {
      return null;
    }
    
    const firstTable = selectAst.from[0];
    if (!firstTable || !firstTable.table) {
      return null;
    }
    
    return firstTable.table;
  }
  
  /**
   * Extrae las columnas de la consulta SELECT
   * @param selectAst AST de la consulta SELECT
   * @returns Lista de columnas formateada
   */
  private extractColumns(selectAst: any): string {
    // Si vemos SELECT *, lo dejamos como está
    if (selectAst.columns && Array.isArray(selectAst.columns) && 
        selectAst.columns.length === 1 && 
        selectAst.columns[0].expr && 
        selectAst.columns[0].expr.column === '*') {
      return '*';
    }
    
    const columnStrings: string[] = [];
    
    if (Array.isArray(selectAst.columns)) {
      for (const col of selectAst.columns) {
        if (col.expr && col.expr.type === 'column_ref') {
          // Columna simple
          const columnName = col.expr.column;
          const tableName = col.expr.table;
          
          const columnStr = tableName ? `${tableName}.${columnName}` : columnName;
          columnStrings.push(columnStr);
        }
      }
    }
    
    return columnStrings.length > 0 ? columnStrings.join(', ') : '*';
  }
  
  /**
   * Extrae una clave primaria de la cláusula WHERE para la vista materializada
   * @param selectAst AST de la consulta SELECT
   * @returns Clave primaria basada en la cláusula WHERE
   */
  private extractPrimaryKeyFromWhere(selectAst: any): string {
    if (selectAst.where && selectAst.where.type === 'binary_expr' && 
        selectAst.where.operator === '=' && 
        selectAst.where.left && selectAst.where.left.type === 'column_ref') {
      
      // Usar la columna de la condición WHERE como parte de la clave primaria
      return selectAst.where.left.column;
    }
    
    // Si no podemos extraer de WHERE, usar id como fallback
    return 'id';
  }
  
  /**
   * Formatea una expresión WHERE
   * @param expr Expresión WHERE
   * @returns Expresión WHERE formateada
   */
  private formatWhereExpression(expr: any): string {
    if (!expr) return '';
    
    try {
      if (expr.type === 'binary_expr') {
        // Operador binario (AND, OR, =, >, <, etc.)
        const left = this.formatWhereOperand(expr.left);
        const right = this.formatWhereOperand(expr.right);
        
        return `${left} ${expr.operator} ${right}`;
      } else {
        return this.formatWhereOperand(expr);
      }
    } catch (error) {
      this.logger.warn(`Error al formatear expresión WHERE: ${error}`);
      return '';
    }
  }
  
  /**
   * Formatea un operando de la expresión WHERE
   * @param operand Operando
   * @returns Operando formateado
   */
  private formatWhereOperand(operand: any): string {
    if (!operand) return '';
    
    try {
      if (operand.type === 'column_ref') {
        // Referencia a columna
        return operand.table ? `${operand.table}.${operand.column}` : operand.column;
      } else if (operand.type === 'number') {
        // Valor numérico
        return operand.value.toString();
      } else if (operand.type === 'string' || operand.type === 'single_quote_string') {
        // Cadena literal
        return `'${operand.value}'`;
      } else if (operand.type === 'double_quote_string') {
        // Cadena con comillas dobles - convertir a comillas simples para CQL
        return `'${operand.value}'`;
      } else if (operand.type === 'bool') {
        // Valor booleano
        return operand.value.toString().toUpperCase();
      } else if (operand.type === 'null') {
        // Valor nulo
        return 'NULL';
      } else if (operand.type === 'binary_expr') {
        // Expresión binaria anidada
        return `(${this.formatWhereExpression(operand)})`;
      } else {
        // Caso genérico
        if (typeof operand === 'object' && operand !== null) {
          // Convertir objeto a string para evitar [object Object]
          return `'${JSON.stringify(operand)}'`;
        }
        return String(operand);
      }
    } catch (error) {
      this.logger.warn(`Error al formatear operando WHERE: ${error}`);
      return '';
    }
  }
}