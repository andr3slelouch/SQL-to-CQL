// src/sql-translator/translators/table.translator.ts
import { Injectable, Logger } from '@nestjs/common';
import { Translator } from '../interfaces/translator.interface';

@Injectable()
export class TableTranslator implements Translator {
  private readonly logger = new Logger(TableTranslator.name);
  
  // Mapeo de tipos de datos SQL a tipos CQL
  private readonly dataTypeMap: Record<string, string> = {
    'INT': 'int',
    'INTEGER': 'int',
    'SMALLINT': 'smallint',
    'TINYINT': 'tinyint',
    'BIGINT': 'bigint',
    'VARCHAR': 'text',
    'CHAR': 'text',
    'TEXT': 'text',
    'DECIMAL': 'decimal',
    'FLOAT': 'float',
    'DOUBLE': 'double',
    'BOOLEAN': 'boolean',
    'DATE': 'date',
    'TIME': 'time',
    'TIMESTAMP': 'timestamp',
    'UUID': 'uuid',
    'BLOB': 'blob'
  };

  /**
   * Verifica si este traductor puede manejar el AST proporcionado
   * @param ast AST de la sentencia SQL
   * @returns true si puede manejar el AST, false en caso contrario
   */
  canHandle(ast: any): boolean {
    if (!ast) return false;
    
    // Imprimimos la estructura del AST para depuración
    this.logger.debug(`Verificando si TableTranslator puede manejar AST: ${JSON.stringify(ast)}`);
    
    // NUEVO: Manejo específico para DESCRIBE TABLE
    if ((ast.type === 'desc' || ast.type === 'describe') && 
        ast.sourceText && ast.sourceText.toUpperCase().includes('TABLE')) {
      this.logger.debug('TableTranslator identificó DESCRIBE TABLE por texto original');
      return true;
    }
    
    // Caso especial para ALTER TABLE - node-sql-parser no establece keyword para ALTER
    if (ast.type === 'alter' && ast.table && Array.isArray(ast.table) && ast.table.length > 0 && ast.table[0].table) {
      this.logger.debug('TableTranslator identificó ALTER TABLE por structure');
      return true;
    }
    
    // Operaciones de tabla
    const canHandle = (
      (ast.type === 'create' && ast.keyword === 'table') ||
      (ast.type === 'alter' && ast.keyword === 'table') || // Esto ya no se usará pero lo dejamos por compatibilidad
      (ast.type === 'drop' && ast.keyword === 'table') ||
      (ast.type === 'truncate') ||
      (ast.type === 'show' && ast.keyword === 'tables') ||
      (ast.type === 'show' && ast.keyword === 'columns') ||
      // Añadir soporte para tipo 'desc' (describe)
      (ast.type === 'desc') ||
      (ast.type === 'describe')
    );
    
    if (canHandle) {
      this.logger.debug(`TableTranslator puede manejar la sentencia de tipo: ${ast.type}`);
    }
    
    return canHandle;
  }

  /**
   * Traduce un AST de operación de tabla a CQL
   * @param ast AST de la sentencia SQL
   * @returns Sentencia CQL equivalente
   */
  translate(ast: any): string | null {
    if (!this.canHandle(ast)) {
      return null;
    }
    
    try {
      // NUEVO: Manejo especial para DESCRIBE TABLE nombreTabla
      if ((ast.type === 'desc' || ast.type === 'describe') && 
          ast.sourceText && ast.sourceText.toUpperCase().includes('TABLE')) {
        // Intentar extraer el nombre de la tabla del texto SQL original
        const sqlUpper = ast.sourceText.toUpperCase();
        if (sqlUpper.startsWith('DESCRIBE TABLE ') || sqlUpper.startsWith('DESC TABLE ')) {
          const prefix = sqlUpper.startsWith('DESCRIBE TABLE ') ? 'DESCRIBE TABLE ' : 'DESC TABLE ';
          const tableName = ast.sourceText.substring(prefix.length).trim();
          if (tableName) {
            this.logger.debug(`Extrayendo nombre de tabla de texto original para DESCRIBE TABLE: ${tableName}`);
            return `DESCRIBE TABLE ${tableName}`;
          }
        }
      }
      
      switch (ast.type) {
        case 'create':
          return this.translateCreateTable(ast);
        case 'alter':
          return this.translateAlterTable(ast);
        case 'drop':
          return this.translateDropTable(ast);
        case 'truncate':
          return this.translateTruncateTable(ast);
        case 'show':
          if (ast.keyword === 'tables') {
            return this.translateShowTables(ast);
          } else if (ast.keyword === 'columns') {
            return this.translateShowColumns(ast);
          }
          return this.createUnsupportedComment('SHOW', ast.keyword || 'unknown');
        // Añadir traducción para DESC/DESCRIBE
        case 'desc':
        case 'describe':
          return this.translateDescTable(ast);
        default:
          return this.createUnsupportedComment(ast.type, 'unknown');
      }
    } catch (error: any) {
      this.logger.error(`Error al traducir operación de tabla: ${error.message}`);
      return this.createErrorComment(error.message);
    }
  }
  
