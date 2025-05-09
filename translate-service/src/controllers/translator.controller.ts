import { Controller, Post, Body, Headers, UseGuards, Request, ForbiddenException, Logger } from '@nestjs/common';
import { TranslatorService } from '../sql-translator/services/translator.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionCacheService } from '../sql-translator/services/permission-cache.service';
import { SqlParserService } from '../sql-parser/sql-parser.service';
import { ResponseFormatterService } from '../sql-translator/services/response-formatter.service';
import { TranslationOptions } from '../sql-translator/interfaces/sql-to-cql.interface';

// Lista oficial de operaciones permitidas
const AVAILABLE_OPERATIONS = [
  'CREATE KEYSPACE',
  'ALTER KEYSPACE',
  'DROP KEYSPACE',
  'DESCRIBE KEYSPACES',
  'USE',
  'CREATE TABLE',
  'ALTER TABLE ADD',
  'ALTER TABLE DROP',
  'ALTER TABLE RENAME',
  'DROP TABLE',
  'TRUNCATE TABLE',
  'DESCRIBE TABLES',
  'DESCRIBE TABLE',
  'CREATE INDEX',
  'DROP INDEX',
  'INSERT',
  'UPDATE',
  'DELETE',
  'SELECT'
];

@Controller('translator')
export class TranslatorController {
  private readonly logger = new Logger(TranslatorController.name);

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
    const formattedResponse = this.responseFormatterService.formatResponse(result, tipoOperacion);
    return formattedResponse;
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
    this.logger.log(`[TRANSLATOR] Solicitud de ejecución SQL: "${body.sql}"`);
    this.logger.log(`[TRANSLATOR] Usuario: ${JSON.stringify(req.user)}`);

    // NUEVO: Procesar la sentencia SQL para manejar "DESCRIBE TABLE nombreTabla"
    const sqlProcesado = this.procesarSentenciaSQL(body.sql);
    if (sqlProcesado !== body.sql) {
      this.logger.log(`[TRANSLATOR] SQL procesado: "${sqlProcesado}" (original: "${body.sql}")`);
      body.sql = sqlProcesado;
    }

    // Determinar el tipo de operación SQL
    const tipoOperacion = this.determinarTipoOperacion(body.sql);
    this.logger.log(`[TRANSLATOR] Tipo de operación detectada: ${tipoOperacion}`);

    // Verificar permiso si se pudo determinar el tipo de operación
    if (tipoOperacion && req.user && req.user.cedula) {
      this.logger.log(`[TRANSLATOR] Verificando permisos para cedula: ${req.user.cedula}, 
        operación: ${tipoOperacion}`);
      const inicioVerificacion = Date.now();
      const tienePermiso = await this.permissionCacheService.tienePermiso(
        req.user.cedula,
        tipoOperacion,
        token
      );
      const finVerificacion = Date.now();
      this.logger.log(`[TRANSLATOR] Tiempo verificación de permisos: ${finVerificacion - inicioVerificacion}ms`);
      this.logger.log(`[TRANSLATOR] Resultado verificación: ${tienePermiso ? 'AUTORIZADO' : 'DENEGADO'}`);

      if (!tienePermiso) {
        this.logger.log(`[TRANSLATOR] Acceso denegado para usuario ${req.user.cedula}, 
          operación ${tipoOperacion}`);
        throw new ForbiddenException(`No tienes permiso para realizar operaciones de tipo ${tipoOperacion}`);
      }
    }

    // Si tiene permiso, continuar con la ejecución
    this.logger.log(`[TRANSLATOR] Procediendo a ejecutar consulta SQL para usuario ${req.user.cedula}`);
    const options: TranslationOptions = {
      executeInCassandra: true,
      token: token,
      user: req.user
    };

    const resultado = await this.translatorService.translateAndExecute(body.sql, options);
    this.logger.log(`[TRANSLATOR] Ejecución completada con éxito: ${resultado.success}`);

