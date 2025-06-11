// src/modules/permissions/services/delete-keyspace.service.ts
import { Injectable, NotFoundException, InternalServerErrorException, Inject, Logger, BadRequestException } from '@nestjs/common';
import { Client } from 'cassandra-driver';
import { CASSANDRA_CLIENT } from '../../../database/cassandra.provider';
import { UserFinderUtil } from '../../../common/utils/user-finder.util';
import { DeleteKeyspaceDto } from '../dto/delete-keyspace.dto';

export interface DeleteKeyspaceResponse {
  keyspace: string;
  message: string;
  affectedUsers: Array<{
    cedula: string;
    nombre: string;
    removedKeyspace: boolean;
  }>;
  keyspaceDeleted: boolean;
}

@Injectable()
export class DeleteKeyspaceService {
  private readonly logger = new Logger(DeleteKeyspaceService.name);

  constructor(
    @Inject(CASSANDRA_CLIENT)
    private cassandraClient: Client,
    private userFinderUtil: UserFinderUtil
  ) {}

  /**
   * Busca un keyspace por nombre para verificar que existe
   * @param keyspaceName Nombre del keyspace a buscar
   * @returns Información del keyspace si existe
   */
  async searchKeyspace(keyspaceName: string): Promise<{ exists: boolean; keyspace?: string; tables?: string[] }> {
    try {
      // Verificar que el keyspace existe
      const keyspaceQuery = 'SELECT keyspace_name FROM system_schema.keyspaces WHERE keyspace_name = ?';
      const keyspaceResult = await this.cassandraClient.execute(keyspaceQuery, [keyspaceName], { prepare: true });

      if (keyspaceResult.rowLength === 0) {
        return { exists: false };
      }

      // Obtener las tablas del keyspace
      const tablesQuery = 'SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?';
      const tablesResult = await this.cassandraClient.execute(tablesQuery, [keyspaceName], { prepare: true });
      const tables = tablesResult.rows.map(row => row.table_name);

      this.logger.log(`Keyspace encontrado: ${keyspaceName} con ${tables.length} tablas`);

      return {
        exists: true,
        keyspace: keyspaceName,
        tables: tables
      };
    } catch (error) {
      this.logger.error(`Error al buscar keyspace ${keyspaceName}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Error al buscar keyspace ${keyspaceName}`);
    }
  }

  /**
   * Obtiene todos los usuarios que tienen acceso a un keyspace específico
   * @param keyspaceName Nombre del keyspace
   * @returns Lista de usuarios con acceso al keyspace
   */
  async getUsersWithKeyspaceAccess(keyspaceName: string): Promise<Array<{ cedula: string; nombre: string; rol: boolean }>> {
    try {
      // Buscar todos los usuarios que tienen este keyspace en sus permisos
      const query = 'SELECT cedula, keyspaces FROM auth.permissions';
      const result = await this.cassandraClient.execute(query);

      const usersWithAccess: Array<{ cedula: string; nombre: string; rol: boolean }> = [];

      for (const row of result.rows) {
        const userKeyspaces = row.keyspaces || [];
        if (userKeyspaces.includes(keyspaceName)) {
          // Obtener información del usuario
          const user = await this.userFinderUtil.findByCedula(row.cedula);
          if (user) {
            usersWithAccess.push({
              cedula: row.cedula,
              nombre: user.nombre,
              rol: user.rol
            });
          }
        }
      }

      this.logger.log(`Encontrados ${usersWithAccess.length} usuarios con acceso al keyspace ${keyspaceName}`);
      return usersWithAccess;
    } catch (error) {
      this.logger.error(`Error al obtener usuarios con acceso al keyspace ${keyspaceName}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Error al obtener usuarios con acceso al keyspace ${keyspaceName}`);
    }
  }