  /**
   * Traduce una sentencia DESC/DESCRIBE a CQL
   * @param ast AST de la sentencia DESC/DESCRIBE
   * @returns Sentencia CQL equivalente
   */
  private translateDescTable(ast: any): string {
    this.logger.debug(`Traduciendo DESC/DESCRIBE. AST: ${JSON.stringify(ast)}`);
    
    // NUEVO: Procesamiento del texto SQL original para DESCRIBE TABLE
    if (ast.sourceText) {
      const sqlUpper = ast.sourceText.toUpperCase();
      
      // Detectar DESCRIBE TABLE nombreTabla
      if (sqlUpper.startsWith('DESCRIBE TABLE ') || sqlUpper.startsWith('DESC TABLE ')) {
        const prefix = sqlUpper.startsWith('DESCRIBE TABLE ') ? 'DESCRIBE TABLE ' : 'DESC TABLE ';
        const tableName = ast.sourceText.substring(prefix.length).trim();
        if (tableName) {
          this.logger.debug(`Extrayendo nombre de tabla de texto original para DESCRIBE TABLE: ${tableName}`);
          return `DESCRIBE TABLE ${tableName}`;
        }
      }
      
      // Detectar DESCRIBE KEYSPACES/DATABASES
      if (sqlUpper.includes('KEYSPACES') || sqlUpper.includes('DATABASES') || sqlUpper.includes('SCHEMAS')) {
        this.logger.debug(`Detectado DESCRIBE KEYSPACES/DATABASES/SCHEMAS por texto SQL`);
        return 'DESCRIBE KEYSPACES';
      }
      
      // Detectar DESCRIBE TABLES
      if (sqlUpper.includes('TABLES')) {
        this.logger.debug(`Detectado DESCRIBE TABLES por texto SQL`);
        return 'DESCRIBE TABLES';
      }
    }
    
    // Si el valor de table es 'keyspaces', es DESCRIBE KEYSPACES
    if (ast.table === 'keyspaces' || 
        (typeof ast.table === 'object' && ast.table && ast.table.table === 'keyspaces')) {
      this.logger.debug(`Detectado DESCRIBE KEYSPACES`);
      return 'DESCRIBE KEYSPACES';
    }
    
    // Si el valor de table es 'tables', es DESCRIBE TABLES
    if (ast.table === 'tables' || 
        (typeof ast.table === 'object' && ast.table && ast.table.table === 'tables')) {
      this.logger.debug(`Detectado DESCRIBE TABLES`);
      return 'DESCRIBE TABLES';
    }
    
    // Si hay un nombre de tabla específico, es DESCRIBE TABLE nombre_tabla
    if (ast.table && typeof ast.table === 'string' && 
        ast.table !== 'tables' && ast.table !== 'keyspaces') {
      this.logger.debug(`Detectado DESCRIBE TABLE para tabla específica: ${ast.table}`);
      return `DESCRIBE TABLE ${ast.table}`;
    }
    
    // Si no hay suficiente información, asumir DESCRIBE TABLES
    this.logger.warn(`No se pudo determinar tipo específico de DESC: ${JSON.stringify(ast)}`);
    this.logger.debug(`No se pudo determinar tipo específico de DESC, usando DESCRIBE TABLES por defecto`);
    return 'DESCRIBE TABLES';
  }
  
