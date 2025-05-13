// src/services/ChangeRoleService.ts
import HttpService from './HttpService';

interface SearchUserDto {
  cedula: string;
}

interface UpdateRoleDto {
  cedula: string;
  rol: boolean;
}

export interface UserRoleResponse {
  cedula: string;
  nombre: string;
  rol: boolean;
  estado: boolean;
}

class ChangeRoleService {
  /**
   * Busca un usuario por cédula para obtener su información de rol
   * @param cedula Cédula del usuario a buscar
   * @returns Información del usuario incluyendo su rol
   */
  async searchUserForRole(cedula: string): Promise<UserRoleResponse> {
    try {
      const searchUserDto: SearchUserDto = { cedula };
      
      const response = await HttpService.post<UserRoleResponse>(
        '/admin/permissions/search',
        searchUserDto,
        { service: 'permissions' } // Usar el servicio de permisos en puerto 3002
      );
      
      return response;
      
    } catch (error: any) {
      console.error('Error al buscar usuario para cambio de rol:', error);
      
      if (error.message.includes('404') || 
          error.message.includes('No se encontró') ||
          error.message.includes('Not Found')) {
        throw new Error('No existe usuario con esa cédula/código');
      }
      
      if (error.message.includes('403') || 
          error.message.includes('Forbidden')) {
        throw new Error('No tiene permisos para realizar esta acción');
      }
      
      if (error.message.includes('Internal Server Error')) {
        throw new Error('Error al buscar el usuario. Por favor intente nuevamente.');
      }
      
      throw error;
    }
  }

  /**
   * Actualiza el rol de un usuario
   * @param cedula Cédula del usuario
   * @param rol Nuevo rol (true = admin, false = usuario común)
   * @returns Información actualizada del usuario
   */
  async updateUserRole(cedula: string, rol: boolean): Promise<UserRoleResponse> {
    try {
      const updateRoleDto: UpdateRoleDto = { cedula, rol };
      
      console.log('=== DEPURACIÓN CAMBIO DE ROL ===');
      console.log('Endpoint: /admin/permissions/change-role');
      console.log('Servicio: permissions (puerto 3002)');
      console.log('Datos a enviar:', JSON.stringify(updateRoleDto));
      console.log('Token presente:', !!localStorage.getItem('access_token'));
      
      const response = await HttpService.post<UserRoleResponse>(
        '/admin/permissions/change-role',
        updateRoleDto,
        { service: 'permissions' }
      );
      
      console.log('Respuesta exitosa:', response);
      
      return response;
      
    } catch (error: any) {
      console.error('=== ERROR DETALLADO ===');
      console.error('Error completo:', error);
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
      
      if (error.message.includes('404') || 
          error.message.includes('No se encontró') ||
          error.message.includes('Not Found')) {
        throw new Error('Endpoint no encontrado. Verifica que el backend esté corriendo en puerto 3002');
      }
      
      if (error.message.includes('403') || 
          error.message.includes('Forbidden')) {
        throw new Error('No tiene permisos para cambiar roles');
      }
      
      if (error.message.includes('401') || 
          error.message.includes('Unauthorized')) {
        throw new Error('No autorizado. Por favor inicie sesión nuevamente');
      }
      
      if (error.message.includes('400') || 
          error.message.includes('Bad Request')) {
        throw new Error('Datos inválidos. Por favor verifique la información.');
      }
      
      if (error.message.includes('Internal Server Error')) {
        throw new Error('Error al actualizar el rol. Por favor intente nuevamente.');
      }
      
      throw error;
    }
  }
}

// Exportamos una instancia única del servicio
export default new ChangeRoleService();