  /**
   * Elimina un keyspace y todos los permisos asociados
   * @param deleteKeyspaceDto DTO con el nombre del keyspace a eliminar
   * @returns Resultado de la operación de eliminación
   */
  async deleteKeyspace(deleteKeyspaceDto: DeleteKeyspaceDto): Promise<DeleteKeyspaceResponse> {
    const { keyspaceName, confirmDeletion } = deleteKeyspaceDto;

    try {
      // Verificar que el keyspace existe
      const keyspaceInfo = await this.searchKeyspace(keyspaceName);
      if (!keyspaceInfo.exists) {
        throw new NotFoundException(`El keyspace '${keyspaceName}' no existe`);
      }

      // Verificar que se confirmó la eliminación
      if (!confirmDeletion) {
        throw new BadRequestException('Debe confirmar la eliminación del keyspace estableciendo confirmDeletion en true');
      }

      // Verificar que no es un keyspace del sistema
      const systemKeyspaces = ['system', 'system_auth', 'system_distributed', 'system_schema', 'system_traces'];
      if (systemKeyspaces.includes(keyspaceName)) {
        throw new BadRequestException(`No se puede eliminar el keyspace del sistema: ${keyspaceName}`);
      }

      this.logger.log(`Iniciando eliminación del keyspace: ${keyspaceName}`);

      // Paso 1: Obtener todos los usuarios que tienen acceso a este keyspace
      const usersWithAccess = await this.getUsersWithKeyspaceAccess(keyspaceName);
      const affectedUsers: Array<{
        cedula: string;
        nombre: string;
        removedKeyspace: boolean;
      }> = [];

      // Paso 2: Remover el keyspace de los permisos de todos los usuarios
      for (const user of usersWithAccess) {
        try {
          await this.removeKeyspaceFromUser(user.cedula, keyspaceName);
          affectedUsers.push({
            cedula: user.cedula,
            nombre: user.nombre,
            removedKeyspace: true
          });
          this.logger.log(`Keyspace ${keyspaceName} removido de los permisos del usuario ${user.cedula}`);
        } catch (error) {
          this.logger.error(`Error al remover keyspace de usuario ${user.cedula}: ${error.message}`);
          affectedUsers.push({
            cedula: user.cedula,
            nombre: user.nombre,
            removedKeyspace: false
          });
        }
      }

      // Paso 3: Eliminar el keyspace de Cassandra
      let keyspaceDeleted = false;
      try {
        const dropKeyspaceQuery = `DROP KEYSPACE IF EXISTS "${keyspaceName}"`;
        await this.cassandraClient.execute(dropKeyspaceQuery);
        keyspaceDeleted = true;
        this.logger.log(`Keyspace ${keyspaceName} eliminado exitosamente de Cassandra`);
      } catch (error) {
        this.logger.error(`Error al eliminar keyspace ${keyspaceName} de Cassandra: ${error.message}`);
        throw new InternalServerErrorException(`Error al eliminar keyspace ${keyspaceName} de la base de datos`);
      }

      const response: DeleteKeyspaceResponse = {
        keyspace: keyspaceName,
        message: `Keyspace '${keyspaceName}' eliminado exitosamente. Se removieron los permisos de ${affectedUsers.filter(u => u.removedKeyspace).length} usuarios.`,
        affectedUsers: affectedUsers,
        keyspaceDeleted: keyspaceDeleted
      };

      this.logger.log(`Eliminación del keyspace ${keyspaceName} completada exitosamente`);
      return response;

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al eliminar keyspace ${keyspaceName}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Error al eliminar keyspace ${keyspaceName}`);
    }
  }

  /**
   * Remueve un keyspace específico de los permisos de un usuario
   * @param cedula Cédula del usuario
   * @param keyspaceName Nombre del keyspace a remover
   */
  private async removeKeyspaceFromUser(cedula: string, keyspaceName: string): Promise<void> {
    try {
      // Obtener los keyspaces actuales del usuario
      const query = 'SELECT keyspaces FROM auth.permissions WHERE cedula = ?';
      const result = await this.cassandraClient.execute(query, [cedula], { prepare: true });

      if (result.rowLength === 0) {
        // El usuario no tiene permisos registrados
        return;
      }

      const permissions = result.first();
      let userKeyspaces = permissions.keyspaces || [];

      // Remover el keyspace de la lista
      userKeyspaces = userKeyspaces.filter(ks => ks !== keyspaceName);

      // Actualizar los permisos del usuario
      const updateQuery = 'UPDATE auth.permissions SET keyspaces = ? WHERE cedula = ?';
      await this.cassandraClient.execute(updateQuery, [userKeyspaces, cedula], { prepare: true });

    } catch (error) {
      this.logger.error(`Error al remover keyspace ${keyspaceName} del usuario ${cedula}: ${error.message}`);
      throw error;
    }
  }
}