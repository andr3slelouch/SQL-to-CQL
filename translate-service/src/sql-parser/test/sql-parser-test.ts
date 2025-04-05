// src/sql-parser/test/sql-parser-test.ts
/**
 * Script para probar el analizador SQL manualmente
 * Para ejecutar: npx ts-node src/sql-parser/test/sql-parser-test.ts
 */

import { Parser } from 'node-sql-parser';

// Clase simplificada del analizador para probar directamente
class SqlTester {
  private parser: Parser;
  
  constructor() {
    this.parser = new Parser();
    console.log('Analizador SQL inicializado');
  }

  parseSQL(sqlQuery: string) {
    try {
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
      console.error(`Error al analizar consulta SQL: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private determineQueryType(ast: any): string {
    // Si ast es un array, tomamos el primer elemento
    const statement = Array.isArray(ast) ? ast[0] : ast;
    return statement.type;
  }
  
  toSQL(ast: any): string {
    try {
      // La función sqlify convierte el AST de nuevo a SQL
      return this.parser.sqlify(ast);
    } catch (error) {
      console.error(`Error al convertir AST a SQL: ${error.message}`);
      throw error;
    }
  }
  
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

// Función para probar diferentes tipos de consultas SQL
function testSqlParser() {
  const tester = new SqlTester();
  
  console.log('=== PRUEBA DEL ANALIZADOR SINTÁCTICO SQL ===\n');
  
  // Casos de prueba: diferentes tipos de consultas SQL
  const testCases = [
    {
      name: 'SELECT Simple',
      sql: 'SELECT id, name, email FROM users WHERE status = "active"'
    },
    {
      name: 'SELECT con JOIN',
      sql: 'SELECT u.id, u.name, o.order_id FROM users u JOIN orders o ON u.id = o.user_id'
    },
    {
      name: 'SELECT con funciones agregadas y GROUP BY',
      sql: 'SELECT department, COUNT(*) as employee_count, AVG(salary) as avg_salary FROM employees GROUP BY department HAVING COUNT(*) > 5'
    },
    {
      name: 'INSERT Simple',
      sql: 'INSERT INTO products (id, name, price) VALUES (1, "Laptop", 999.99)'
    },
    {
      name: 'INSERT Múltiple',
      sql: 'INSERT INTO products (id, name, price) VALUES (1, "Laptop", 999.99), (2, "Phone", 499.99), (3, "Tablet", 299.99)'
    },
    {
      name: 'UPDATE Simple',
      sql: 'UPDATE users SET status = "inactive", last_login = NULL WHERE last_login < "2023-01-01"'
    },
    {
      name: 'DELETE Simple',
      sql: 'DELETE FROM sessions WHERE expiry_date < NOW()'
    },
    {
      name: 'CREATE TABLE',
      sql: `
        CREATE TABLE employees (
          id INT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE,
          department VARCHAR(50),
          salary DECIMAL(10,2),
          hire_date DATE,
          active BOOLEAN DEFAULT true
        )
      `
    },
    {
      name: 'Consulta con subconsulta',
      sql: 'SELECT * FROM products WHERE price > (SELECT AVG(price) FROM products)'
    },
    {
      name: 'Consulta con UNION',
      sql: 'SELECT id, name FROM employees UNION SELECT id, name FROM contractors'
    },
    {
      name: 'SQL inválido (para probar manejo de errores)',
      sql: 'SELECT FROM WHERE ORDER BY;'
    }
  ];
  
  // Ejecutar cada caso de prueba
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Prueba ${index + 1}: ${testCase.name} ---`);
    console.log(`SQL: ${testCase.sql}`);
    
    const parseResult = tester.parseSQL(testCase.sql);
    
    if (parseResult.success) {
      console.log(`✅ Análisis exitoso`);
      console.log(`Tipo de consulta: ${parseResult.type}`);
      
      // Inspeccionar estructura del AST
      const inspection = tester.inspectAst(parseResult.ast);
      console.log('Estructura principal:');
      console.log(JSON.stringify(inspection.structure, null, 2));
      
      // Regenerar SQL a partir del AST para verificar
      const regeneratedSql = tester.toSQL(parseResult.ast);
      console.log(`SQL regenerado: ${regeneratedSql}`);
    } else {
      console.log(`❌ Error de análisis: ${parseResult.error}`);
    }
    
    console.log('-------------------------------------------');
  });
}

// Ejecutar las pruebas
testSqlParser();