// src/modules/permissions/services/keyspaces.service.ts
import { Injectable, NotFoundException, InternalServerErrorException, Inject, Logger } from '@nestjs/common';
import { Client } from 'cassandra-driver';
import { CASSANDRA_CLIENT } from '../../../database/cassandra.provider';
import { UserFinderUtil } from '../../../common/utils/user-finder.util';
import { GetKeyspacesDto } from '../dto/get-keyspaces.dto';
import { UpdateUserKeyspacesDto } from '../dto/update-user-keyspaces.dto';
import { KeyspaceUpdateDto } from '../dto/keyspace-update.dto';
import { UserPermissionsResponse } from '../../../common/interfaces/permissions.interface';
import { 
  AVAILABLE_OPERATIONS, 
  ADMIN_DEFAULT_OPERATIONS, 
  USER_DEFAULT_OPERATIONS 
} from '../../../common/constants/operations.constants';

// Interfaz para la respuesta de obtener keyspaces
export interface KeyspacesResponse {
  allKeyspaces: string[];
  userKeyspaces?: string[];
}

@Injectable()
export class KeyspacesService {
  private readonly logger = new Logger(KeyspacesService.name);
  
  // Caché en memoria exclusivo para las tablas de keyspaces
  private tablesCache: Map<string, { tables: string[], timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 1000; // 30 segundos (cambiar a 5 minutos)

  constructor(
    @Inject(CASSANDRA_CLIENT)
    private cassandraClient: Client,
    private userFinderUtil: UserFinderUtil
  ) {}

  /**
   * Obtiene todos los keyspaces disponibles en la base de datos
   * Si se proporciona una cédula, devuelve también los keyspaces a los que tiene acceso el usuario
   * @param getKeyspacesDto DTO con la cédula del usuario (opcional)
   * @returns Lista de todos los keyspaces y opcionalmente los del usuario
   */
  async getKeyspaces(getKeyspacesDto: GetKeyspacesDto): Promise<KeyspacesResponse> {
    try {
      // Obtener todos los keyspaces disponibles en Cassandra
      const query = "SELECT keyspace_name FROM system_schema.keyspaces";
      const result = await this.cassandraClient.execute(query);
      const allKeyspaces = result.rows.map(row => row.keyspace_name)
        .filter(keyspace => !['system', 'system_auth', 'system_distributed', 'system_schema', 'system_traces'].includes(keyspace));

      // Si no se proporciona cédula, solo devolvemos todos los keyspaces
      if (!getKeyspacesDto.cedula) {
        return { allKeyspaces };
      }

      // Si hay cédula, obtenemos los keyspaces del usuario específico
      const { cedula } = getKeyspacesDto;

      // Verificar que el usuario existe
      const user = await this.userFinderUtil.findByCedula(cedula);
      if (!user) {
        throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
      }

      // Si es admin, tiene acceso a todos los keyspaces
      if (user.rol === true) {
        return {
          allKeyspaces,
          userKeyspaces: allKeyspaces
        };
      }

      // Obtener los keyspaces asignados al usuario desde la tabla permissions
      const userQuery = 'SELECT keyspaces FROM auth.permissions WHERE cedula = ?';
      const userResult = await this.cassandraClient.execute(userQuery, [cedula], { prepare: true });

      if (userResult.rowLength === 0) {
        // El usuario no tiene permisos registrados
        return {
          allKeyspaces,
          userKeyspaces: []
        };
      }

      const permissions = userResult.first();
      const userKeyspaces = permissions.keyspaces || [];

      return {
        allKeyspaces,
        userKeyspaces
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener keyspaces: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al obtener keyspaces');
    }
  }

  /**
   * Obtiene los keyspaces de un usuario específico
   * @param cedula Cédula del usuario
   * @returns Keyspaces del usuario
   */
  async getUserKeyspaces(cedula: string): Promise<UserPermissionsResponse> {
    try {
      // Verificar que el usuario existe
      const user = await this.userFinderUtil.findByCedula(cedula);
      if (!user) {
        throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
      }

      // Obtener permisos del usuario de la tabla permissions
      const query = 'SELECT cedula, keyspaces, operaciones FROM auth.permissions WHERE cedula = ?';
      const result = await this.cassandraClient.execute(query, [cedula], { prepare: true });

      // Si el usuario es admin, tiene todos los permisos y todos los keyspaces
      if (user.rol === true) {
        // Obtener todos los keyspaces disponibles en el sistema
        const keyspacesQuery = "SELECT keyspace_name FROM system_schema.keyspaces";
        const keyspacesResult = await this.cassandraClient.execute(keyspacesQuery);
        const allKeyspaces = keyspacesResult.rows.map(row => row.keyspace_name)
          .filter(keyspace => !['system', 'system_auth', 'system_distributed', 'system_schema', 'system_traces'].includes(keyspace));

        return {
          cedula: cedula,
          nombre: user.nombre,
          rol: user.rol,
          operaciones: ADMIN_DEFAULT_OPERATIONS,
          operacionesDisponibles: AVAILABLE_OPERATIONS,
          keyspaces: allKeyspaces
        };
      }

      // Para usuarios regulares, verificamos sus permisos registrados
      if (result.rowLength === 0) {
        // El usuario existe pero no tiene permisos registrados
        return {
          cedula: cedula,
          nombre: user.nombre,
          rol: user.rol,
          operaciones: USER_DEFAULT_OPERATIONS,
          operacionesDisponibles: AVAILABLE_OPERATIONS,
          keyspaces: []
        };
      }

      const permissions = result.first();
      const operaciones = permissions.operaciones || [];
      const keyspaces = permissions.keyspaces || [];

      return {
        cedula: cedula,
        nombre: user.nombre,
        rol: user.rol,
        operaciones: operaciones,
        operacionesDisponibles: AVAILABLE_OPERATIONS,
        keyspaces: keyspaces
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener keyspaces del usuario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al obtener keyspaces del usuario');
    }
  }

  /**
   * Actualiza los keyspaces a los que tiene acceso un usuario
   * @param updateUserKeyspacesDto DTO con la cédula y la lista de keyspaces
   * @returns Respuesta con los keyspaces actualizados del usuario
   */
  async updateUserKeyspaces(updateUserKeyspacesDto: UpdateUserKeyspacesDto): Promise<UserPermissionsResponse> {
    const { cedula, keyspaces } = updateUserKeyspacesDto;

    try {
      // Verificar que el usuario existe
      const user = await this.userFinderUtil.findByCedula(cedula);
      if (!user) {
        throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
      }

      // Verificar que todos los keyspaces proporcionados existen
      const validKeyspacesQuery = "SELECT keyspace_name FROM system_schema.keyspaces";
      const validKeyspacesResult = await this.cassandraClient.execute(validKeyspacesQuery);
      const validKeyspaces = validKeyspacesResult.rows.map(row => row.keyspace_name);

      const invalidKeyspaces = keyspaces.filter(keyspace => !validKeyspaces.includes(keyspace));
      if (invalidKeyspaces.length > 0) {
        throw new NotFoundException(`Los siguientes keyspaces no existen: ${invalidKeyspaces.join(', ')}`);
      }

      // Si el usuario es administrador, permitimos la actualización 
      if (user.rol === true) {
        this.logger.log(`Actualizando keyspaces de un administrador: ${cedula}`);
        // Obtenemos todos los keyspaces disponibles
        const allKeyspaces = validKeyspacesResult.rows.map(row => row.keyspace_name)
          .filter(keyspace => !['system', 'system_auth', 'system_distributed', 'system_schema', 'system_traces'].includes(keyspace));

        // Actualizamos la lista de keyspaces en la tabla de permisos
        const updateQuery = 'UPDATE auth.permissions SET keyspaces = ? WHERE cedula = ?';
        await this.cassandraClient.execute(updateQuery, [allKeyspaces, cedula], { prepare: true });

        return {
          cedula,
          nombre: user.nombre,
          rol: user.rol,
          operaciones: ADMIN_DEFAULT_OPERATIONS,
          operacionesDisponibles: AVAILABLE_OPERATIONS,
          keyspaces: allKeyspaces
        };
      }

      // Obtener los permisos actuales del usuario (para usuarios no administradores)
      const query = 'SELECT cedula, keyspaces, operaciones FROM auth.permissions WHERE cedula = ?';
      const result = await this.cassandraClient.execute(query, [cedula], { prepare: true });

      let operaciones = [];
      if (result.rowLength === 0) {
        // Si el usuario no tiene permisos, creamos un nuevo registro
        const insertQuery = 'INSERT INTO auth.permissions (cedula, keyspaces, operaciones) VALUES (?, ?, ?)';
        await this.cassandraClient.execute(insertQuery, [cedula, keyspaces, operaciones], { prepare: true });
      } else {
        // Si el usuario ya tiene permisos, actualizamos los keyspaces
        const permissions = result.first();
        operaciones = permissions.operaciones || [];

        const updateQuery = 'UPDATE auth.permissions SET keyspaces = ? WHERE cedula = ?';
        await this.cassandraClient.execute(updateQuery, [keyspaces, cedula], { prepare: true });
      }

      this.logger.log(`Keyspaces actualizados para el usuario con cédula: ${cedula}`);

      // Devolver los keyspaces actualizados
      return {
        cedula,
        nombre: user.nombre,
        rol: user.rol,
        operaciones: operaciones,
        operacionesDisponibles: AVAILABLE_OPERATIONS,
        keyspaces: keyspaces
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al actualizar keyspaces del usuario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al actualizar keyspaces del usuario');
    }
  }

  /**
   * Actualiza un keyspace específico del usuario (añadir o eliminar)
   * COMPATIBILIDAD: Permite auto-asignación para usuarios regulares
   * @param keyspaceUpdateDto DTO con la cédula, keyspace y acción
   * @param currentUser Usuario que realiza la operación (para validación de permisos)
   * @returns Respuesta con los keyspaces actualizados del usuario
   */
  async updateSingleKeyspace(keyspaceUpdateDto: KeyspaceUpdateDto, currentUser?: any): Promise<UserPermissionsResponse> {
    const { cedula, keyspace: originalKeyspace, action } = keyspaceUpdateDto;

    // NORMALIZAR: Siempre usar minúsculas para consistencia con Cassandra
    const keyspace = originalKeyspace.toLowerCase();
    
    this.logger.log(`Normalizando keyspace: "${originalKeyspace}" -> "${keyspace}"`);

    try {
      // Verificar que el usuario objetivo existe
      const targetUser = await this.userFinderUtil.findByCedula(cedula);
      if (!targetUser) {
        throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
      }

      // Obtener información del usuario actual (quien hace la petición)
      let currentUserInfo: any = null;
      if (currentUser && currentUser.sub) {
        try {
          currentUserInfo = await this.userFinderUtil.findByCedula(currentUser.sub);
        } catch (error) {
          this.logger.warn(`No se pudo obtener información del usuario actual: ${currentUser.sub}`);
        }
      }

      // VALIDACIÓN DE PERMISOS: Solo admins pueden asignar a otros usuarios
      if (currentUserInfo) {
        const isAdmin = currentUserInfo.rol === true;
        const isSelfAssignment = currentUserInfo.cedula === cedula;
        
        if (!isAdmin && !isSelfAssignment) {
          throw new NotFoundException(`No tiene permisos para modificar los keyspaces de otro usuario`);
        }
        
        this.logger.log(`Operación realizada por usuario ${currentUserInfo.cedula} (admin: ${isAdmin}, self: ${isSelfAssignment})`);
      }

      // Si el usuario objetivo es administrador, permitimos la actualización pero registramos el evento
      if (targetUser.rol === true) {
        this.logger.log(`Actualizando keyspace para un administrador: ${cedula}`);
        // Obtener todos los keyspaces disponibles
        const keyspacesQuery = "SELECT keyspace_name FROM system_schema.keyspaces";
        const keyspacesResult = await this.cassandraClient.execute(keyspacesQuery);
        const allKeyspaces = keyspacesResult.rows.map(row => row.keyspace_name)
          .filter(keyspace => !['system', 'system_auth', 'system_distributed', 'system_schema', 'system_traces'].includes(keyspace));

        // Asegurarse de que el keyspace solicitado esté en la lista si es 'add'
        let updatedKeyspaces = [...allKeyspaces];
        
        // FIX: Comparación case-insensitive para evitar duplicados
        if (action === 'add' && !updatedKeyspaces.some(ks => ks.toLowerCase() === keyspace.toLowerCase())) {
          // NORMALIZACIÓN: Usar el keyspace normalizado (minúsculas)
          updatedKeyspaces.push(keyspace);
        } else if (action === 'remove') {
          // FIX: Filtrado case-insensitive para remover correctamente
          updatedKeyspaces = updatedKeyspaces.filter(k => k.toLowerCase() !== keyspace.toLowerCase());
        }

        // Actualizar la base de datos
        const updateQuery = 'UPDATE auth.permissions SET keyspaces = ? WHERE cedula = ?';
        await this.cassandraClient.execute(updateQuery, [updatedKeyspaces, cedula], { prepare: true });

        return {
          cedula,
          nombre: targetUser.nombre,
          rol: targetUser.rol,
          operaciones: ADMIN_DEFAULT_OPERATIONS,
          operacionesDisponibles: AVAILABLE_OPERATIONS,
          keyspaces: updatedKeyspaces
        };
      }

      // Para usuarios no administradores, continuar con la lógica existente
      let skipKeyspaceVerification = false;
      if (action === 'add') {
        try {
          // NORMALIZACIÓN: Verificar usando el keyspace normalizado
          const validKeyspacesQuery = "SELECT keyspace_name FROM system_schema.keyspaces WHERE keyspace_name = ?";
          const validKeyspacesResult = await this.cassandraClient.execute(validKeyspacesQuery, [keyspace], { prepare: true });
          if (validKeyspacesResult.rowLength === 0) {
            this.logger.warn(`El keyspace ${keyspace} no se encontró en las tablas del sistema, pero se añadirá igualmente`);
            skipKeyspaceVerification = true;
          }
        } catch (error) {
          this.logger.warn(`Error al verificar keyspace, pero continuando: ${error.message}`);
          skipKeyspaceVerification = true;
        }
      }

      // Obtener los permisos actuales del usuario objetivo
      const query = 'SELECT cedula, keyspaces, operaciones FROM auth.permissions WHERE cedula = ?';
      const result = await this.cassandraClient.execute(query, [cedula], { prepare: true });

      let userKeyspaces: string[] = [];
      let operaciones: string[] = [];

      if (result.rowLength === 0) {
        // Si el usuario no tiene permisos, creamos un nuevo registro
        if (action === 'add') {
          // NORMALIZACIÓN: Usar el keyspace normalizado
          userKeyspaces = [keyspace];
        }
        const insertQuery = 'INSERT INTO auth.permissions (cedula, keyspaces, operaciones) VALUES (?, ?, ?)';
        await this.cassandraClient.execute(insertQuery, [cedula, userKeyspaces, operaciones], { prepare: true });
      } else {
        // Si el usuario ya tiene permisos, actualizamos los keyspaces
        const permissions = result.first();
        operaciones = permissions.operaciones || [];
        userKeyspaces = permissions.keyspaces || [];

        // Actualizar la lista de keyspaces según la acción
        if (action === 'add') {
          // FIX: Verificación case-insensitive para evitar duplicados
          if (!userKeyspaces.some(ks => ks.toLowerCase() === keyspace.toLowerCase())) {
            // NORMALIZACIÓN: Agregar el keyspace normalizado
            userKeyspaces.push(keyspace);
          }
        } else {
          // FIX: Eliminación case-insensitive para remover correctamente
          userKeyspaces = userKeyspaces.filter(k => k.toLowerCase() !== keyspace.toLowerCase());
        }

        const updateQuery = 'UPDATE auth.permissions SET keyspaces = ? WHERE cedula = ?';
        await this.cassandraClient.execute(updateQuery, [userKeyspaces, cedula], { prepare: true });
      }

      this.logger.log(`Keyspace ${action === 'add' ? 'añadido a' : 'eliminado de'} usuario con cédula: ${cedula}, keyspace: ${keyspace}`);

      // Devolver los keyspaces actualizados
      return {
        cedula,
        nombre: targetUser.nombre,
        rol: targetUser.rol,
        operaciones: operaciones,
        operacionesDisponibles: AVAILABLE_OPERATIONS,
        keyspaces: userKeyspaces
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al actualizar keyspace individual del usuario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al actualizar keyspace del usuario');
    }
  }

  /**
   * Obtiene las tablas de un keyspace específico con caché
   * @param keyspace Nombre del keyspace
   * @returns Lista de tablas del keyspace
   */
  async getKeyspaceTables(keyspace: string): Promise<{ tables: string[] }> {
    try {
      // Verificar caché
      const cached = this.tablesCache.get(keyspace);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        this.logger.log(`Retornando tablas desde caché para keyspace ${keyspace}`);
        return { tables: cached.tables };
      }

      // Verificar que el keyspace existe
      const keyspaceQuery = 'SELECT keyspace_name FROM system_schema.keyspaces WHERE keyspace_name = ?';
      const keyspaceResult = await this.cassandraClient.execute(keyspaceQuery, [keyspace], { prepare: true });
      
      if (keyspaceResult.rowLength === 0) {
        throw new NotFoundException(`El keyspace ${keyspace} no existe`);
      }

      // Obtener todas las tablas del keyspace
      const query = 'SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?';
      const result = await this.cassandraClient.execute(query, [keyspace], { prepare: true });
      
      const tables = result.rows.map(row => row.table_name).sort();
      
      // Guardar en caché
      this.tablesCache.set(keyspace, {
        tables,
        timestamp: Date.now()
      });
      
      this.logger.log(`Tablas obtenidas para keyspace ${keyspace}: ${tables.length} (guardadas en caché)`);
      
      return { tables };
      
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener tablas del keyspace ${keyspace}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Error al obtener tablas del keyspace ${keyspace}`);
    }
  }

  /**
   * Invalida el caché de tablas para un keyspace específico o todos
   * @param keyspace - Nombre del keyspace a invalidar (opcional)
   */
  invalidateTablesCache(keyspace?: string): void {
    if (keyspace) {
      this.tablesCache.delete(keyspace);
      this.logger.log(`Caché invalidado para keyspace ${keyspace}`);
    } else {
      this.tablesCache.clear();
      this.logger.log('Todo el caché de tablas ha sido invalidado');
    }
  }
}