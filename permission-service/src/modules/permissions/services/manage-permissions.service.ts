import { Injectable, NotFoundException, InternalServerErrorException, Inject, Logger } from '@nestjs/common';
import { Client } from 'cassandra-driver';
import { CASSANDRA_CLIENT } from '../../../database/cassandra.provider';
import { UserFinderUtil } from '../../../common/utils/user-finder.util';
import { SearchUserDto } from '../dto/search-user.dto';
import { UpdateUserPermissionDto } from '../dto/update-user-permissions.dto';
import { UserPermissionsResponse } from '../../../common/interfaces/permissions.interface';
import { AVAILABLE_OPERATIONS, ADMIN_DEFAULT_OPERATIONS, 
USER_DEFAULT_OPERATIONS } from '../../../common/constants/operations.constants';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ManagePermissionsService {
  private readonly logger = new Logger(ManagePermissionsService.name);
  private readonly translatorServiceUrl: string;

  constructor(
    @Inject(CASSANDRA_CLIENT)
    private cassandraClient: Client,
    private userFinderUtil: UserFinderUtil,
    private httpService: HttpService,
    private configService: ConfigService
  ) {
    // Usamos la URL base sin prefijos adicionales
    this.translatorServiceUrl = this.configService.get<string>('TRANSLATOR_SERVICE_URL', 'http://localhost:3000');
    this.logger.log(`ManagePermissionsService inicializado con URL del servicio de traducción: ${this.translatorServiceUrl}`);
  }

  /**
   * Obtiene los permisos de un usuario
   * @param searchUserDto DTO con la cédula del usuario
   * @returns Permisos del usuario
   */
  async getUserPermissions(searchUserDto: SearchUserDto): Promise<UserPermissionsResponse> {
    const { cedula } = searchUserDto;
    try {
      // Buscar el usuario por cédula
      const user = await this.userFinderUtil.findByCedula(cedula);
      if (!user) {
        throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
      }

      // Obtener permisos del usuario de la tabla permissions
      const query = 'SELECT cedula, keyspaces, operaciones FROM auth.permissions WHERE cedula = ?';
      const result = await this.cassandraClient.execute(query, [cedula], { prepare: true });

      if (result.rowLength === 0) {
        // El usuario existe pero no tiene permisos registrados
        // Esto podría ocurrir si se eliminaron los permisos pero no el usuario
        return {
          cedula: cedula,
          nombre: user.nombre,
          rol: user.rol,
          operaciones: user.rol ? ADMIN_DEFAULT_OPERATIONS : USER_DEFAULT_OPERATIONS,
          operacionesDisponibles: AVAILABLE_OPERATIONS
        };
      }

      const permissions = result.first();
      // Si el usuario es admin, asegurarnos que tenga todas las operaciones disponibles
      let operaciones = permissions.operaciones || [];
      if (user.rol === true) {
        // Para administradores, siempre devolvemos todas las operaciones
        operaciones = [...ADMIN_DEFAULT_OPERATIONS];
      }

      return {
        cedula: cedula,
        nombre: user.nombre,
        rol: user.rol,
        operaciones: operaciones,
        operacionesDisponibles: AVAILABLE_OPERATIONS
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener permisos del usuario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al obtener permisos del usuario');
    }
  }

  /**
   * Actualiza un permiso específico del usuario o múltiples permisos a la vez
   * @param updateUserPermissionDto DTO con la cédula, operación/operaciones y estado
   * @returns Permisos actualizados del usuario
   */
  async updateUserPermission(updateUserPermissionDto: UpdateUserPermissionDto): Promise<UserPermissionsResponse> {
    const { cedula, operation, enabled, operations } = updateUserPermissionDto;
    try {
      // Buscar el usuario por cédula para verificar que existe y su rol
      const user = await this.userFinderUtil.findByCedula(cedula);
      if (!user) {
        throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
      }

      // Si el usuario es administrador, no permitimos modificar sus permisos
      if (user.rol === true) {
        this.logger.warn(`Intento de modificar permisos de un administrador: ${cedula}`);
        return {
          cedula: cedula,
          nombre: user.nombre,
          rol: user.rol,
          operaciones: ADMIN_DEFAULT_OPERATIONS,
          operacionesDisponibles: AVAILABLE_OPERATIONS
        };
      }

      // Obtener los permisos actuales del usuario
      const query = 'SELECT cedula, keyspaces, operaciones FROM auth.permissions WHERE cedula = ?';
      const result = await this.cassandraClient.execute(query, [cedula], { prepare: true });

      if (result.rowLength === 0) {
        throw new NotFoundException(`No se encontraron permisos para el usuario con cédula: ${cedula}`);
      }

      const permissions = result.first();
      let operaciones = permissions.operaciones || [];

      // Verificar si estamos actualizando una operación o múltiples operaciones
      if (operation && enabled !== undefined) {
        // Verificar que la operación existe
        if (!AVAILABLE_OPERATIONS.includes(operation)) {
          throw new NotFoundException(`La operación '${operation}' no existe`);
        }

        // Caso 1: Actualizar una sola operación
        this.updateSingleOperation(operaciones, operation, enabled);
        this.logger.log(`Permiso '${operation}' ${enabled ? 'activado' : 'desactivado'} para usuario con cédula ${cedula}`);
      } else if (operations && operations.length > 0) {
        // Caso 2: Actualizar múltiples operaciones
        for (const op of operations) {
          if (!AVAILABLE_OPERATIONS.includes(op.name)) {
            throw new NotFoundException(`La operación '${op.name}' no existe`);
          }
          this.updateSingleOperation(operaciones, op.name, op.enabled);
          this.logger.log(`Permiso '${op.name}' ${op.enabled ? 'activado' : 'desactivado'} para usuario con cédula ${cedula}`);
        }
      } else {
        throw new InternalServerErrorException('Debe proporcionar una operación o una lista de operaciones para actualizar');
      }

      // Actualizar los permisos en la base de datos
      const updateQuery = 'UPDATE auth.permissions SET operaciones = ? WHERE cedula = ?';
      await this.cassandraClient.execute(updateQuery, [operaciones, cedula], { prepare: true });

      // CORREGIDO: Notificar al microservicio de traducción sobre el cambio usando la ruta correcta
      await this.notifyPermissionChange(cedula);

      // Devolver los permisos actualizados
      return {
        cedula: cedula,
        nombre: user.nombre,
        rol: user.rol,
        operaciones: operaciones,
        operacionesDisponibles: AVAILABLE_OPERATIONS
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al actualizar permisos del usuario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al actualizar permisos del usuario');
    }
  }

  /**
   * Método auxiliar para actualizar una sola operación en la lista de operaciones
   * @param operaciones Lista actual de operaciones
   * @param operation Operación a actualizar
   * @param enabled Estado de la operación (habilitada o deshabilitada)
   */
  private updateSingleOperation(operaciones: string[], operation: string, enabled: boolean): void {
    if (enabled && !operaciones.includes(operation)) {
      // Agregar la operación si está habilitada y no existe
      operaciones.push(operation);
    } else if (!enabled && operaciones.includes(operation)) {
      // Quitar la operación si está deshabilitada y existe
      const index = operaciones.indexOf(operation);
      if (index > -1) {
        operaciones.splice(index, 1);
      }
    }
  }

  /**
   * CORREGIDO: Notifica al microservicio de traducción sobre un cambio en los permisos de un usuario
   * @param cedula Cédula del usuario cuyos permisos han cambiado
   */
  private async notifyPermissionChange(cedula: string, retries = 3): Promise<void> {
    try {
      // URL corregida con el prefijo 'api' y la ruta completa a 'translator/cache/invalidate'
      const url = `${this.translatorServiceUrl}/api/translator/cache/invalidate`;
      
      this.logger.log(`Notificando cambio de permisos para usuario ${cedula} a ${url}`);
      
      await lastValueFrom(this.httpService.post(
        url,
        { cedula },
        { headers: { 'Content-Type': 'application/json' } }
      ));
      
      this.logger.log(`Notificación de cambio de permisos enviada con éxito para el usuario ${cedula}`);
    } catch (error) {
      this.logger.error(`Error al notificar cambio de permisos: ${error.message}`, error.stack);
      
      // Implementación de reintentos para mejorar la resiliencia
      if (retries > 0) {
        this.logger.warn(`Reintentando notificación (${retries} intentos restantes)...`);
        // Esperar un tiempo antes de reintentar (exponential backoff)
        setTimeout(() => this.notifyPermissionChange(cedula, retries - 1), 1000 * (4 - retries));
      } else {
        this.logger.error(`Error al notificar cambio de permisos después de múltiples intentos`);
      }
    }
  }
}