  /**
   * Crea un comentario para operaciones no soportadas
   * @param operation Operación no soportada
   * @param details Detalles adicionales
   * @returns Comentario SQL
   */
  private createUnsupportedComment(operation: string, details: string): string {
    return `-- Operación ${operation.toUpperCase()} ${details} no soportada en la traducción`;
  }
  
  /**
   * Crea un comentario para errores
   * @param errorMessage Mensaje de error
   * @returns Comentario SQL
   */
  private createErrorComment(errorMessage: string): string {
    return `-- Error en la traducción: ${errorMessage}`;
  }
  
  /**
   * Extrae el nombre de la tabla de diferentes propiedades del AST
   * @param ast AST de la operación de tabla
   * @param primaryProperty Propiedad principal donde buscar el nombre de la tabla
   * @returns Nombre de la tabla o null si no se encuentra
   */
  private extractTableName(ast: any, primaryProperty: string = 'table'): string | null {
    this.logger.debug(`Extrayendo nombre de tabla. AST: ${JSON.stringify(ast)}`);

    let tableName: string | null = null;

    // Intentar diferentes caminos para encontrar el nombre de la tabla
    const possibleProperties = [primaryProperty, 'name', 'from'];

    for (const prop of possibleProperties) {
      if (!ast[prop]) continue;

      const value = ast[prop];

      if (typeof value === 'string') {
        tableName = value;
        break;
      } else if (typeof value === 'object' && value !== null) {
        // Si es un array (común en muchas estructuras AST)
        if (Array.isArray(value) && value.length > 0) {
          const item = value[0];
          if (typeof item === 'string') {
            tableName = item;
            break;
          } else if (typeof item === 'object' && item !== null) {
            if (item.table) {
              tableName = item.table;
              break;
            } else if (item.name) {
              tableName = item.name;
              break;
            }
          }
        } 
        // Si no es un array, podría ser un objeto con propiedades específicas
        else if (value.table) {
          tableName = value.table;
          break;
        } else if (value.name) {
          tableName = value.name;
          break;
        }
      }
    }

    return tableName;
  }

