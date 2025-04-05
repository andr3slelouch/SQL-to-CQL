// src/sql-translator/translators/insert.translator.ts
import { Injectable, Logger } from '@nestjs/common';
import { Translator } from '../interfaces/translator.interface';

@Injectable()
export class InsertTranslator implements Translator {
  private readonly logger = new Logger(InsertTranslator.name);

  /**
   * Verifica si este traductor puede manejar el AST proporcionado
   * @param ast AST de la sentencia SQL
   * @returns true si puede manejar el AST, false en caso contrario
   */
  canHandle(ast: any): boolean {
    return ast && ast.type === 'insert';
  }

  /**
   * Traduce un AST de sentencia INSERT a CQL
   * @param ast AST de la sentencia SQL
   * @returns Sentencia CQL equivalente
   */
  translate(ast: any): string | null {
    if (!this.canHandle(ast)) {
      return null;
    }
    
    try {
      // Extraer componentes de la sentencia INSERT
      const tableName = this.extractTableName(ast);
      const columns = this.extractColumns(ast);
      const values = this.extractValues(ast);
      
      // Verificar si hay características no soportadas
      this.checkUnsupportedFeatures(ast);
      
      // Construir la sentencia CQL
      // En CQL, podemos usar la misma sintaxis de INSERT que en SQL
      let cql = `INSERT INTO ${tableName} (${columns.join(', ')})`;
      
      // Verificar si hay una cláusula IF NOT EXISTS
      const ifNotExists = ast.ignore || ast.conflict === 'ignore';
      if (ifNotExists) {
        cql += ' IF NOT EXISTS';
      }
      
      // Añadir VALUES
      cql += ` VALUES ${this.formatValues(values, columns)}`;
      
      return cql;
    } catch (error: any) {
      this.logger.error(`Error al traducir INSERT: ${error.message}`);
      return this.createErrorComment(error.message);
    }
  }
  
  /**
   * Crea un comentario para errores
   * @param errorMessage Mensaje de error
   * @returns Comentario SQL
   */
  private createErrorComment(errorMessage: string): string {
    return `-- Error en la traducción INSERT: ${errorMessage}`;
  }
  
  /**
   * Extrae el nombre de la tabla de la sentencia INSERT
   * @param ast AST de la sentencia INSERT
   * @returns Nombre de la tabla
   */
  private extractTableName(ast: any): string {
    if (!ast.table || !ast.table[0] || !ast.table[0].table) {
      throw new Error('No se encontró una tabla válida en la sentencia INSERT');
    }
    
    return ast.table[0].table;
  }
  
  /**
   * Extrae las columnas de la sentencia INSERT
   * @param ast AST de la sentencia INSERT
   * @returns Array con los nombres de las columnas
   */
  private extractColumns(ast: any): string[] {
    if (!ast.columns || !Array.isArray(ast.columns) || ast.columns.length === 0) {
      throw new Error('No se encontraron columnas válidas en la sentencia INSERT');
    }
    
    return ast.columns;
  }
  
  /**
   * Extrae los valores de la sentencia INSERT
   * @param ast AST de la sentencia INSERT
   * @returns Array con los valores a insertar
   */
  private extractValues(ast: any): any[] {
    // Verificar si hay una subconsulta como valores (SELECT)
    if (ast.values && ast.values.type === 'select') {
      throw new Error('Cassandra no soporta INSERT con subconsultas SELECT');
    }
    
    // Verificar si hay valores directos
    if (!ast.values || !Array.isArray(ast.values) || ast.values.length === 0) {
      throw new Error('No se encontraron valores válidos en la sentencia INSERT');
    }
    
    return ast.values;
  }
  
  /**
   * Formatea los valores para la sentencia INSERT
   * @param valuesRows Array de filas de valores
   * @param columns Lista de columnas para referencia
   * @returns Cadena con la cláusula VALUES formateada
   */
  private formatValues(valuesRows: any[], columns: string[]): string {
    // Formatear cada fila de valores
    const formattedRows: string[] = [];
    
    for (const row of valuesRows) {
      // Si es una estructura expr_list, necesitamos extraer los valores individuales
      if (typeof row === 'object' && row !== null && row.type === 'expr_list' && Array.isArray(row.value)) {
        const formattedValues: string[] = [];
        for (const item of row.value) {
          formattedValues.push(this.formatValue(item));
        }
        formattedRows.push(`(${formattedValues.join(', ')})`);
        continue;
      }
      
      if (!Array.isArray(row)) {
        this.logger.warn(`Formato de valores inesperado: ${JSON.stringify(row)}`);
        // Intentar manejar valores no estándar
        if (typeof row === 'object' && row !== null) {
          // Si es un objeto pero no un array, intentar extraer propiedades que puedan ser valores
          const extractedValues = this.extractObjectValues(row, columns);
          if (extractedValues.length > 0) {
            formattedRows.push(`(${extractedValues.join(', ')})`);
          } else {
            // Fallback: usar la representación JSON del objeto
            formattedRows.push(`(${this.formatValue(row)})`);
          }
        } else {
          formattedRows.push(`(${row})`);
        }
        continue;
      }
      
      // Formatear cada valor en la fila si es un array estándar
      const formattedValues: string[] = [];
      for (const value of row) {
        formattedValues.push(this.formatValue(value));
      }
      
      formattedRows.push(`(${formattedValues.join(', ')})`);
    }
    
    if (formattedRows.length === 0) {
      throw new Error('No se pudieron formatear los valores para la cláusula VALUES');
    }
    
    return formattedRows.join(', ');
  }

