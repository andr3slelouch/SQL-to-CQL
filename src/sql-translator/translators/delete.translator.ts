// src/sql-translator/translators/delete.translator.ts
import { Injectable, Logger } from '@nestjs/common';
import { Translator } from '../interfaces/translator.interface';

@Injectable()
export class DeleteTranslator implements Translator {
  private readonly logger = new Logger(DeleteTranslator.name);

  /**
   * Verifica si este traductor puede manejar el AST proporcionado
   * @param ast AST de la sentencia SQL
   * @returns true si puede manejar el AST, false en caso contrario
   */
  canHandle(ast: any): boolean {
    return ast && ast.type === 'delete';
  }

  /**
   * Traduce un AST de sentencia DELETE a CQL
   * @param ast AST de la sentencia SQL
   * @returns Sentencia CQL equivalente
   */
  translate(ast: any): string | null {
    if (!this.canHandle(ast)) {
      return null;
    }
    
    try {
      // Extraer componentes de la sentencia DELETE
      const tableName = this.extractTableName(ast);
      const whereClause = this.buildWhereClause(ast);
      const ifClause = this.buildIfClause(ast);
      
      // Verificar características no soportadas
      this.checkUnsupportedFeatures(ast);
      
      // Construir la sentencia CQL
      let cql = `DELETE FROM ${tableName}`;
      
      // Añadir la cláusula WHERE si existe
      if (whereClause) {
        cql += ` WHERE ${whereClause}`;
      } else {
        // En Cassandra, el DELETE sin WHERE borra todas las filas de la tabla
        // Esto es equivalente a TRUNCATE en SQL, pero se permite con una advertencia
        this.logger.warn(`DELETE sin WHERE eliminará todas las filas de la tabla ${tableName}. En Cassandra esto es costoso y no recomendado para tablas grandes.`);
      }
      
      // Añadir la cláusula IF si existe
      if (ifClause) {
        cql += ` IF ${ifClause}`;
      }
      
      return cql;
    } catch (error) {
      this.logger.error(`Error al traducir DELETE: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Extrae el nombre de la tabla de la sentencia DELETE
   * @param ast AST de la sentencia DELETE
   * @returns Nombre de la tabla
   */
  private extractTableName(ast: any): string {
    if (!ast.from || !ast.from[0] || !ast.from[0].table) {
      throw new Error('No se encontró una tabla válida en la sentencia DELETE');
    }
    
    return ast.from[0].table;
  }
  
  /**
   * Construye la cláusula WHERE para la sentencia DELETE
   * @param ast AST de la sentencia DELETE
   * @returns Cláusula WHERE formateada o null si no existe
   */
  private buildWhereClause(ast: any): string | null {
    if (!ast.where) {
      return null;
    }
    
    return this.formatWhereExpression(ast.where);
  }
  
  /**
   * Construye la cláusula IF para la sentencia DELETE (condición)
   * @param ast AST de la sentencia DELETE
   * @returns Cláusula IF formateada o null si no existe
   */
  private buildIfClause(ast: any): string | null {
    // En SQL no hay un equivalente directo a IF en Cassandra
    // Se implementaría aquí si el parser reconociera alguna construcción similar
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
   * Verifica si hay características no soportadas por Cassandra
   * @param ast AST de la sentencia DELETE
   */
  private checkUnsupportedFeatures(ast: any): void {
    // Cassandra no soporta DELETE con JOIN
    if (ast.from && ast.from.length > 1) {
      throw new Error('Cassandra no soporta JOIN en operaciones DELETE');
    }
    
    // Cassandra no soporta DELETE con USING
    if (ast.using) {
      this.logger.warn('Cassandra tiene una sintaxis diferente para USING. Se traducirá de manera básica.');
    }
    
    // Cassandra no soporta ORDER BY en DELETE
    if (ast.orderby) {
      this.logger.warn('Cassandra no soporta ORDER BY en DELETE. Se ignorará esta parte.');
    }
    
    // Cassandra no soporta LIMIT en DELETE
    if (ast.limit) {
      this.logger.warn('Cassandra no soporta LIMIT en DELETE. Se ignorará esta parte.');
    }
    
    // Cassandra no soporta RETURNING en DELETE
    if (ast.returning) {
      this.logger.warn('Cassandra no soporta RETURNING en DELETE. Se ignorará esta parte.');
    }
  }
}