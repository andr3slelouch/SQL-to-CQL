// src/sql-translator/translators/select.translator.ts
import { Injectable, Logger } from '@nestjs/common';
import { Translator } from '../interfaces/translator.interface';

@Injectable()
export class SelectTranslator implements Translator {
  private readonly logger = new Logger(SelectTranslator.name);

  /**
   * Verifica si este traductor puede manejar el AST proporcionado
   * @param ast AST de la sentencia SQL
   * @returns true si puede manejar el AST, false en caso contrario
   */
  canHandle(ast: any): boolean {
    return ast && ast.type === 'select';
  }

  /**
   * Traduce un AST de sentencia SELECT a CQL
   * @param ast AST de la sentencia SQL
   * @returns Sentencia CQL equivalente
   */
  translate(ast: any): string | null {
    if (!this.canHandle(ast)) {
      return null;
    }
    
    try {
      // Extraer componentes de la consulta SELECT
      const columns = this.translateColumns(ast.columns);
      const from = this.translateFrom(ast.from);
      const where = ast.where ? this.translateWhere(ast.where) : '';
      const orderBy = ast.orderby ? this.translateOrderBy(ast.orderby) : '';
      const limit = ast.limit ? this.translateLimit(ast.limit) : '';
      
      // Verificar si hay elementos no soportados en Cassandra
      this.checkUnsupportedFeatures(ast);
      
      // Construir la consulta CQL
      let cql = `SELECT ${columns} FROM ${from}`;
      
      if (where) {
        cql += ` WHERE ${where}`;
      }
      
      if (orderBy) {
        cql += ` ORDER BY ${orderBy}`;
      }
      
      if (limit) {
        cql += ` ${limit}`;
      }
      
      return cql;
    } catch (error: any) {
      this.logger.error(`Error al traducir SELECT: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Traduce la lista de columnas de una sentencia SELECT
   * @param columns Lista de columnas del AST
   * @returns Cadena con la lista de columnas para CQL
   */
  private translateColumns(columns: any): string {
    // Si es un asterisco (*), devolver directamente
    if (columns === '*') {
      return '*';
    }
    
    // Procesar cada columna
    const columnStrings: string[] = [];
    
    for (const col of columns) {
      if (col.expr && col.expr.type === 'column_ref') {
        // Columna simple
        const columnName = col.expr.column;
        const tableName = col.expr.table;
        const alias = col.as ? ` AS ${col.as}` : '';
        
        const columnStr = tableName ? `${tableName}.${columnName}${alias}` : `${columnName}${alias}`;
        columnStrings.push(columnStr);
      } else if (col.expr && col.expr.type === 'aggr_func') {
        // Función de agregación
        const funcName = col.expr.name;
        let args = '';
        
        if (col.expr.args && col.expr.args.expr) {
          if (col.expr.args.expr.type === 'star') {
            args = '*';
          } else if (col.expr.args.expr.type === 'column_ref') {
            const columnRef = col.expr.args.expr;
            args = columnRef.table ? `${columnRef.table}.${columnRef.column}` : columnRef.column;
          }
        }
        
        const alias = col.as ? ` AS ${col.as}` : '';
        columnStrings.push(`${funcName}(${args})${alias}`);
      } else {
        // Otros tipos de expresiones
        this.logger.warn(`Tipo de expresión no soportado en columna: ${col.expr?.type || 'unknown'}`);
      }
    }
    
    return columnStrings.join(', ') || '*';
  }
  
  /**
   * Traduce la cláusula FROM de una sentencia SELECT
   * @param from Cláusula FROM del AST
   * @returns Cadena con la cláusula FROM para CQL
   */
  private translateFrom(from: any[]): string {
    // Cassandra no soporta JOINs de la misma manera que SQL
    // Si hay múltiples tablas, emitir una advertencia
    if (from.length > 1) {
      const hasJoins = from.some(item => item.join);
      
      if (hasJoins) {
        this.logger.warn('Cassandra no soporta JOINs directamente. Solo se utilizará la primera tabla.');
      }
    }
    
    // Usar solo la primera tabla
    const firstTable = from[0];
    const tableName = firstTable.table;
    const alias = firstTable.as ? ` ${firstTable.as}` : '';
    
    return `${tableName}${alias}`;
  }
  
  /**
   * Traduce la cláusula WHERE de una sentencia SELECT
   * @param where Cláusula WHERE del AST
   * @returns Cadena con la cláusula WHERE para CQL
   */
  private translateWhere(where: any): string {
    if (!where) return '';
    
    // Para evitar problemas con tipos complejos, usamos un enfoque simplificado
    try {
      if (where.type === 'binary_expr') {
        const left = this.simplifyExpression(where.left);
        const right = this.simplifyExpression(where.right);
        const operator = where.operator;
        
        if (operator === 'AND' || operator === 'OR') {
          return `${this.translateWhere(where.left)} ${operator} ${this.translateWhere(where.right)}`;
        } else {
          return `${left} ${operator} ${right}`;
        }
      } else {
        return this.simplifyExpression(where);
      }
    } catch (error: any) {
      this.logger.warn(`Error al traducir cláusula WHERE: ${error.message}`);
      return '';
    }
  }
  
  /**
   * Simplifica una expresión a su representación en cadena
   * @param expr Expresión a simplificar
   * @returns Representación en cadena de la expresión
   */
  private simplifyExpression(expr: any): string {
    if (!expr) return '';
    
    try {
      if (typeof expr === 'string') {
        return expr;
      } else if (typeof expr === 'number' || typeof expr === 'boolean') {
        return String(expr);
      } else if (expr.type === 'column_ref') {
        return expr.table ? `${expr.table}.${expr.column}` : expr.column;
      } else if (expr.type === 'string' || expr.type === 'single_quote_string') {
        return `'${expr.value}'`;
      } else if (expr.type === 'number') {
        return String(expr.value);
      } else if (expr.type === 'bool') {
        return String(expr.value).toUpperCase();
      } else if (expr.type === 'null') {
        return 'NULL';
      } else if (expr.type === 'binary_expr') {
        const left = this.simplifyExpression(expr.left);
        const right = this.simplifyExpression(expr.right);
        return `(${left} ${expr.operator} ${right})`;
      } else if (expr.type === 'function') {
        let args = '';
        if (expr.args) {
          if (Array.isArray(expr.args)) {
            args = expr.args.map((arg: any) => this.simplifyExpression(arg)).join(', ');
          } else if (expr.args.expr) {
            args = this.simplifyExpression(expr.args.expr);
          }
        }
        return `${expr.name}(${args})`;
      } else if (expr.type === 'expr_list') {
        if (expr.value && Array.isArray(expr.value)) {
          return expr.value.map((val: any) => this.simplifyExpression(val)).join(', ');
        }
      }
      
      // Fallback para objetos desconocidos
      return JSON.stringify(expr);
    } catch (error: any) {
      this.logger.warn(`Error al simplificar expresión: ${error.message}`);
      return '';
    }
  }
  
  /**
   * Traduce la cláusula ORDER BY de una sentencia SELECT
   * @param orderby Cláusula ORDER BY del AST
   * @returns Cadena con la cláusula ORDER BY para CQL
   */
  private translateOrderBy(orderby: any[]): string {
    // Cassandra solo permite ORDER BY en columnas que sean parte de la clave de clustering
    // No podemos validar eso aquí sin conocer el esquema, pero podemos traducir la sintaxis
    
    const orderByItems: string[] = [];
    
    for (const item of orderby) {
      if (item.expr && item.expr.column) {
        const column = item.expr.column;
        const direction = item.type ? item.type.toUpperCase() : 'ASC'; // ASC o DESC
        
        orderByItems.push(`${column} ${direction}`);
      }
    }
    
    return orderByItems.join(', ');
  }
  
  /**
   * Traduce la cláusula LIMIT de una sentencia SELECT
   * @param limit Cláusula LIMIT del AST
   * @returns Cadena con la cláusula LIMIT para CQL
   */
  private translateLimit(limit: any): string {
    // Utilizar un enfoque más simple para extraer el valor
    let limitValue = 100; // Valor predeterminado
    
    try {
      if (limit.value) {
        if (Array.isArray(limit.value) && limit.value.length > 0) {
          if (limit.value[0].value !== undefined) {
            limitValue = limit.value[0].value;
          } else {
            limitValue = limit.value[0];
          }
        } else if (typeof limit.value === 'object' && limit.value !== null) {
          if (limit.value.value !== undefined) {
            limitValue = limit.value.value;
          }
        } else {
          limitValue = limit.value;
        }
      }
    } catch (error: any) {
      this.logger.warn(`Error al extraer valor de LIMIT: ${error.message}`);
    }
    
    // Cassandra no soporta OFFSET directamente
    if (limit.offset) {
      this.logger.warn('Cassandra no soporta OFFSET directamente');
    }
    
    return `LIMIT ${limitValue}`;
  }
  
  /**
   * Verifica si hay características no soportadas por Cassandra
   * @param ast AST de la sentencia SELECT
   */
  private checkUnsupportedFeatures(ast: any): void {
    // GROUP BY - No soportado directamente en Cassandra
    if (ast.groupby) {
      this.logger.warn('Cassandra no soporta GROUP BY directamente. La consulta no se traducirá correctamente.');
    }
    
    // HAVING - No soportado directamente en Cassandra
    if (ast.having) {
      this.logger.warn('Cassandra no soporta HAVING directamente. La consulta no se traducirá correctamente.');
    }
    
    // UNION/INTERSECT/EXCEPT - No soportados directamente en Cassandra
    if (ast.union || ast.intersect || ast.except) {
      this.logger.warn('Cassandra no soporta UNION/INTERSECT/EXCEPT directamente. La consulta no se traducirá correctamente.');
    }
    
    // Subconsultas - No soportadas directamente en Cassandra
    // Sería necesario un análisis más profundo para detectarlas
  }
}