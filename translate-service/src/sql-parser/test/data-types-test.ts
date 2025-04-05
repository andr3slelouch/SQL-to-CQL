// src/sql-parser/test/data-types-test.ts
/**
 * Script para probar el manejo de tipos de datos en el analizador SQL
 * Para ejecutar: npx ts-node src/sql-parser/test/data-types-test.ts
 */

import { Parser } from 'node-sql-parser';

interface ColumnDefinition {
  columnName?: string;
  dataType?: string;
  typeParams?: any;
  nullable?: boolean;
  constraintType?: string;
  definition?: any;
}

interface TableInfo {
  tableName: string;
  columns: ColumnDefinition[];
}

class DataTypesTester {
  private parser: Parser;
  
  constructor() {
    this.parser = new Parser();
    console.log('Analizador SQL inicializado para prueba de tipos de datos');
  }

  parseCreateTable(createTableSql: string) {
    try {
      const ast = this.parser.astify(createTableSql);
      return {
        success: true,
        ast
      };
    } catch (error) {
      console.error(`Error al analizar CREATE TABLE: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  extractColumnDefinitions(ast: any): TableInfo {
    const columnDefs: ColumnDefinition[] = [];
    let tableName = '';
    
    if (!ast) return { tableName, columns: columnDefs };
    
    const statement = Array.isArray(ast) ? ast[0] : ast;
    
    // Verificar que es una sentencia CREATE TABLE
    if (statement.type !== 'create' || statement.keyword !== 'table') {
      return { tableName, columns: columnDefs };
    }
    
    // Obtener tabla
    tableName = statement.table[0].table;
    
    // Recorrer definiciones de columnas
    for (const def of statement.create_definitions) {
      if (def.resource === 'column' && def.definition) {
        // Extraer información de la columna
        const columnName = def.column.column;
        const dataType = def.definition.dataType;
        const nullable = def.definition.nullable === undefined ? true : !def.definition.nullable;
        
        // Buscar parámetros en el tipo de datos (longitud, precisión, etc.)
        const typeParams = this.extractTypeParameters(dataType);
        
        // Agregar a la lista de columnas
        columnDefs.push({
          columnName,
          dataType,
          typeParams,
          nullable
        });
      } else if (def.resource === 'constraint') {
        // Extraer información de restricciones (PRIMARY KEY, UNIQUE, etc.)
        columnDefs.push({
          constraintType: def.constraint_type,
          definition: def.definition
        });
      }
    }
    
    return {
      tableName,
      columns: columnDefs
    };
  }
  
  extractTypeParameters(dataType: string): any {
    const params: any = {};
    
    // Buscar parámetros entre paréntesis
    const match = dataType.match(/^[A-Za-z]+\s*\((.*)\)$/);
    
    if (match && match[1]) {
      const paramStr = match[1];
      
      // Para tipos como DECIMAL(10,2) o NUMERIC(p,s)
      if (paramStr.includes(',')) {
        const [precision, scale] = paramStr.split(',').map(p => parseInt(p.trim(), 10));
        params.precision = precision;
        params.scale = scale;
      } 
      // Para tipos como VARCHAR(255) o CHAR(n)
      else {
        params.length = parseInt(paramStr.trim(), 10);
      }
    }
    
    return params;
  }
}

function testDataTypes() {
  const tester = new DataTypesTester();
  
  console.log('=== PRUEBA DE TIPOS DE DATOS SQL ===\n');
  
  // Crear una tabla con una variedad de tipos de datos para probar
  const createTableSql = `
    CREATE TABLE sample_table (
      id INT PRIMARY KEY,
      tiny_int_col TINYINT,
      small_int_col SMALLINT,
      int_col INT,
      big_int_col BIGINT,
      decimal_col DECIMAL(10,2),
      float_col FLOAT,
      double_col DOUBLE,
      varchar_col VARCHAR(255),
      char_col CHAR(10),
      text_col TEXT,
      date_col DATE,
      time_col TIME,
      timestamp_col TIMESTAMP,
      boolean_col BOOLEAN,
      blob_col BLOB,
      unique_id VARCHAR(36),
      email VARCHAR(100) UNIQUE NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      CONSTRAINT fk_constraint FOREIGN KEY (int_col) REFERENCES other_table(id)
    )
  `;
  
  // Analizar la sentencia CREATE TABLE
  const parseResult = tester.parseCreateTable(createTableSql);
  
  if (parseResult.success) {
    console.log('✅ Análisis de CREATE TABLE exitoso\n');
    
    // Extraer definiciones de columnas
    const tableInfo = tester.extractColumnDefinitions(parseResult.ast);
    
    console.log(`Tabla: ${tableInfo.tableName}`);
    console.log('\nColumnas:');
    
    // Mostrar información detallada de cada columna
    tableInfo.columns.forEach((column, index) => {
      if (column.columnName) {
        console.log(`\n${index + 1}. ${column.columnName}`);
        console.log(`   Tipo: ${column.dataType}`);
        
        // Mostrar parámetros del tipo si existen
        if (column.typeParams && Object.keys(column.typeParams).length > 0) {
          console.log(`   Parámetros: ${JSON.stringify(column.typeParams)}`);
        }
        
        console.log(`   Nullable: ${column.nullable}`);
      } else if (column.constraintType) {
        console.log(`\nRestricción: ${column.constraintType.toUpperCase()}`);
        console.log(`   Definición: ${JSON.stringify(column.definition)}`);
      }
    });
    
    // Verificar tipos de datos comunes
    console.log('\n=== Verificación de tipos específicos ===');
    
    const typeChecks = [
      { name: 'INT', pattern: /^INT$/i },
      { name: 'VARCHAR con longitud', pattern: /^VARCHAR\(\d+\)$/i },
      { name: 'DECIMAL con precisión y escala', pattern: /^DECIMAL\(\d+,\d+\)$/i },
      { name: 'DATE', pattern: /^DATE$/i },
      { name: 'TIMESTAMP', pattern: /^TIMESTAMP$/i },
      { name: 'BOOLEAN', pattern: /^BOOLEAN$/i },
      { name: 'BLOB', pattern: /^BLOB$/i }
    ];
    
    typeChecks.forEach(check => {
      const hasType = tableInfo.columns.some(col => 
        col.dataType && check.pattern.test(col.dataType)
      );
      
      console.log(`${hasType ? '✅' : '❌'} ${check.name}`);
    });
    
  } else {
    console.log(`❌ Error al analizar CREATE TABLE: ${parseResult.error}`);
  }
}

// Ejecutar la prueba
testDataTypes();