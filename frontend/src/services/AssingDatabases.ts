// src/services/AssignDatabases.ts
import HttpService from './HttpService';

// Interfaces para las respuestas del API
export interface KeyspacesResponse {
  allKeyspaces: string[];
  userKeyspaces?: string[];
}

export interface UserPermissionsResponse {
  cedula: string;
  nombre: string;
  rol: boolean;
  operaciones: string[];
  operacionesDisponibles: string[];
  keyspaces?: string[];
}

class AssignDatabasesService {
  /**
   * Obtiene todos los keyspaces disponibles en la base de datos
   * @returns Lista de todos los keyspaces
   */
  async getAllKeyspaces(): Promise<KeyspacesResponse> {
    try {
      return await HttpService.get<KeyspacesResponse>('/admin/keyspaces', { 
        service: 'permissions' 
      });
    } catch (error) {
      console.error('Error al obtener todos los keyspaces:', error);
      throw error;
    }
  }

  /**
   * Obtiene los keyspaces asignados a un usuario específico
   * @param cedula Cédula del usuario
   * @returns Información del usuario y sus keyspaces asignados
   */
  async getUserKeyspaces(cedula: string): Promise<UserPermissionsResponse> {
    try {
      return await HttpService.get<UserPermissionsResponse>(`/admin/keyspaces/user?cedula=${cedula}`, {
        service: 'permissions'
      });
    } catch (error) {
      console.error(`Error al obtener keyspaces del usuario ${cedula}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza los keyspaces a los que un usuario tiene acceso
   * @param cedula Cédula del usuario
   * @param keyspaces Array de keyspaces a asignar al usuario
   * @returns Información actualizada del usuario
   */
  async updateUserKeyspaces(cedula: string, keyspaces: string[]): Promise<UserPermissionsResponse> {
    try {
      return await HttpService.post<UserPermissionsResponse>('/admin/keyspaces/update-user-keyspaces', {
        cedula,
        keyspaces
      }, { service: 'permissions' });
    } catch (error) {
      console.error(`Error al actualizar keyspaces del usuario ${cedula}:`, error);
      throw error;
    }
  }

  /**
   * Añade o elimina un keyspace específico para un usuario
   * @param cedula Cédula del usuario
   * @param keyspace Nombre del keyspace
   * @param action Acción a realizar ('add' para añadir, 'remove' para eliminar)
   * @returns Información actualizada del usuario
   */
  async updateSingleKeyspace(
    cedula: string, 
    keyspace: string, 
    action: 'add' | 'remove'
  ): Promise<UserPermissionsResponse> {
    try {
      return await HttpService.post<UserPermissionsResponse>('/admin/keyspaces/update-single-keyspace', {
        cedula,
        keyspace,
        action
      }, { service: 'permissions' });
    } catch (error) {
      console.error(`Error al ${action === 'add' ? 'añadir' : 'eliminar'} keyspace ${keyspace} para usuario ${cedula}:`, error);
      throw error;
    }
  }
}

// Exportamos una instancia única del servicio
export default new AssignDatabasesService();