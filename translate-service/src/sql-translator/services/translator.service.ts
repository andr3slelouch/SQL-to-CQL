// src/sql-translator/services/translator.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SqlParserService } from '../../sql-parser/sql-parser.service';
import { SqlToCqlResult, TranslationOptions } from '../interfaces/sql-to-cql.interface';
import { Translator } from '../interfaces/translator.interface';
import { ExecutionTranslator } from '../translators/execution.translator';
import { DatabaseTranslator } from '../translators/database.translator';
import { DeleteTranslator } from '../translators/delete.translator';
import { IndexTranslator } from '../translators/index.translator';
import { InsertTranslator } from '../translators/insert.translator';
import { OperatorsTranslator } from '../translators/operators.translator';
import { SelectTranslator } from '../translators/select.translator';
import { TableTranslator } from '../translators/table.translator';
import { UpdateTranslator } from '../translators/update.translator';
import { ViewTranslator } from '../translators/view.translator';

@Injectable()
export class TranslatorService implements OnModuleInit {
  private readonly logger = new Logger(TranslatorService.name);
  private translators: Translator[] = [];

  constructor(
    private readonly sqlParserService: SqlParserService,
    private readonly executionTranslator: ExecutionTranslator,
    private readonly databaseTranslator: DatabaseTranslator,
    private readonly deleteTranslator: DeleteTranslator,
    private readonly indexTranslator: IndexTranslator,
    private readonly insertTranslator: InsertTranslator,
    private readonly operatorsTranslator: OperatorsTranslator,
    private readonly selectTranslator: SelectTranslator,
    private readonly tableTranslator: TableTranslator,
    private readonly updateTranslator: UpdateTranslator,
    private readonly viewTranslator: ViewTranslator
  ) {}

  /**
   * Inicializa el servicio registrando todos los traductores
   */
  onModuleInit() {
    // Registrar todos los traductores disponibles
    this.registerTranslator(this.databaseTranslator);
    this.registerTranslator(this.deleteTranslator);
    this.registerTranslator(this.indexTranslator);
    this.registerTranslator(this.insertTranslator);
    this.registerTranslator(this.operatorsTranslator);
    this.registerTranslator(this.selectTranslator);
    this.registerTranslator(this.tableTranslator);
    this.registerTranslator(this.updateTranslator);
    this.registerTranslator(this.viewTranslator);

    this.logger.log(`Se han registrado ${this.translators.length} traductores`);
  }

  /**
   * Registra un traductor en el servicio
   * @param translator Implementación del traductor
   */
  registerTranslator(translator: Translator): void {
    this.translators.push(translator);
  }

  /**
   * MÉTODO AUXILIAR: Procesa la sentencia SQL para casos especiales
   * @param sql Sentencia SQL original
   * @returns Sentencia SQL procesada o la original si no requiere procesamiento
   */
  private procesarSentenciaEspecial(sql: string): string | null {
    const sqlTrim = sql.trim();
    const sqlUpper = sqlTrim.toUpperCase();
    
    // Caso especial: DESCRIBE TABLE nombreTabla
    if (sqlUpper.startsWith('DESCRIBE TABLE ') || sqlUpper.startsWith('DESC TABLE ')) {
      const prefix = sqlUpper.startsWith('DESCRIBE TABLE ') ? 'DESCRIBE TABLE ' : 'DESC TABLE ';
      const tableName = sqlTrim.substring(prefix.length).trim();
      if (tableName) {
        this.logger.log(`Detectado comando DESCRIBE TABLE para tabla: ${tableName}`);
        return `DESCRIBE TABLE ${tableName}`;
      }
    }
    
    // Caso especial: SHOW DATABASES/SCHEMAS
    if (sqlUpper === 'SHOW DATABASES' || sqlUpper === 'SHOW SCHEMAS') {
      this.logger.log(`Detectado comando SHOW DATABASES/SCHEMAS, traduciendo a DESCRIBE KEYSPACES`);
      return 'DESCRIBE KEYSPACES';
    }
    
    // No es un caso especial, devolver null para indicar que se debe procesar normalmente
    return null;
  }

