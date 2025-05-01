// src/modules/permissions/services/keyspaces.service.ts
import { Injectable, NotFoundException, InternalServerErrorException, Inject, Logger } from '@nestjs/common';
import { Client } from 'cassandra-driver';
import { CASSANDRA_CLIENT } from '../../../database/cassandra.provider';
import { UserFinderUtil } from '../../../common/utils/user-finder.util';
import { GetKeyspacesDto } from '../dto/get-keyspaces.dto';
import { UpdateUserKeyspacesDto } from '../dto/update-user-keyspaces.dto';
import { KeyspaceUpdateDto } from '../dto/keyspace-update.dto';
import { UserPermissionsResponse } from '../../../common/interfaces/permissions.interface';
import { AVAILABLE_OPERATIONS, ADMIN_DEFAULT_OPERATIONS, USER_DEFAULT_OPERATIONS } from '../../../common/constants/operations.constants';

// Interfaz para la respuesta de obtener keyspaces
export interface KeyspacesResponse {
  allKeyspaces: string[];
  userKeyspaces?: string[];
}

@Injectable()
export class KeyspacesService {
  private readonly logger = new Logger(KeyspacesService.name);

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
      
      // Si el usuario es administrador, no permitimos modificar sus keyspaces
      if (user.rol === true) {
        this.logger.warn(`Intento de modificar keyspaces de un administrador: ${cedula}`);
        
        // Obtener todos los keyspaces disponibles para devolverlos en la respuesta
        const keyspacesQuery = "SELECT keyspace_name FROM system_schema.keyspaces";
        const keyspacesResult = await this.cassandraClient.execute(keyspacesQuery);
        
        const allKeyspaces = keyspacesResult.rows.map(row => row.keyspace_name)
          .filter(keyspace => !['system', 'system_auth', 'system_distributed', 'system_schema', 'system_traces'].includes(keyspace));
        
        return {
          cedula,
          nombre: user.nombre,
          rol: user.rol,
          operaciones: ADMIN_DEFAULT_OPERATIONS,
          operacionesDisponibles: AVAILABLE_OPERATIONS,
          keyspaces: allKeyspaces
        };
      }
      
      // Verificar que todos los keyspaces proporcionados existen
      const validKeyspacesQuery = "SELECT keyspace_name FROM system_schema.keyspaces";
      const validKeyspacesResult = await this.cassandraClient.execute(validKeyspacesQuery);
      const validKeyspaces = validKeyspacesResult.rows.map(row => row.keyspace_name);
      
      const invalidKeyspaces = keyspaces.filter(keyspace => !validKeyspaces.includes(keyspace));
      if (invalidKeyspaces.length > 0) {
        throw new NotFoundException(`Los siguientes keyspaces no existen: ${invalidKeyspaces.join(', ')}`);
      }
      
      // Obtener los permisos actuales del usuario
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
   * @param keyspaceUpdateDto DTO con la cédula, keyspace y acción
   * @returns Respuesta con los keyspaces actualizados del usuario
   */
  async updateSingleKeyspace(keyspaceUpdateDto: KeyspaceUpdateDto): Promise<UserPermissionsResponse> {
    const { cedula, keyspace, action } = keyspaceUpdateDto;
    
    try {
      // Verificar que el usuario existe
      const user = await this.userFinderUtil.findByCedula(cedula);
      if (!user) {
        throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
      }
      
      // Si el usuario es administrador, no permitimos modificar sus keyspaces
      if (user.rol === true) {
        this.logger.warn(`Intento de modificar keyspaces de un administrador: ${cedula}`);
        
        // Obtener todos los keyspaces disponibles para devolverlos en la respuesta
        const keyspacesQuery = "SELECT keyspace_name FROM system_schema.keyspaces";
        const keyspacesResult = await this.cassandraClient.execute(keyspacesQuery);
        
        const allKeyspaces = keyspacesResult.rows.map(row => row.keyspace_name)
          .filter(keyspace => !['system', 'system_auth', 'system_distributed', 'system_schema', 'system_traces'].includes(keyspace));
        
        return {
          cedula,
          nombre: user.nombre,
          rol: user.rol,
          operaciones: ADMIN_DEFAULT_OPERATIONS,
          operacionesDisponibles: AVAILABLE_OPERATIONS,
          keyspaces: allKeyspaces
        };
      }
      
      // MODIFICACIÓN: Solo verificar que el keyspace exista si el cliente lo solicita
      // y no es una solicitud entre microservicios
      let skipKeyspaceVerification = false;
      
      // Si viene del microservicio de traducción, no verificar la existencia del keyspace
      if (action === 'add') {
        try {
          // Intentar verificar si el keyspace existe
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
      
      // Obtener los permisos actuales del usuario
      const query = 'SELECT cedula, keyspaces, operaciones FROM auth.permissions WHERE cedula = ?';
      const result = await this.cassandraClient.execute(query, [cedula], { prepare: true });
      
      let userKeyspaces: string[] = [];
      let operaciones: string[] = [];
      
      if (result.rowLength === 0) {
        // Si el usuario no tiene permisos, creamos un nuevo registro
        if (action === 'add') {
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
          // Verificar si ya existe el keyspace
          if (!userKeyspaces.includes(keyspace)) {
            userKeyspaces.push(keyspace);
          }
        } else {
          // Eliminar el keyspace si existe
          userKeyspaces = userKeyspaces.filter(k => k !== keyspace);
        }
        
        const updateQuery = 'UPDATE auth.permissions SET keyspaces = ? WHERE cedula = ?';
        await this.cassandraClient.execute(updateQuery, [userKeyspaces, cedula], { prepare: true });
      }
      
      this.logger.log(`Keyspace ${action === 'add' ? 'añadido a' : 'eliminado de'} usuario con cédula: ${cedula}, keyspace: ${keyspace}`);
      
      // Devolver los keyspaces actualizados
      return {
        cedula,
        nombre: user.nombre,
        rol: user.rol,
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
}