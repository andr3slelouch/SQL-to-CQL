// src/sql-parser/test/clause-test.ts
/**
 * Script para probar el análisis de cláusulas específicas en SQL
 * Para ejecutar: npx ts-node src/sql-parser/test/clause-test.ts
 */

import { Parser } from 'node-sql-parser';

class ClauseTester {
  private parser: Parser;
  
  constructor() {
    this.parser = new Parser();
    console.log('Analizador SQL inicializado para prueba de cláusulas');
  }

  parseSQL(sql: string) {
    try {
      const ast = this.parser.astify(sql);
      return {
        success: true,
        ast
      };
    } catch (error) {
      console.error(`Error al analizar SQL: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Extraer y analizar la cláusula WHERE
  analyzeWhereClause(ast: any) {
    const statement = Array.isArray(ast) ? ast[0] : ast;
    
    if (!statement.where) {
      return {
        exists: false,
        message: 'No hay cláusula WHERE'
      };
    }
    
    return {
      exists: true,
      structure: this.analyzeCondition(statement.where),
      raw: statement.where
    };
  }
  
  // Analizar recursivamente una condición (para WHERE, HAVING, etc.)
  analyzeCondition(condition: any, depth = 0): any {
    if (!condition) return null;
    
    if (condition.type === 'binary_expr') {
      // Operadores binarios como =, >, AND, OR, etc.
      return {
        type: 'binary',
        operator: condition.operator,
        left: this.analyzeCondition(condition.left, depth + 1),
        right: this.analyzeCondition(condition.right, depth + 1)
      };
    } else if (condition.type === 'column_ref') {
      // Referencias a columnas
      return {
        type: 'column',
        table: condition.table,
        column: condition.column
      };
    } else if (condition.type === 'number' || condition.type === 'string' || condition.type === 'bool' || condition.type === 'null') {
      // Valores literales
      return {
        type: 'literal',
        dataType: condition.type,
        value: condition.value
      };
    } else if (condition.type === 'function') {
      // Funciones (como COUNT, SUM, etc.)
      return {
        type: 'function',
        name: condition.name,
        args: condition.args.map((arg: any) => this.analyzeCondition(arg, depth + 1))
      };
    }
    
    // Para otros tipos de condiciones
    return {
      type: 'unknown',
      original: condition
    };
  }
  
  // Extraer y analizar la cláusula SELECT (columnas)
  analyzeSelectClause(ast: any) {
    const statement = Array.isArray(ast) ? ast[0] : ast;
    
    if (statement.type !== 'select') {
      return {
        valid: false,
        message: 'No es una consulta SELECT'
      };
    }
    
    if (statement.columns === '*') {
      return {
        valid: true,
        selectAll: true,
        columns: []
      };
    }
    
    const columns = statement.columns.map((col: any) => {
      if (col.expr.type === 'column_ref') {
        return {
          type: 'column',
          table: col.expr.table,
          column: col.expr.column,
          alias: col.as
        };
      } else if (col.expr.type === 'function') {
        return {
          type: 'function',
          name: col.expr.name,
          args: col.expr.args.map((arg: any) => this.analyzeCondition(arg)),
          alias: col.as
        };
      } else {
        return {
          type: 'unknown',
          original: col
        };
      }
    });
    
    return {
      valid: true,
      selectAll: false,
      columns
    };
  }
  
  // Extraer y analizar la cláusula FROM (tablas)
  analyzeFromClause(ast: any) {
    const statement = Array.isArray(ast) ? ast[0] : ast;
    
    if (!statement.from) {
      return {
        exists: false,
        message: 'No hay cláusula FROM'
      };
    }
    
    const tables = statement.from.map((fromItem: any) => {
      if (fromItem.join) {
        // Caso de JOIN
        return {
          type: 'join',
          table: fromItem.table,
          alias: fromItem.as,
          joinType: fromItem.join,
          on: this.analyzeCondition(fromItem.on)
        };
      } else {
        // Tabla normal
        return {
          type: 'table',
          table: fromItem.table,
          alias: fromItem.as
        };
      }
    });
    
    return {
      exists: true,
      tables
    };
  }
  
  // Extraer y analizar la cláusula ORDER BY
  analyzeOrderByClause(ast: any) {
    const statement = Array.isArray(ast) ? ast[0] : ast;
    
    if (!statement.orderby) {
      return {
        exists: false,
        message: 'No hay cláusula ORDER BY'
      };
    }
    
    const orderBy = statement.orderby.map((item: any) => {
      return {
        column: item.expr.column,
        type: item.type // ASC o DESC
      };
    });
    
    return {
      exists: true,
      orderBy
    };
  }
  
  // Extraer y analizar la cláusula GROUP BY
  analyzeGroupByClause(ast: any) {
    const statement = Array.isArray(ast) ? ast[0] : ast;
    
    if (!statement.groupby) {
      return {
        exists: false,
        message: 'No hay cláusula GROUP BY'
      };
    }
    
    // Comprobar si groupby es un array o un objeto
    const groupByItems: any[] = [];
    
    if (Array.isArray(statement.groupby)) {
      statement.groupby.forEach((item: any) => {
        groupByItems.push({
          type: item.type,
          column: item.column
        });
      });
    } else {
      // Si groupby no es un array, extraer la información disponible
      console.log('GROUP BY no es un array, estructura:', JSON.stringify(statement.groupby));
      
      // Intenta extraer columnas de la estructura
      if (statement.groupby.type === 'column_list' && Array.isArray(statement.groupby.value)) {
        statement.groupby.value.forEach((item: any) => {
          groupByItems.push({
            type: 'column_ref',
            column: item.column
          });
        });
      } else {
        // Caso fallback
        groupByItems.push({
          type: 'unknown',
          raw: statement.groupby
        });
      }
    }
    
    return {
      exists: true,
      groupBy: groupByItems
    };
  }
  
  // Extraer y analizar la cláusula HAVING
  analyzeHavingClause(ast: any) {
    const statement = Array.isArray(ast) ? ast[0] : ast;
    
    if (!statement.having) {
      return {
        exists: false,
        message: 'No hay cláusula HAVING'
      };
    }
    
    return {
      exists: true,
      condition: this.analyzeCondition(statement.having)
    };
  }
  
  // Extraer y analizar la cláusula LIMIT
  analyzeLimitClause(ast: any) {
    const statement = Array.isArray(ast) ? ast[0] : ast;
    
    if (!statement.limit) {
      return {
        exists: false,
        message: 'No hay cláusula LIMIT'
      };
    }
    
    return {
      exists: true,
      value: statement.limit.value,
      offset: statement.limit.offset ? statement.limit.offset.value : null
    };
  }
}

function testSQLClauses() {
  const tester = new ClauseTester();
  
  console.log('=== PRUEBA DE ANÁLISIS DE CLÁUSULAS SQL ===\n');
  
  // Pruebas para diferentes tipos de cláusulas
  const testCases = [
    {
      name: 'SELECT con múltiples cláusulas',
      sql: `
        SELECT u.id, u.name, COUNT(o.order_id) as order_count, SUM(o.total) as total_spent
        FROM users u
        JOIN orders o ON u.id = o.user_id
        WHERE u.status = 'active' AND (o.status = 'completed' OR o.status = 'shipped')
        GROUP BY u.id, u.name
        HAVING COUNT(o.order_id) > 5
        ORDER BY total_spent DESC
        LIMIT 10
      `
    },
    {
      name: 'WHERE con operadores lógicos y comparaciones',
      sql: `
        SELECT * FROM products
        WHERE (category = 'electronics' OR category = 'computers')
        AND price BETWEEN 100 AND 500
        AND stock_quantity > 0
        AND name LIKE '%laptop%'
      `
    },
    {
      name: 'JOIN con múltiples tablas',
      sql: `
        SELECT p.id, p.name, c.name as category, s.quantity, s.location
        FROM products p
        JOIN categories c ON p.category_id = c.id
        LEFT JOIN stock s ON p.id = s.product_id
        WHERE p.active = TRUE
      `
    },
    {
      name: 'GROUP BY con funciones de agregación',
      sql: `
        SELECT department, 
               COUNT(*) as employee_count, 
               AVG(salary) as avg_salary,
               MIN(salary) as min_salary,
               MAX(salary) as max_salary
        FROM employees
        GROUP BY department
        HAVING AVG(salary) > 50000
      `
    },
    {
      name: 'ORDER BY con múltiples columnas',
      sql: `
        SELECT id, name, price, stock
        FROM products
        WHERE category = 'electronics'
        ORDER BY price DESC, stock DESC
        LIMIT 20 OFFSET 40
      `
    }
  ];
  
  // Ejecutar las pruebas
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Prueba ${index + 1}: ${testCase.name} ---`);
    console.log(`SQL: ${testCase.sql}`);
    
    const parseResult = tester.parseSQL(testCase.sql);
    
    if (!parseResult.success) {
      console.log(`❌ Error al analizar SQL: ${parseResult.error}`);
      return;
    }
    
    console.log('\n=== Análisis de cláusulas ===');
    
    // Analizar SELECT
    const selectAnalysis = tester.analyzeSelectClause(parseResult.ast);
    console.log('\n>> Cláusula SELECT:');
    console.log(JSON.stringify(selectAnalysis, null, 2));
    
    // Analizar FROM
    const fromAnalysis = tester.analyzeFromClause(parseResult.ast);
    console.log('\n>> Cláusula FROM:');
    console.log(JSON.stringify(fromAnalysis, null, 2));
    
    // Analizar WHERE
    const whereAnalysis = tester.analyzeWhereClause(parseResult.ast);
    console.log('\n>> Cláusula WHERE:');
    console.log(JSON.stringify(whereAnalysis.exists ? whereAnalysis.structure : whereAnalysis.message, null, 2));
    
    // Analizar GROUP BY
    const groupByAnalysis = tester.analyzeGroupByClause(parseResult.ast);
    console.log('\n>> Cláusula GROUP BY:');
    console.log(JSON.stringify(groupByAnalysis, null, 2));
    
    // Analizar HAVING
    const havingAnalysis = tester.analyzeHavingClause(parseResult.ast);
    console.log('\n>> Cláusula HAVING:');
    console.log(JSON.stringify(havingAnalysis, null, 2));
    
    // Analizar ORDER BY
    const orderByAnalysis = tester.analyzeOrderByClause(parseResult.ast);
    console.log('\n>> Cláusula ORDER BY:');
    console.log(JSON.stringify(orderByAnalysis, null, 2));
    
    // Analizar LIMIT
    const limitAnalysis = tester.analyzeLimitClause(parseResult.ast);
    console.log('\n>> Cláusula LIMIT:');
    console.log(JSON.stringify(limitAnalysis, null, 2));
    
    console.log('\n-------------------------------------------');
  });
}

// Ejecutar las pruebas
testSQLClauses();