  /**
   * Traduce una sentencia CREATE TABLE a CQL
   * @param ast AST de la sentencia CREATE TABLE
   * @returns Sentencia CQL equivalente
   */
  private translateCreateTable(ast: any): string {
    if (!ast.table || !ast.table[0] || !ast.table[0].table) {
      return this.createErrorComment('No se encontró nombre de tabla válido');
    }
    
    const tableName = ast.table[0].table;
    const ifNotExists = ast.if_not_exists ? 'IF NOT EXISTS ' : '';
    
    // Procesar las definiciones de columnas y restricciones
    const columnDefs: string[] = [];
    let primaryKeyDef: string | null = null;
    const primaryKeyColumns: string[] = [];
    
    if (!ast.create_definitions || !Array.isArray(ast.create_definitions)) {
      return this.createErrorComment(`No se encontraron definiciones de columna para la tabla ${tableName}`);
    }
    
    for (const def of ast.create_definitions) {
      if (def.resource === 'column' && def.column && def.definition) {
        // Definición de columna
        const columnName = def.column.column;
        
        if (!def.definition.dataType) {
          continue; // Saltar columnas sin tipo de dato
        }
        
        const sqlDataType = String(def.definition.dataType).toUpperCase();
        
        // Mapear tipo de dato SQL a CQL
        let cqlDataType = this.dataTypeMap[sqlDataType] || 'text';
        
        // Manejar tipos con parámetros (como VARCHAR(255))
        if (sqlDataType.includes('(')) {
          const baseType = sqlDataType.split('(')[0];
          cqlDataType = this.dataTypeMap[baseType] || 'text';
          
          // En Cassandra/CQL, los tipos text, varchar, ascii no llevan longitud
          // pero decimal sí puede llevar precisión y escala
          if (baseType === 'DECIMAL' && sqlDataType.match(/\(\d+,\d+\)/)) {
            const params = sqlDataType.match(/\(.*\)/);
            if (params) {
              cqlDataType += params[0];
            }
          }
        }
        
        // Construir definición de columna
        let columnDef = `${columnName} ${cqlDataType}`;
        
        // NUEVO: Verificar si esta columna tiene PRIMARY KEY en la definición
        if (def.primary_key || 
            (def.definition.constraint && def.definition.constraint.some((c: any) => c.type === 'primary key'))) {
          primaryKeyColumns.push(columnName);
          this.logger.debug(`Columna ${columnName} detectada como clave primaria en la definición`);
        }
        
        // Verificar si esta columna es una clave primaria 
        if (def.definition.primary_key) {
          if (!primaryKeyColumns.includes(columnName)) {
            primaryKeyColumns.push(columnName);
          }
        }
        
        columnDefs.push(columnDef);
      } else if (def.resource === 'constraint' && def.constraint_type === 'primary key') {
        // Restricción PRIMARY KEY
        if (def.definition && Array.isArray(def.definition)) {
          for (const col of def.definition) {
            if (col.column) {
              if (!primaryKeyColumns.includes(col.column)) {
                primaryKeyColumns.push(col.column);
              }
            }
          }
        }
      }
    }
    
    // Si hay columnas marcadas como clave primaria
    if (primaryKeyColumns.length > 0) {
      primaryKeyDef = `PRIMARY KEY (${primaryKeyColumns.join(', ')})`;
      this.logger.debug(`Utilizando columnas como clave primaria: ${primaryKeyColumns.join(', ')}`);
    } else {
      // Cassandra requiere una clave primaria
      this.logger.warn(`No se encontró clave primaria para la tabla ${tableName}. Cassandra requiere una clave primaria.`);
      // Añadir id como clave primaria por defecto si hay columnas
      if (columnDefs.length > 0) {
        // Verificar si existe una columna id
        const hasIdColumn = ast.create_definitions.some(
          (def: any) => def.resource === 'column' && def.column && def.column.column === 'id'
        );
        
        if (hasIdColumn) {
          primaryKeyDef = 'PRIMARY KEY (id)';
          columnDefs.push(primaryKeyDef);
          this.logger.debug('Utilizando columna "id" como clave primaria por defecto');
        } else {
          return this.createErrorComment(`Cassandra requiere una clave primaria para la tabla ${tableName}`);
        }
      } else {
        return this.createErrorComment(`No se pudieron extraer definiciones de columna para la tabla ${tableName}`);
      }
    }
    
    // Añadir PRIMARY KEY a las definiciones de columnas si existe
    if (primaryKeyDef) {
      columnDefs.push(primaryKeyDef);
    }
    
    // Construir la sentencia CREATE TABLE
    if (columnDefs.length === 0) {
      return this.createErrorComment(`No se pudieron extraer definiciones de columna para la tabla ${tableName}`);
    }
    
    return `CREATE TABLE ${ifNotExists}${tableName} (
  ${columnDefs.join(',\n  ')}
)`;
  }
  
