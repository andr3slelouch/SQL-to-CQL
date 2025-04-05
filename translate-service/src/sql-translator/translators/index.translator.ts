// src/sql-translator/translators/index.translator.ts
import { Injectable, Logger } from '@nestjs/common';
import { Translator } from '../interfaces/translator.interface';

@Injectable()
export class IndexTranslator implements Translator {
  private readonly logger = new Logger(IndexTranslator.name);

  /**
   * Verifica si este traductor puede manejar el AST proporcionado
   * @param ast AST de la sentencia SQL
   * @returns true si puede manejar el AST, false en caso contrario
   */
  canHandle(ast: any): boolean {
    if (!ast) return false;
    
    // Operaciones de índice
    return (
      (ast.type === 'create' && ast.keyword === 'index') ||
      (ast.type === 'drop' && ast.keyword === 'index')
    );
  }

  /**
   * Traduce un AST de operación de índice a CQL
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
          return this.translateCreateIndex(ast);
        case 'drop':
          return this.translateDropIndex(ast);
        default:
          return this.createErrorComment(`Tipo de operación no soportado: ${ast.type}`);
      }
    } catch (error: any) {
      this.logger.error(`Error al traducir operación de índice: ${error.message}`);
      return this.createErrorComment(error.message);
    }
  }

  /**
   * Crea un comentario para errores
   * @param errorMessage Mensaje de error
   * @returns Comentario SQL
   */
  private createErrorComment(errorMessage: string): string {
    return `-- Error en la traducción de índice: ${errorMessage}`;
  }
  
  /**
   * Traduce una sentencia CREATE INDEX a CQL
   * @param ast AST de la sentencia CREATE INDEX
   * @returns Sentencia CQL equivalente
   */
  private translateCreateIndex(ast: any): string {
    // Extraer componentes de la sentencia CREATE INDEX
    if (!ast.index) {
      return this.createErrorComment('No se encontró un nombre de índice válido');
    }
    
    const indexName = typeof ast.index === 'string' ? ast.index : 
                      ast.index.name || ast.index.value || 
                      JSON.stringify(ast.index).replace(/["{}]/g, '');
    
    if (!ast.table || !ast.table.table) {
      return this.createErrorComment('No se encontró una tabla válida para el índice');
    }
    
    const tableName = ast.table.table;
    const column = this.extractIndexColumn(ast);
    
    if (!column) {
      return this.createErrorComment('No se encontró una columna válida para el índice');
    }
    
    const ifNotExists = ast.if_not_exists ? 'IF NOT EXISTS ' : '';
    
    // Verificar características no soportadas
    const warnings = this.checkCreateIndexUnsupportedFeatures(ast);
    
    // Construir la sentencia CQL
    let cql = `CREATE INDEX ${ifNotExists}${indexName} ON ${tableName} (${column})`;
    
    // Añadir advertencias como comentarios
    if (warnings.length > 0) {
      cql = warnings.map(w => `-- ADVERTENCIA: ${w}`).join('\n') + '\n' + cql;
    }
    
    return cql;
  }
  
  /**
   * Traduce una sentencia DROP INDEX a CQL
   * @param ast AST de la sentencia DROP INDEX
   * @returns Sentencia CQL equivalente
   */
  private translateDropIndex(ast: any): string {
    // Extraer componentes de la sentencia DROP INDEX
    if (!ast.name) {
      return this.createErrorComment('No se encontró un nombre de índice válido');
    }
    
    const indexName = typeof ast.name === 'string' ? ast.name : 
                      ast.name.name || ast.name.value || 
                      JSON.stringify(ast.name).replace(/["{}]/g, '');
    
    const ifExists = ast.if_exists ? 'IF EXISTS ' : '';
    
    return `DROP INDEX ${ifExists}${indexName}`;
  }
  
  /**
   * Extrae la columna sobre la que se crea el índice
   * @param ast AST de la sentencia CREATE INDEX
 * @returns Nombre de la columna o null si no se encuentra
 */
private extractIndexColumn(ast: any): string | null {
  // La estructura puede variar según el parser y la sintaxis SQL
  let column: string | null = null;
  
  try {
    // Intenta extraer la columna de diferentes partes del AST
    if (ast.columns && Array.isArray(ast.columns) && ast.columns.length > 0) {
      // Si hay una lista explícita de columnas
      const firstCol = ast.columns[0];
      if (firstCol && typeof firstCol === 'object') {
        if (firstCol.column) {
          column = firstCol.column;
        } else if (firstCol.expr && firstCol.expr.column) {
          column = firstCol.expr.column;
        }
      } else if (typeof firstCol === 'string') {
        column = firstCol;
      }
    } else if (ast.column) {
      // Si hay una única columna
      if (typeof ast.column === 'string') {
        column = ast.column;
      } else if (ast.column.column) {
        column = ast.column.column;
      } else if (ast.column.name) {
        column = ast.column.name;
      }
    } else if (ast.expr && ast.expr.column) {
      // Si la columna está en una expresión
      column = ast.expr.column;
    } else if (ast.definition && Array.isArray(ast.definition)) {
      // Si la columna está en una definición
      for (const def of ast.definition) {
        if (def && def.column) {
          column = def.column;
          break;
        }
      }
    } else if (ast.on && ast.on.column) {
      // Si la columna está en la cláusula ON
      column = ast.on.column;
    }
    
    // Si no encontramos la columna por los métodos anteriores, buscamos en todo el AST
    if (!column) {
      const astStr = JSON.stringify(ast);
      const matches = astStr.match(/"column"\s*:\s*"([^"]+)"/);
      if (matches && matches[1]) {
        column = matches[1];
      }
    }
  } catch (error) {
    this.logger.warn(`Error al extraer columna del índice: ${error}`);
  }
  
  return column;
}
  
  /**
   * Verifica si hay características no soportadas por Cassandra en CREATE INDEX
   * @param ast AST de la sentencia CREATE INDEX
   * @returns Lista de advertencias
   */
  private checkCreateIndexUnsupportedFeatures(ast: any): string[] {
    const warnings: string[] = [];
    
    // Cassandra no soporta índices UNIQUE
    if (ast.unique) {
      warnings.push('Cassandra no soporta índices UNIQUE. Se creará un índice normal.');
    }
    
    // Cassandra no soporta índices en múltiples columnas de la misma manera que SQL
    if (ast.columns && ast.columns.length > 1) {
      warnings.push('Cassandra tiene limitaciones con índices en múltiples columnas. Se usará solo la primera columna.');
    }
    
    // Cassandra no soporta índices con WHERE
    if (ast.where) {
      warnings.push('Cassandra no soporta índices con WHERE. Se ignorará esta parte.');
    }
    
    // Cassandra no soporta índices con INCLUDE
    if (ast.include) {
      warnings.push('Cassandra no soporta índices con INCLUDE. Se ignorará esta parte.');
    }
    
    // Cassandra no soporta índices funcionales de la misma manera que SQL
    if (ast.columns && ast.columns[0] && ast.columns[0].expr && ast.columns[0].expr.type === 'function') {
      warnings.push('Cassandra tiene soporte limitado para índices funcionales. Se usará una traducción básica.');
    }
    
    return warnings;
  }
}