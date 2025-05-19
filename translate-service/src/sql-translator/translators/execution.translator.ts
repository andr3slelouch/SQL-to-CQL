// src/sql-translator/translators/execution.translator.ts
import { Injectable, Logger } from '@nestjs/common';
import { Translator } from '../interfaces/translator.interface';
import { CassandraService } from '../cassandra-connection/cassandra.service';
import { PermissionsApiService } from '../services/permissions-api.service';

@Injectable()
export class ExecutionTranslator implements Translator {
  private readonly logger = new Logger(ExecutionTranslator.name);

  constructor(
    private readonly cassandraService: CassandraService,
    private readonly permissionsApiService: PermissionsApiService
  ) {}

  canHandle(ast: any): boolean {
    
    return false;
  }

  translate(ast: any): string {
    return '';
  }

  /**
   * Ejecuta una consulta CQL en la base de datos Cassandra
   * y actualiza los permisos de keyspace si es necesario
   * @param cql Consulta CQL a ejecutar
   * @param options Opciones adicionales (token JWT, usuario)
   * @returns Resultado de la ejecución
   */
  async execute(cql: string, options?: { token?: string, user?: any }): Promise<any> {
    try {
      this.logger.debug(`Ejecutando CQL: ${cql}`);
      
      // Verificar si es una operación de keyspace que debería actualizar permisos
      const shouldUpdatePermissions = this.shouldUpdateKeyspacePermissions(cql);
      
      // Verificar si la consulta es un BATCH (para inserts múltiples)
      const isBatch = cql.includes('BEGIN BATCH') && cql.includes('APPLY BATCH');
      
      // Verificar si la consulta es un DROP INDEX
      const isDropIndex = cql.trim().toUpperCase().startsWith('DROP INDEX');
      
      let result;
      
      if (isBatch) {
        // Si es un BATCH, usar el método específico para ejecutar BATCH
        this.logger.log(`Detectado BATCH en consulta CQL, usando executeBatchFromString`);
        result = await this.cassandraService.executeBatchFromString(cql);
      } else if (isDropIndex) {
        // Manejo especial para DROP INDEX
        this.logger.log(`Detectado DROP INDEX, asegurando formato correcto: ${cql}`);
        // Asegurarse de que la consulta termina con punto y coma
        const finalCql = cql.trim().endsWith(';') ? cql : `${cql};`;
        result = await this.cassandraService.execute(finalCql);
      } else {
        // Ejecutar la consulta normal en Cassandra
        result = await this.cassandraService.execute(cql);
      }
      
      // Si es una operación relevante y tenemos un token y usuario, actualizar permisos
      if (shouldUpdatePermissions && options?.token && options?.user) {
        await this.updateKeyspacePermissions(cql, options.token, options.user);
      }

      return {
        success: true,
        result
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
   * Verifica si la consulta es una operación de keyspace que debería actualizar permisos
   * @param cql Consulta CQL a verificar
   * @returns true si es una operación que debería actualizar permisos
   */
  private shouldUpdateKeyspacePermissions(cql: string): boolean {
    // Normalizar la consulta para simplificar la detección
    const normalizedCql = cql.trim().toUpperCase();
    
    // Verificar si es CREATE KEYSPACE o DROP KEYSPACE
    return normalizedCql.startsWith('CREATE KEYSPACE') || normalizedCql.startsWith('DROP KEYSPACE');
  }

  /**
   * Actualiza los permisos de keyspace en la tabla de permisos
   * @param cql Consulta CQL que contiene la operación de keyspace
   * @param token Token JWT del usuario que realiza la operación
   * @param user Información del usuario
   */
  private async updateKeyspacePermissions(cql: string, token: string, user: any): Promise<void> {
    try {
      // Normalizar la consulta para simplificar la detección
      const normalizedCql = cql.trim().toUpperCase();
      
      // Extraer detalles de la operación
      const isCreate = normalizedCql.startsWith('CREATE KEYSPACE');
      const operation = isCreate ? 'CREATE' : 'DROP';
      
      // Extraer el nombre del keyspace
      let keyspaceName = '';
      
      if (isCreate) {
        // Patrón para CREATE KEYSPACE [IF NOT EXISTS] keyspace_name
        const createMatch = normalizedCql.match(/CREATE\s+KEYSPACE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
        if (createMatch && createMatch[1]) {
          keyspaceName = createMatch[1];
        }
      } else {
        // Patrón para DROP KEYSPACE [IF EXISTS] keyspace_name
        const dropMatch = normalizedCql.match(/DROP\s+KEYSPACE\s+(?:IF\s+EXISTS\s+)?(\w+)/i);
        if (dropMatch && dropMatch[1]) {
          keyspaceName = dropMatch[1];
        }
      }
      
      if (!keyspaceName) {
        this.logger.warn(`No se pudo extraer el nombre del keyspace de la consulta: ${cql}`);
        return;
      }
      
      // Obtener la cédula del usuario
      const cedula = user.cedula;
      
      if (!cedula) {
        this.logger.warn('No se pudo obtener la cédula del usuario');
        return;
      }
      
      // Actualizar los keyspaces en la tabla de permisos
      await this.permissionsApiService.updateUserKeyspace(
        cedula,
        keyspaceName,
        isCreate, // true si es CREATE, false si es DROP
        token
      );
      
      this.logger.log(`Permisos de keyspace actualizados para el usuario ${cedula}: ${operation} ${keyspaceName}`);
    } catch (error) {
      this.logger.error(`Error al actualizar permisos de keyspace: ${error.message}`, error.stack);
    }
  }
}