  /**
   * Traduce una sentencia SQL a CQL
   * @param sql Sentencia SQL a traducir
   * @param options Opciones de traducción
   * @returns Resultado de la traducción
   */
  translateSQL(sql: string, options: TranslationOptions = {}): SqlToCqlResult {
    try {
      // NUEVO: Procesamiento especial para comandos problemáticos
      const sentenciaEspecial = this.procesarSentenciaEspecial(sql);
      if (sentenciaEspecial) {
        this.logger.log(`Usando traducción especial para: "${sql}" -> "${sentenciaEspecial}"`);
        return {
          success: true,
          cql: sentenciaEspecial
        };
      }
      
      // Parsear la sentencia SQL
      const parseResult = this.sqlParserService.parseSQL(sql);
      
      if (!parseResult.success) {
        // NUEVO: Intentar manejar casos de error específicos
        if (sql.toUpperCase().startsWith('DESCRIBE TABLE') || sql.toUpperCase().startsWith('DESC TABLE')) {
          const parts = sql.split(' ');
          if (parts.length >= 3) {
            const tableName = parts.slice(2).join(' ').trim();
            this.logger.log(`Recuperando de error de parsing para DESCRIBE TABLE: ${tableName}`);
            return {
              success: true,
              cql: `DESCRIBE TABLE ${tableName}`
            };
          }
        }
        
        return {
          success: false,
          error: `Error de sintaxis SQL: ${parseResult.error}`
        };
      }
      
      // Si solo se pide validación, terminar aquí
      if (options.validateOnly) {
        return { success: true };
      }
      
      // Buscar un traductor que pueda manejar el AST
      const ast = parseResult.ast;
      const statement = Array.isArray(ast) ? ast[0] : ast;
      
      // Agregar log para depuración
      this.logger.debug(`AST a traducir: ${JSON.stringify(statement)}`);
      
      const translator = this.findTranslator(statement);
      
      if (!translator) {
        return {
          success: false,
          error: `No se encontró un traductor para la sentencia de tipo: ${statement.type}`
        };
      }
      
      // Traducir el AST a CQL
      const cql = translator.translate(statement);
      
      if (!cql) {
        return {
          success: false,
          error: 'No se pudo traducir la sentencia SQL a CQL'
        };
      }
      
      return {
        success: true,
        cql
      };
    } catch (error) {
      this.logger.error(`Error al traducir SQL a CQL: ${error.message}`);
      
      if (options.throwOnError) {
        throw error;
      }
      
      return {
        success: false,
        error: `Error en la traducción: ${error.message}`
      };
    }
  }
  
  /**
   * Traduce y opcionalmente ejecuta una sentencia SQL en Cassandra
   * @param sql Sentencia SQL a traducir
   * @param options Opciones de traducción y ejecución (incluye token y usuario)
   * @returns Resultado de la traducción y ejecución
   */
  async translateAndExecute(sql: string, options: TranslationOptions & { token?: string, user?: any } = {}): Promise<SqlToCqlResult> {
    // NUEVO: Procesar la sentencia SQL para casos especiales
    const sentenciaEspecial = this.procesarSentenciaEspecial(sql);
    if (sentenciaEspecial) {
      this.logger.log(`Usando sentencia especial para ejecución: "${sql}" -> "${sentenciaEspecial}"`);
      sql = sentenciaEspecial;
    }
    
    // Primero traducir
    const translationResult = this.translateSQL(sql, options);
    
    // Si la traducción falló o no se pide ejecución, retornar solo la traducción
    if (!translationResult.success || 
        !options.executeInCassandra || 
        !translationResult.cql) {
      return translationResult;
    }
    
    try {
      // Ejecutar la consulta CQL en Cassandra
      const executionResult = await this.executionTranslator.execute(translationResult.cql, {
        token: options.token,
        user: options.user
      });
      
      return {
        ...translationResult,
        executionResult: {
          success: executionResult.success,
          data: executionResult.result,
          error: executionResult.error
        }
      };
    } catch (error) {
      this.logger.error(`Error durante la ejecución en Cassandra: ${error.message}`);
      
      return {
        ...translationResult,
        executionResult: {
          success: false,
          error: `Error durante la ejecución: ${error.message}`
        }
      };
    }
  }
  
  /**
   * Ejecuta directamente una consulta CQL en Cassandra
   * @param cql Consulta CQL a ejecutar
   * @param options Opciones adicionales (token y usuario)
   * @returns Resultado de la ejecución
   */
  async executeCQL(cql: string, options: { token?: string, user?: any } = {}): Promise<any> {
    try {
      const executionResult = await this.executionTranslator.execute(cql, options);
      return {
        success: executionResult.success,
        result: executionResult.result,
        error: executionResult.error
      };
    } catch (error) {
      this.logger.error(`Error al ejecutar CQL: ${error.message}`);
      return {
        success: false,
        error: `Error en la ejecución: ${error.message}`
      };
    }
  }
  
  /**
   * Busca un traductor que pueda manejar el AST proporcionado
   * @param ast AST generado por el parser SQL
   * @returns Traductor que puede manejar el AST o null si no se encuentra
   */
  private findTranslator(ast: any): Translator | null {
    // Log para depuración
    this.logger.debug(`Buscando traductor para AST de tipo: ${ast.type}, keyword: ${ast.keyword || 'N/A'}`);
    
    for (const translator of this.translators) {
      if (translator.canHandle(ast)) {
        this.logger.debug(`Traductor encontrado: ${translator.constructor.name}`);
        return translator;
      }
    }
    
    this.logger.warn(`No se encontró traductor para AST de tipo: ${ast.type}`);
    return null;
  }
}