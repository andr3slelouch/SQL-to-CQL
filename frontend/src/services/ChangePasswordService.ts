// src/services/ChangePasswordService.ts
import HttpService from './HttpService';

interface GenerateTempPinDto {
  cedula: string;
}

interface TempPinResponse {
  tempPin: string;
  expiresAt: Date;
}

interface UserSearchResponse {
  nombre: string;
  cedula: string;
  rol: string;
}

interface VerifyCredentialsDto {
  nombre: string;
  cedula: string;
  pin: string;
}

interface VerifyCredentialsResponse {
  valid: boolean;
  message: string;
}

interface ChangePasswordDto {
  nombre: string;
  cedula: string;
  nuevaContrasena: string;
  confirmarContrasena: string;
  pin: string;
}

interface ChangePasswordResponse {
  message: string;
  newPin?: string;
}

class ChangePasswordService {
  /**
   * Busca un usuario por cédula usando el endpoint específico del backend
   * @param cedula Cédula del usuario a buscar
   * @returns Datos del usuario formateados
   */
  async searchUserByCedula(cedula: string): Promise<UserSearchResponse> {
    try {
      const response = await HttpService.get<UserSearchResponse>(
        `/users/find-by-cedula/${cedula}`,
        { service: 'auth' }
      );
      
      return response;
      
    } catch (error: any) {
      console.error('Error al buscar usuario:', error);
      
      if (error.message.includes('404') || 
          error.message.includes('No se encontró') ||
          error.message.includes('Not Found')) {
        throw new Error('No existe usuario con esa cédula/código');
      }
      
      if (error.message.includes('Internal Server Error')) {
        throw new Error('Error al buscar el usuario. Por favor intente nuevamente.');
      }
      
      throw error;
    }
  }

  /**
   * Genera un PIN temporal para un usuario (solo admin)
   * @param cedula Cédula del usuario
   * @returns PIN temporal y fecha de expiración
   */
  async generateTemporaryPin(cedula: string): Promise<TempPinResponse> {
    try {
      const generateTempPinDto: GenerateTempPinDto = { cedula };
      
      const response = await HttpService.post<TempPinResponse>(
        '/users/admin/generate-temp-pin',
        generateTempPinDto,
        { service: 'auth' }
      );
      
      return response;
      
    } catch (error: any) {
      console.error('Error al generar PIN temporal:', error);
      
      if (error.message.includes('No se encontró un usuario')) {
        throw new Error('No existe usuario con esa cédula/código');
      }
      
      if (error.message.includes('Internal Server Error')) {
        throw new Error('Error al generar el PIN temporal. Por favor intente nuevamente.');
      }
      
      throw error;
    }
  }

  /**
   * Verifica las credenciales del usuario (nombre, cédula y PIN)
   * @param credentials Credenciales a verificar
   * @returns Resultado de la verificación
   */
  async verifyCredentials(credentials: VerifyCredentialsDto): Promise<VerifyCredentialsResponse> {
    try {
      const response = await HttpService.post<VerifyCredentialsResponse>(
        '/users/verify-credentials',
        credentials,
        { service: 'auth' }
      );
      
      return response;
      
    } catch (error: any) {
      console.error('Error al verificar credenciales:', error);
      
      if (error.message.includes('401') || 
          error.message.includes('Unauthorized')) {
        throw new Error('Credenciales incorrectas. Verifique sus datos.');
      }
      
      if (error.message.includes('Internal Server Error')) {
        throw new Error('Error al verificar las credenciales. Por favor intente nuevamente.');
      }
      
      throw error;
    }
  }

  /**
   * Cambia la contraseña del usuario
   * @param passwordData Datos para el cambio de contraseña
   * @returns Resultado del cambio de contraseña
   */
  async changePassword(passwordData: ChangePasswordDto): Promise<ChangePasswordResponse> {
    try {
      const response = await HttpService.post<ChangePasswordResponse>(
        '/users/change-password',
        passwordData,
        { service: 'auth' }
      );
      
      return response;
      
    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error);
      
      if (error.message.includes('400') || 
          error.message.includes('Bad Request')) {
        if (error.message.includes('contraseñas no coinciden')) {
          throw new Error('Las contraseñas no coinciden');
        }
        throw new Error('Datos inválidos. Por favor verifique la información.');
      }
      
      if (error.message.includes('401') || 
          error.message.includes('Unauthorized')) {
        throw new Error('No autorizado para cambiar la contraseña');
      }
      
      if (error.message.includes('Internal Server Error')) {
        throw new Error('Error al cambiar la contraseña. Por favor intente nuevamente.');
      }
      
      throw error;
    }
  }
}

// Exportamos una instancia única del servicio
export default new ChangePasswordService();