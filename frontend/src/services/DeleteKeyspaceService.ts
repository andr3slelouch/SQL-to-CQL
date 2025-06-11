// src/services/DeleteKeyspaceService.ts
import HttpService from './HttpService';

export interface KeyspaceSearchResponse {
  exists: boolean;
  keyspace?: string;
  tables?: string[];
  usersWithAccess?: Array<{
    cedula: string;
    nombre: string;
    rol: boolean;
  }>;
}

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

class DeleteKeyspaceService {
  /**
   * Busca un keyspace por nombre y obtiene información sobre usuarios con acceso
   * @param keyspaceName Nombre del keyspace a buscar
   * @returns Información del keyspace y usuarios con acceso
   */
  async searchKeyspace(keyspaceName: string): Promise<KeyspaceSearchResponse> {
    try {
      console.log(`Buscando keyspace: ${keyspaceName}`);
      
      const response = await HttpService.get<KeyspaceSearchResponse>(
        `/admin/keyspaces/search?keyspaceName=${encodeURIComponent(keyspaceName)}`,
        { service: 'permissions' }
      );

      console.log('Respuesta de búsqueda de keyspace:', response);
      return response;
    } catch (error: any) {
      console.error('Error al buscar keyspace:', error);
      throw new Error(error.message || 'Error al buscar la base de datos');
    }
  }

  /**
   * Obtiene todos los usuarios que tienen acceso a un keyspace específico
   * @param keyspaceName Nombre del keyspace
   * @returns Lista de usuarios con acceso
   */
  async getUsersWithKeyspaceAccess(keyspaceName: string): Promise<{
    keyspace: string;
    users: Array<{
      cedula: string;
      nombre: string;
      rol: boolean;
    }>;
  }> {
    try {
      console.log(`Obteniendo usuarios con acceso al keyspace: ${keyspaceName}`);
      
      const response = await HttpService.get<{
        keyspace: string;
        users: Array<{
          cedula: string;
          nombre: string;
          rol: boolean;
        }>;
      }>(
        `/admin/keyspaces/${encodeURIComponent(keyspaceName)}/users`,
        { service: 'permissions' }
      );

      console.log('Usuarios con acceso al keyspace:', response);
      return response;
    } catch (error: any) {
      console.error('Error al obtener usuarios con acceso:', error);
      throw new Error(error.message || 'Error al obtener usuarios con acceso');
    }
  }

  /**
   * Elimina un keyspace y todos los permisos asociados
   * @param keyspaceName Nombre del keyspace a eliminar
   * @param confirmDeletion Confirmación explícita de eliminación
   * @returns Resultado de la operación de eliminación
   */
  async deleteKeyspace(keyspaceName: string, confirmDeletion: boolean = true): Promise<DeleteKeyspaceResponse> {
    try {
      console.log(`Eliminando keyspace: ${keyspaceName} con confirmación: ${confirmDeletion}`);
      
      const response = await HttpService.delete<DeleteKeyspaceResponse>(
        '/admin/keyspaces',
        {
          service: 'permissions',
          body: {
            keyspaceName,
            confirmDeletion
          }
        }
      );

      console.log('Respuesta de eliminación de keyspace:', response);
      return response;
    } catch (error: any) {
      console.error('Error al eliminar keyspace:', error);
      throw new Error(error.message || 'Error al eliminar la base de datos');
    }
  }
}

export default new DeleteKeyspaceService();