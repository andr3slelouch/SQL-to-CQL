import { Controller, Post, Body, Headers, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { TranslatorService } from '../sql-translator/services/translator.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionCacheService } from '../sql-translator/services/permission-cache.service';
import { SqlParserService } from '../sql-parser/sql-parser.service';
import { ResponseFormatterService } from '../sql-translator/services/response-formatter.service';

@Controller('translator')
export class TranslatorController {
  constructor(
    private readonly translatorService: TranslatorService,
    private readonly permissionCacheService: PermissionCacheService,
    private readonly sqlParserService: SqlParserService,
    private readonly responseFormatterService: ResponseFormatterService
  ) {}

  @Post('translate')
  @UseGuards(AuthGuard('jwt'))
  async translateSQL(@Body() body: { sql: string }) {
    const result = this.translatorService.translateSQL(body.sql);
    
    // Determinar el tipo de operación para formatear la respuesta
    const tipoOperacion = this.determinarTipoOperacion(body.sql);
    
    // Formatear la respuesta con mensajes personalizados
    return this.responseFormatterService.formatResponse(result, tipoOperacion);
  }

  @Post('execute')
  @UseGuards(AuthGuard('jwt'))
  async executeSQL(
    @Body() body: { sql: string }, 
    @Headers('authorization') authorization: string,
    @Request() req
  ) {
    // Extraer el token sin el prefijo "Bearer "
    const token = authorization.replace('Bearer ', '');
    
    // Determinar el tipo de operación SQL
    const tipoOperacion = this.determinarTipoOperacion(body.sql);
    
    // Verificar permiso si se pudo determinar el tipo de operación
    if (tipoOperacion && req.user && req.user.cedula) {
      const tienePermiso = await this.permissionCacheService.tienePermiso(
        req.user.cedula,
        tipoOperacion,
        token
      );
      
      if (!tienePermiso) {
        throw new ForbiddenException(`No tienes permiso para realizar operaciones de tipo ${tipoOperacion}`);
      }
    }
    
    // Si tiene permiso, continuar con la ejecución
    const result = await this.translatorService.translateAndExecute(body.sql, {
      executeInCassandra: true,
      token: token,
      user: req.user
    });
    
    // Formatear la respuesta con mensajes personalizados
    return this.responseFormatterService.formatResponse(result, tipoOperacion);
  }
  
  private determinarTipoOperacion(sql: string): string {
    try {
      // Parsear la sentencia SQL
      const parseResult = this.sqlParserService.parseSQL(sql);
      
      if (!parseResult.success || !parseResult.ast) {
        return 'UNKNOWN';
      }
      
      const ast = parseResult.ast;
      const statement = Array.isArray(ast) ? ast[0] : ast;
      
      if (!statement || !statement.type) {
        return 'UNKNOWN';
      }
      
      // Para sentencias USE
      if (statement.type === 'use') {
        return 'USE';
      }
      
      // Para sentencias SELECT
      if (statement.type === 'select') {
        return 'SELECT';
      }
      
      // Para sentencias INSERT
      if (statement.type === 'insert') {
        return 'INSERT';
      }
      
      // Para sentencias UPDATE
      if (statement.type === 'update') {
        return 'UPDATE';
      }
      
      // Para sentencias DELETE
      if (statement.type === 'delete') {
        return 'DELETE';
      }
      
      // Para sentencias DESCRIBE
      if (statement.type === 'describe') {
        if (statement.target === 'keyspaces') {
          return 'DESCRIBE KEYSPACES';
        }
        if (statement.target === 'tables') {
          return 'DESCRIBE TABLES';
        }
        if (statement.target === 'table') {
          return 'DESCRIBE TABLE';
        }
      }
      
      // Para sentencias CREATE
      if (statement.type === 'create') {
        if (statement.keyword === 'database' || statement.keyword === 'keyspace') {
          return 'CREATE KEYSPACE';
        }
        if (statement.keyword === 'table') {
          return 'CREATE TABLE';
        }
        if (statement.keyword === 'index') {
          return 'CREATE INDEX';
        }
      }
      
      // Para sentencias ALTER
      if (statement.type === 'alter') {
        if (statement.keyword === 'keyspace') {
          return 'ALTER KEYSPACE';
        }
        if (statement.keyword === 'table') {
          if (statement.action === 'add') {
            return 'ALTER TABLE ADD';
          }
          if (statement.action === 'drop') {
            return 'ALTER TABLE DROP';
          }
          if (statement.action === 'rename') {
            return 'ALTER TABLE RENAME';
          }
        }
      }
      
      // Para sentencias DROP
      if (statement.type === 'drop') {
        if (statement.keyword === 'keyspace') {
          return 'DROP KEYSPACE';
        }
        if (statement.keyword === 'table') {
          return 'DROP TABLE';
        }
        if (statement.keyword === 'index') {
          return 'DROP INDEX';
        }
      }
      
      // Para sentencias TRUNCATE
      if (statement.type === 'truncate') {
        return 'TRUNCATE TABLE';
      }
      
      // Para otros tipos no manejados específicamente, devolver el tipo en mayúsculas
      return statement.type.toUpperCase();
      
    } catch (error) {
      console.error('Error al determinar tipo de operación:', error);
      return 'UNKNOWN';
    }
  }
}