// src/sql-translator/translators/update.translator.ts
import { Injectable, Logger } from '@nestjs/common';
import { Translator } from '../interfaces/translator.interface';

@Injectable()
export class UpdateTranslator implements Translator {
  private readonly logger = new Logger(UpdateTranslator.name);

  /**
   * Verifica si este traductor puede manejar el AST proporcionado
   * @param ast AST de la sentencia SQL
   * @returns true si puede manejar el AST, false en caso contrario
   */
  canHandle(ast: any): boolean {
    return ast && ast.type === 'update';
  }

  /**
   * Traduce un AST de sentencia UPDATE a CQL
   * @param ast AST de la sentencia SQL
   * @returns Sentencia CQL equivalente
   */
  translate(ast: any): string | null {
    if (!this.canHandle(ast)) {
      return null;
    }
    
    try {
      // Extraer componentes de la sentencia UPDATE
      const tableName = this.extractTableName(ast);
      const setClause = this.buildSetClause(ast);
      const whereClause = this.buildWhereClause(ast);
      const ifClause = this.buildIfClause(ast);
      
      // Verificar si hay cláusula WHERE 
      if (!whereClause) {
        this.logger.warn('Cassandra requiere una cláusula WHERE para operaciones UPDATE');
        throw new Error('La sentencia UPDATE debe incluir una cláusula WHERE para Cassandra');
      }
      
      // Verificar características no soportadas
      this.checkUnsupportedFeatures(ast);
      
      // Construir la sentencia CQL
      let cql = `UPDATE ${tableName}`;
      
      // Añadir la cláusula SET
      cql += ` SET ${setClause}`;
      
      // Añadir la cláusula WHERE
      cql += ` WHERE ${whereClause}`;
      
      // Añadir la cláusula IF si existe
      if (ifClause) {
        cql += ` IF ${ifClause}`;
      }
      
      return cql;
    } catch (error) {
      this.logger.error(`Error al traducir UPDATE: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Extrae el nombre de la tabla de la sentencia UPDATE
   * @param ast AST de la sentencia UPDATE
   * @returns Nombre de la tabla
   */
  private extractTableName(ast: any): string {
    if (!ast.table || !ast.table[0] || !ast.table[0].table) {
      throw new Error('No se encontró una tabla válida en la sentencia UPDATE');
    }
    
    return ast.table[0].table;
  }
  
  /**
   * Construye la cláusula SET para la sentencia UPDATE
   * @param ast AST de la sentencia UPDATE
   * @returns Cláusula SET formateada
   */
  private buildSetClause(ast: any): string {
    if (!ast.set || !Array.isArray(ast.set) || ast.set.length === 0) {
      throw new Error('No se encontraron asignaciones válidas en la sentencia UPDATE');
    }
    
    // Formatear cada asignación SET
    const setItems = ast.set.map((item: any) => {
      const column = item.column;
      const value = this.formatValue(item.value);
      
      
      return `${column} = ${value}`;
    });
    
    return setItems.join(', ');
  }
  
  /**
   * Construye la cláusula WHERE para la sentencia UPDATE
   * @param ast AST de la sentencia UPDATE
   * @returns Cláusula WHERE formateada o null si no existe
   */
  private buildWhereClause(ast: any): string | null {
    if (!ast.where) {
      return null;
    }
    
    return this.formatWhereExpression(ast.where);
  }
  
  /**
   * Construye la cláusula IF para la sentencia UPDATE (condición)
   * @param ast AST de la sentencia UPDATE
   * @returns Cláusula IF formateada o null si no existe
   */
  private buildIfClause(ast: any): string | null {
  
    return null;
  }
  
  /**
   * Formatea una expresión WHERE
   * @param expr Expresión WHERE
   * @returns Expresión WHERE formateada
   */
  private formatWhereExpression(expr: any): string {
    if (!expr) return '';
    
    if (expr.type === 'binary_expr') {
      // Operador binario (AND, OR, =, >, <, etc.)
      const left = this.formatWhereOperand(expr.left);
      const right = this.formatWhereOperand(expr.right);
      
      return `${left} ${expr.operator} ${right}`;
    } else {
      return this.formatWhereOperand(expr);
    }
  }
  
  /**
   * Formatea un operando de la expresión WHERE
   * @param operand Operando
   * @returns Operando formateado
   */
  private formatWhereOperand(operand: any): string {
    if (!operand) return '';
    
    if (operand.type === 'column_ref') {
      // Referencia a columna
      return operand.table ? `${operand.table}.${operand.column}` : operand.column;
    } else if (operand.type === 'number') {
      // Valor numérico
      return operand.value.toString();
    } else if (operand.type === 'string' || operand.type === 'single_quote_string') {
      // Cadena literal
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
      // Otros casos
      this.logger.warn(`Tipo de operando no soportado en WHERE: ${operand.type}`);
      return JSON.stringify(operand);
    }
  }
  
  /**
   * Formatea un valor para la sentencia UPDATE
   * @param value Valor a formatear
   * @returns Valor formateado para CQL
   */
  private formatValue(value: any): string {
    if (!value) return 'null';
    
    switch (value.type) {
      case 'number':
        return value.value.toString();
      case 'string':
      case 'single_quote_string':
        return `'${value.value}'`;
      case 'bool':
        return value.value.toString().toUpperCase();
      case 'null':
        return 'null';
      case 'function':
        const funcName = value.name;
        const args = value.args.map((arg: any) => this.formatValue(arg)).join(', ');
        return `${funcName}(${args})`;
      case 'column_ref':
        // Referencia a columna (para casos como SET col1 = col2 + 1)
        return value.table ? `${value.table}.${value.column}` : value.column;
      case 'binary_expr':
        // Expresión binaria (para casos como SET col1 = col2 + 1)
        const left = this.formatValue(value.left);
        const right = this.formatValue(value.right);
        return `${left} ${value.operator} ${right}`;
      default:
        this.logger.warn(`Tipo de valor no soportado: ${value.type}`);
        return JSON.stringify(value);
    }
  }
  
  /**
   * Verifica si hay características no soportadas por Cassandra
   * @param ast AST de la sentencia UPDATE
   */
  private checkUnsupportedFeatures(ast: any): void {
    // Cassandra no soporta UPDATE sin WHERE
    if (!ast.where) {
      throw new Error('Cassandra requiere una cláusula WHERE para operaciones UPDATE');
    }
    
    // Cassandra no soporta JOIN en UPDATE
    if (ast.table && ast.table.length > 1) {
      throw new Error('Cassandra no soporta JOIN en operaciones UPDATE');
    }
    
    // Cassandra no soporta ORDER BY en UPDATE
    if (ast.orderby) {
      this.logger.warn('Cassandra no soporta ORDER BY en UPDATE. Se ignorará esta parte.');
    }
    
    // Cassandra no soporta LIMIT en UPDATE
    if (ast.limit) {
      this.logger.warn('Cassandra no soporta LIMIT en UPDATE. Se ignorará esta parte.');
    }
    
  }
}