  /**
   * Extrae valores de un objeto no estándar
   * @param obj Objeto que contiene valores
   * @param columns Lista de columnas para referencia
   * @returns Array de valores formateados
   */
  private extractObjectValues(obj: any, columns: string[]): string[] {
    const values: string[] = [];

    // Intentar extraer valores usando diferentes estrategias
    if (obj.type === 'expr_list' && Array.isArray(obj.value)) {
      // Caso especial para expr_list
      for (const item of obj.value) {
        values.push(this.formatValue(item));
      }
    } else if (Array.isArray(obj)) {
      // Si es un array pero llegó aquí, probablemente tenga una estructura especial
      for (const item of obj) {
        values.push(this.formatValue(item));
      }
    } else {
      // Intentar extraer valores basados en nombres de columnas o propiedades comunes
      for (const col of columns) {
        if (obj[col] !== undefined) {
          values.push(this.formatValue(obj[col]));
        }
      }

      // Si no encontramos valores por columnas, intentar propiedades comunes
      if (values.length === 0) {
        const commonProps = ['value', 'values', 'data', 'items'];
        for (const prop of commonProps) {
          if (obj[prop] !== undefined) {
            const val = obj[prop];
            if (Array.isArray(val)) {
              for (const item of val) {
                values.push(this.formatValue(item));
              }
              break;
            } else {
              values.push(this.formatValue(val));
              break;
            }
          }
        }
      }
    }

    return values;
  }
  
  /**
   * Formatea un valor individual para la sentencia INSERT
   * @param value Valor a formatear
   * @returns Valor formateado para CQL
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    
    if (typeof value === 'object') {
      if (value.type === 'number') {
        return value.value.toString();
      } else if (value.type === 'string' || value.type === 'single_quote_string') {
        return `'${value.value}'`;
      } else if (value.type === 'double_quote_string') {
        return `'${value.value}'`; // Convertir comillas dobles a simples para CQL
      } else if (value.type === 'bool') {
        return value.value.toString().toUpperCase();
      } else if (value.type === 'null') {
        return 'null';
      } else if (value.type === 'function') {
        const funcName = value.name;
        const args = Array.isArray(value.args) 
          ? value.args.map((arg: any) => this.formatValue(arg)).join(', ')
          : '';
        return `${funcName}(${args})`;
      } else if (value.type === 'expr_list' && Array.isArray(value.value)) {
        // Manejar expr_list recursivamente
        const formattedItems = value.value.map((item: any) => this.formatValue(item));
        return formattedItems.join(', ');
      } else {
        // Si tiene una propiedad 'value', intentar usarla
        if (value.value !== undefined) {
          return this.formatValue(value.value);
        }
        
        // Caso genérico para objetos desconocidos
        this.logger.warn(`Tipo de valor desconocido: ${value.type || 'sin tipo'}`);
        return JSON.stringify(value);
      }
    } else if (typeof value === 'number') {
      return value.toString();
    } else if (typeof value === 'string') {
      return `'${value}'`;
    } else if (typeof value === 'boolean') {
      return value.toString().toUpperCase();
    }
    
    // Caso por defecto
    return String(value);
  }
  
  /**
   * Verifica si hay características no soportadas por Cassandra
   * @param ast AST de la sentencia INSERT
   */
  private checkUnsupportedFeatures(ast: any): void {
    // Cassandra no soporta INSERT con subconsultas
    if (ast.values && ast.values.type === 'select') {
      throw new Error('Cassandra no soporta INSERT con subconsultas SELECT');
    }
    
    // Cassandra no soporta ON DUPLICATE KEY UPDATE
    if (ast.on_duplicate_update) {
      this.logger.warn('Cassandra no soporta ON DUPLICATE KEY UPDATE. Se ignorará esta parte.');
    }
    
    // Cassandra no soporta RETURNING directamente
    if (ast.returning) {
      this.logger.warn('Cassandra no soporta RETURNING directamente. Se ignorará esta parte.');
    }
  }
}