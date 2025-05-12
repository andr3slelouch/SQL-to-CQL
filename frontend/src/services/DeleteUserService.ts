// src/services/UserManagementService.ts
import HttpService from './HttpService';

// Interfaces basadas en el backend
interface UserSearchResponse {
  cedula: string;
  nombre: string;
  rol: boolean;
  estado: boolean;
}

interface DeleteUserResponse {
  message: string;
}

interface DeactivateUserRequest {
  cedula: string;
  estado: boolean;
}

interface UserManageResponse {
  cedula: string;
  nombre: string;
  rol: boolean;
  estado: boolean;
}

class UserManagementService {
  /**
   * Busca un usuario por su cédula
   * @param cedula Cédula del usuario a buscar
   * @returns Información del usuario
   */
  async searchUserByCedula(cedula: string): Promise<UserSearchResponse> {
    try {
      const response = await HttpService.get<UserSearchResponse>(
        `/admin/keyspaces/user?cedula=${cedula}`,
        { service: 'permissions' }
      );
      
      return response;
    } catch (error) {
      console.error('Error al buscar usuario:', error);
      throw error;
    }
  }

  /**
   * Elimina permanentemente un usuario
   * @param cedula Cédula del usuario a eliminar
   * @returns Mensaje de confirmación
   */
  async deleteUser(cedula: string): Promise<DeleteUserResponse> {
    try {
      const response = await HttpService.delete<DeleteUserResponse>(
        '/admin/users',
        { 
          service: 'auth',
          body: { cedula }
        }
      );
      
      return response;
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      throw error;
    }
  }

  /**
   * Desactiva un usuario (cambia su estado)
   * @param data Datos para desactivar usuario
   * @returns Usuario con estado actualizado
   */
  async deactivateUser(data: DeactivateUserRequest): Promise<UserManageResponse> {
    try {
      const response = await HttpService.post<UserManageResponse>(
        '/admin/users/deactivate',
        data,
        { service: 'auth' }
      );
      
      return response;
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
      throw error;
    }
  }
}

export default new UserManagementService();