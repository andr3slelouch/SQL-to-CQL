// src/services/PermissionsService.ts
import HttpService from './HttpService';

// Interfaces
export interface UserPermissionsResponse {
  cedula: string;
  nombre: string;
  rol: boolean;
  operaciones: string[];
  operacionesDisponibles: string[];
  keyspaces?: string[];
}

export interface SearchUserDto {
  cedula: string;
}

export interface UpdateUserPermissionDto {
  cedula: string;
  operation?: string;
  enabled?: boolean;
  operations?: {
    name: string;
    enabled: boolean;
  }[];
}

class PermissionsService {
  /**
   * Busca un usuario por cédula y obtiene sus permisos
   * @param cedula Cédula del usuario a buscar
   * @returns Información del usuario con sus permisos
   */
  async getUserPermissions(cedula: string): Promise<UserPermissionsResponse> {
    try {
      // Especificar explícitamente el servicio 'permissions'
      const response = await HttpService.post<UserPermissionsResponse>(
        '/admin/permissions/get-user-permissions',
        { cedula },
        { service: 'permissions' } // Asegurar que se envíe al puerto 3002
      );
      
      console.log('Respuesta de getUserPermissions:', response);
      return response;
    } catch (error) {
      console.error('Error al obtener permisos del usuario:', error);
      throw error;
    }
  }

  /**
   * Actualiza un permiso específico del usuario
   * @param cedula Cédula del usuario
   * @param operation Nombre de la operación
   * @param enabled Estado del permiso (true: habilitado, false: deshabilitado)
   * @returns Permisos actualizados del usuario
   */
  async updateUserPermission(
    cedula: string, 
    operation: string, 
    enabled: boolean
  ): Promise<UserPermissionsResponse> {
    try {
      // Especificar explícitamente el servicio 'permissions'
      const response = await HttpService.post<UserPermissionsResponse>(
        '/admin/permissions/update-user-permission',
        { 
          cedula, 
          operation, 
          enabled 
        },
        { service: 'permissions' } // Asegurar que se envíe al puerto 3002
      );
      
      return response;
    } catch (error) {
      console.error('Error al actualizar permiso del usuario:', error);
      throw error;
    }
  }

  /**
   * Actualiza múltiples permisos del usuario
   * @param cedula Cédula del usuario
   * @param operations Lista de operaciones con su estado
   * @returns Permisos actualizados del usuario
   */
  async updateMultiplePermissions(
    cedula: string,
    operations: { name: string; enabled: boolean }[]
  ): Promise<UserPermissionsResponse> {
    try {
      console.log('Actualizando múltiples permisos para usuario:', cedula);
      console.log('Operaciones a actualizar:', operations);
      
      // Especificar explícitamente el servicio 'permissions'
      const response = await HttpService.post<UserPermissionsResponse>(
        '/admin/permissions/update-user-permission',
        { 
          cedula, 
          operations 
        },
        { service: 'permissions' } // Asegurar que se envíe al puerto 3002
      );
      
      console.log('Respuesta de updateMultiplePermissions:', response);
      return response;
    } catch (error) {
      console.error('Error al actualizar permisos del usuario:', error);
      throw error;
    }
  }
}

export default new PermissionsService();