  /**
   * Traduce una sentencia ALTER TABLE a CQL
   * @param ast AST de la sentencia ALTER TABLE
   * @returns Sentencia CQL equivalente
   */
  private translateAlterTable(ast: any): string {
    this.logger.debug(`Traduciendo ALTER TABLE. AST: ${JSON.stringify(ast)}`);
    
    // Extraer el nombre de la tabla
    if (!ast.table || !Array.isArray(ast.table) || ast.table.length === 0 || !ast.table[0].table) {
      return this.createErrorComment('No se encontró nombre de tabla válido');
    }
    
    const tableName = ast.table[0].table;
    
    // Verificar que haya expresiones de alteración
    if (!ast.expr || !Array.isArray(ast.expr) || ast.expr.length === 0) {
      return this.createErrorComment(`No se encontraron operaciones de alteración para la tabla ${tableName}`);
    }
    
    // Procesar cada expresión de alteración
    const alterExpr = ast.expr[0]; // Tomamos la primera expresión
    
    // Verificar la acción de alteración
    switch (alterExpr.action) {
      case 'add':
        // ADD COLUMN
        if (alterExpr.column && alterExpr.column.column && alterExpr.definition) {
          const columnName = alterExpr.column.column;
          let sqlDataType = '';
          
          // Extraer tipo de dato
          if (alterExpr.definition.dataType) {
            sqlDataType = String(alterExpr.definition.dataType).toUpperCase();
            
            // Si hay longitud, la incluimos en la representación del tipo SQL
            if (alterExpr.definition.length) {
              sqlDataType += `(${alterExpr.definition.length})`;
            }
          }
          
          // Mapear tipo de dato SQL a CQL
          let cqlDataType = this.dataTypeMap[sqlDataType] || 
                            this.dataTypeMap[sqlDataType.split('(')[0]] || 'text';
          
          return `ALTER TABLE ${tableName} ADD ${columnName} ${cqlDataType}`;
        }
        break;
      
      case 'drop':
        // DROP COLUMN
        if (alterExpr.column && alterExpr.column.column) {
          const columnName = alterExpr.column.column;
          return `ALTER TABLE ${tableName} DROP ${columnName}`;
        }
        break;
      
      case 'rename':
        // RENAME COLUMN
        if (alterExpr.old_column && alterExpr.old_column.column && alterExpr.column && alterExpr.column.column) {
          const oldName = alterExpr.old_column.column;
          const newName = alterExpr.column.column;
          return `ALTER TABLE ${tableName} RENAME ${oldName} TO ${newName}`;
        }
        break;
      
      case 'modify':
        // Cassandra no permite cambiar el tipo de una columna existente
        this.logger.warn('Cassandra no permite cambiar el tipo de una columna existente');
        return `-- Cassandra no permite ALTER TABLE MODIFY COLUMN. Para ${tableName}, se requeriría recrear la tabla.`;
    }
    
    // Si no pudimos determinar la acción específica, devolvemos un comentario
    return `-- No se pudo traducir ALTER TABLE para ${tableName}: acción '${alterExpr.action || 'desconocida'}' no soportada`;
  }
  
  /**
   * Traduce una sentencia DROP TABLE a CQL
   * @param ast AST de la sentencia DROP TABLE
   * @returns Sentencia CQL equivalente
   */
  private translateDropTable(ast: any): string {
    const tableName = this.extractTableName(ast);
    
    if (!tableName) {
      return this.createErrorComment('No se encontró nombre de tabla válido');
    }
    
    const ifExists = ast.prefix === 'if exists' ? 'IF EXISTS ' : '';
    
    return `DROP TABLE ${ifExists}${tableName}`;
  }
  
  /**
   * Traduce una sentencia TRUNCATE TABLE a CQL
   * @param ast AST de la sentencia TRUNCATE TABLE
   * @returns Sentencia CQL equivalente
   */
  private translateTruncateTable(ast: any): string {
    const tableName = this.extractTableName(ast);
    
    if (!tableName) {
      return this.createErrorComment('No se encontró nombre de tabla válido');
    }
    
    return `TRUNCATE TABLE ${tableName}`;
  }
  
  /**
   * Traduce una sentencia SHOW TABLES a CQL
   * @param ast AST de la sentencia SHOW TABLES
   * @returns Sentencia CQL equivalente
   */
  private translateShowTables(ast: any): string {
    // En Cassandra, esto es equivalente a DESCRIBE TABLES
    return 'DESCRIBE TABLES';
  }
  
  /**
   * Traduce una sentencia SHOW COLUMNS a CQL
   * @param ast AST de la sentencia SHOW COLUMNS
   * @returns Sentencia CQL equivalente
   */
  private translateShowColumns(ast: any): string {
    const tableName = this.extractTableName(ast, 'from');
    
    if (!tableName) {
      return this.createErrorComment('No se encontró nombre de tabla válido');
    }
    
    return `DESCRIBE TABLE ${tableName}`;
  }
}