    // Formatear la respuesta con mensajes personalizados
    const formattedResponse = this.responseFormatterService.formatResponse(resultado, tipoOperacion);
    return formattedResponse;
  }

  /**
   * NUEVO: Método para procesar la sentencia SQL antes de ejecutarla
   * Ajusta la sintaxis de ciertos comandos problemáticos como "DESCRIBE TABLE"
   * @param sql Sentencia SQL original
   * @returns Sentencia SQL procesada
   */
  private procesarSentenciaSQL(sql: string): string {
    const sqlTrim = sql.trim();
    const sqlUpper = sqlTrim.toUpperCase();
    
    // Manejo de DESCRIBE TABLE nombreTabla
    if (sqlUpper.startsWith('DESCRIBE TABLE ') || sqlUpper.startsWith('DESC TABLE ')) {
      const partes = sqlTrim.split(' ');
      if (partes.length >= 3) {
        // Extraer el nombre de la tabla (puede tener espacios)
        const tableName = partes.slice(2).join(' ').trim();
        // Componer la sentencia CQL directamente
        this.logger.log(`[TRANSLATOR] Ajustando sentencia DESCRIBE TABLE para tabla: ${tableName}`);
        return `DESCRIBE TABLE ${tableName}`;
      }
    }
    
    // Manejo de SHOW DATABASES
    if (sqlUpper === 'SHOW DATABASES' || sqlUpper === 'SHOW SCHEMAS') {
      this.logger.log(`[TRANSLATOR] Ajustando sentencia SHOW DATABASES/SCHEMAS a DESCRIBE KEYSPACES`);
      return 'DESCRIBE KEYSPACES';
    }
    
    // Si no se necesita ajuste, devolver la sentencia original
    return sql;
  }

  /**
   * Endpoint para invalidar la caché de permisos
   * No se requiere autenticación para permitir comunicación entre microservicios
   */
  @Post('cache/invalidate')
  async invalidateCache(@Body() body: { cedula?: string }) {
    if (body.cedula) {
      this.logger.log(`[TRANSLATOR] Recibida solicitud para invalidar caché de permisos para usuario: ${body.cedula}`);
      this.permissionCacheService.limpiarCacheUsuario(body.cedula);
      return { 
        success: true, 
        message: `Caché de permisos invalidado para usuario ${body.cedula}`
      };
    } else {
      this.logger.log(`[TRANSLATOR] Recibida solicitud para invalidar toda la caché de permisos`);
      this.permissionCacheService.limpiarTodaLaCache();
      return { 
        success: true, 
        message: 'Caché de permisos completamente invalidado'
      };
    }
  }

  /**
   * Determina el tipo de operación SQL y lo normaliza al formato estándar
   * @param sql Sentencia SQL a analizar
   * @returns Tipo de operación normalizado según AVAILABLE_OPERATIONS
   */
  private determinarTipoOperacion(sql: string): string {
    try {
      // Verificar abreviaturas comunes antes del parsing
      const sqlUpper = sql.trim().toUpperCase();

      // MODIFICADO: Detección especial para DESCRIBE TABLE
      if (sqlUpper.startsWith('DESCRIBE TABLE ') || sqlUpper.startsWith('DESC TABLE ')) {
        this.logger.log(`[TRANSLATOR] Detectado comando DESCRIBE TABLE: ${sqlUpper}`);
        return 'DESCRIBE TABLE';
      }

      // MODIFICADO: Manejo especial para SHOW DATABASES/SCHEMAS y variantes
      if (sqlUpper === 'SHOW DATABASES' || 
          sqlUpper === 'SHOW SCHEMAS' || 
          sqlUpper.startsWith('SHOW DATABASE') ||
          sqlUpper.startsWith('SHOW SCHEMA')) {
        this.logger.log(`[TRANSLATOR] Detectado comando SHOW DATABASES/SCHEMAS: ${sqlUpper}`);
        return 'DESCRIBE KEYSPACES';
      }
      
      // Verificar tanto DESCRIBE KEYSPACES como SHOW DATABASES
      if (sqlUpper === 'DESC KEYSPACES' || sqlUpper === 'DESCRIBE KEYSPACES' || 
          sqlUpper.includes('KEYSPACES') || 
          sqlUpper === 'SHOW DATABASES' || sqlUpper === 'SHOW SCHEMAS' ||
          sqlUpper.includes('DATABASES')) {
        this.logger.log(`[TRANSLATOR] Detectada operación DESCRIBE KEYSPACES o equivalente: ${sqlUpper}`);
        return 'DESCRIBE KEYSPACES';
      }
      
      // Manejar casos especiales de DESC/DESCRIBE TABLES o SHOW TABLES
      if (sqlUpper === 'DESC TABLES' || sqlUpper === 'DESCRIBE TABLES' || 
          sqlUpper === 'SHOW TABLES' || sqlUpper.includes('TABLES')) {
        this.logger.log(`[TRANSLATOR] Detectada operación DESCRIBE TABLES o equivalente: ${sqlUpper}`);
        return 'DESCRIBE TABLES';
      }

      // Manejar casos generales de DESC/DESCRIBE sin especificar (asumimos TABLES)
      if (sqlUpper === 'DESC' || sqlUpper === 'DESCRIBE') {
        this.logger.log(`[TRANSLATOR] Detectada abreviatura DESC/DESCRIBE sin especificar, mapeando a DESCRIBE TABLES`);
        return 'DESCRIBE TABLES';
      }

      // Parsear la sentencia SQL
      const parseResult = this.sqlParserService.parseSQL(sql);
      if (!parseResult.success || !parseResult.ast) {
        // MODIFICADO: Manejar comandos específicos cuando el parser falla
        this.logger.warn(`[TRANSLATOR] No se pudo parsear la sentencia SQL: ${sql}`);
        
        // Manejar comandos DESCRIBE TABLE
        if (sqlUpper.startsWith('DESCRIBE ') || sqlUpper.startsWith('DESC ')) {
          // Si contiene la palabra TABLE
          if (sqlUpper.includes(' TABLE ')) {
            this.logger.log(`[TRANSLATOR] Extrayendo DESCRIBE TABLE desde SQL no parseado`);
            return 'DESCRIBE TABLE';
          }
          // Si no incluye TABLES o KEYSPACES, asumimos que es DESCRIBE para una tabla específica
          if (!sqlUpper.includes(' TABLES') && !sqlUpper.includes(' KEYSPACES')) {
            this.logger.log(`[TRANSLATOR] Asumiendo DESCRIBE TABLE para SQL no parseado`);
            return 'DESCRIBE TABLE';
          }
        }
        
        // Manejar comandos SHOW
        if (sqlUpper.startsWith('SHOW')) {
          if (sqlUpper.includes('DATABASE') || sqlUpper.includes('SCHEMA')) {
            this.logger.log(`[TRANSLATOR] Extrayendo SHOW DATABASES/SCHEMAS desde SQL no parseado`);
            return 'DESCRIBE KEYSPACES';
          }
          if (sqlUpper.includes('TABLE')) {
            this.logger.log(`[TRANSLATOR] Extrayendo SHOW TABLES desde SQL no parseado`);
            return 'DESCRIBE TABLES';
          }
        }
        
        return 'UNKNOWN';
      }

      const ast = parseResult.ast;
      const statement = Array.isArray(ast) ? ast[0] : ast;
      if (!statement || !statement.type) {
        this.logger.warn(`[TRANSLATOR] AST no válido o sin tipo definido`);
        return 'UNKNOWN';
      }

      // Mapear operación según el tipo y devolver en formato estándar
      return this.mapearOperacionAFormatoEstandar(statement, sqlUpper);
    } catch (error) {
      this.logger.error(`[TRANSLATOR] Error al determinar tipo de operación: ${error.message}`, 
        error.stack);
      return 'UNKNOWN';
    }
  }

  /**
   * Mapea una operación al formato estándar definido en AVAILABLE_OPERATIONS
   * @param statement Declaración SQL parseada
   * @param sqlUpper SQL original en mayúsculas (para casos donde el parsing no es 
   * suficiente)
   * @returns Operación normalizada
   */
  private mapearOperacionAFormatoEstandar(statement: any, sqlUpper: string): string {
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

    // MODIFICADO: Para sentencias DESCRIBE/SHOW
    if (statement.type === 'describe' || statement.type === 'desc' || 
        statement.type === 'show') {
      
      // DESCRIBE TABLE específico
      if ((statement.type === 'describe' || statement.type === 'desc') && 
          statement.table && typeof statement.table === 'string' &&
          statement.table !== 'tables' && statement.table !== 'keyspaces' &&
          statement.table !== 'databases' && statement.table !== 'schemas') {
        
        // Verificar si el SQL original contiene "TABLE" explícitamente
        if (sqlUpper.includes('TABLE')) {
          this.logger.log(`[TRANSLATOR] Detectado DESCRIBE TABLE para tabla específica: ${statement.table}`);
          return 'DESCRIBE TABLE';
        }
      }
      
      // Para SHOW DATABASES -> DESCRIBE KEYSPACES
      if (statement.type === 'show' && 
          (statement.keyword === 'databases' || statement.keyword === 'schemas')) {
        this.logger.log(`[TRANSLATOR] Detectado SHOW DATABASES/SCHEMAS, mapeando a DESCRIBE KEYSPACES`);
        return 'DESCRIBE KEYSPACES';
      }
      
      // Primero verificar si es KEYSPACES específicamente
      if (statement.target === 'keyspaces' ||
          (statement.keyword === 'databases' || statement.keyword === 'schemas') ||
          (sqlUpper.includes('KEYSPACES')) ||
          (sqlUpper.includes('DATABASES')) ||
          (sqlUpper.includes('SCHEMAS'))) {
        this.logger.log(`[TRANSLATOR] Detectado DESCRIBE KEYSPACES por AST o texto SQL`);
        return 'DESCRIBE KEYSPACES';
      }
      
      // Luego verificar si es TABLES específicamente
      if (statement.target === 'tables' ||
          (statement.keyword === 'tables') ||
          (sqlUpper.includes('TABLES'))) {
        this.logger.log(`[TRANSLATOR] Detectado DESCRIBE TABLES por AST o texto SQL`);
        return 'DESCRIBE TABLES';
      }
      
      // Si hay una tabla específica, es DESCRIBE TABLE
      if (statement.table && typeof statement.table === 'string' &&
          statement.table !== 'tables' && statement.table !== 'keyspaces' &&
          statement.table !== 'databases' && statement.table !== 'schemas') {
        this.logger.log(`[TRANSLATOR] Detectado DESCRIBE TABLE para tabla específica: ${statement.table}`);
        return 'DESCRIBE TABLE';
      }
      
      // Si llegamos aquí, asumimos que es DESCRIBE TABLES por defecto
      this.logger.log(`[TRANSLATOR] No se pudo determinar tipo específico de DESCRIBE/SHOW, usando DESCRIBE TABLES por defecto`);
      return 'DESCRIBE TABLES';
    }

    // Para sentencias CREATE
    if (statement.type === 'create') {
      if (statement.keyword === 'database' || statement.keyword === 'keyspace' || 
          statement.keyword === 'schema') {
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
      if (statement.keyword === 'database' || statement.keyword === 'keyspace' || 
          statement.keyword === 'schema') {
        return 'ALTER KEYSPACE';
      }
      if (statement.keyword === 'table') {
        // Analizar la acción específica de ALTER TABLE
        if (statement.action === 'add' ||
          (statement.expr && statement.expr[0] && statement.expr[0].action === 'add')) {
          return 'ALTER TABLE ADD';
        }
        if (statement.action === 'drop' ||
          (statement.expr && statement.expr[0] && statement.expr[0].action === 'drop')) {
          return 'ALTER TABLE DROP';
        }
        if (statement.action === 'rename' ||
          (statement.expr && statement.expr[0] && statement.expr[0].action === 'rename')) {
          return 'ALTER TABLE RENAME';
        }
        // Si no se puede determinar la acción específica, usar permiso genérico
        this.logger.warn(`[TRANSLATOR] No se pudo determinar acción específica de ALTER TABLE, usando permiso genérico`);
        return 'ALTER TABLE ADD'; // Como fallback
      }
    }

    // Para sentencias DROP
    if (statement.type === 'drop') {
      if (statement.keyword === 'database' || statement.keyword === 'keyspace' || 
          statement.keyword === 'schema') {
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

    // Verificar si alguna operación disponible contiene el tipo de operación
    const tipoOperacion = statement.type.toUpperCase();
    for (const operacion of AVAILABLE_OPERATIONS) {
      if (operacion.includes(tipoOperacion)) {
        return operacion;
      }
    }

    // Si no se encuentra en la lista, devolver como tipo desconocido
    this.logger.warn(`[TRANSLATOR] Tipo de operación no reconocido: ${tipoOperacion}`);
    return 'UNKNOWN';
  }
}