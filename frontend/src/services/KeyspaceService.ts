// src/services/KeyspaceService.ts
import HttpService from './HttpService';
import AuthService from './AuthService';

export interface UserPermissionsResponse {
  cedula: string;
  nombre: string;
  rol: boolean;
  operaciones: string[];
  operacionesDisponibles: string[];
  keyspaces: string[];
}

class KeyspaceService {
  // Flag para evitar múltiples peticiones simultáneas
  private isLoadingKeyspaces: boolean = false;

  /**
   * Obtiene las bases de datos (keyspaces) a las que el usuario tiene acceso
   * @returns Lista de keyspaces disponibles para el usuario
   */
  async getUserKeyspaces(): Promise<string[]> {
    // Si ya está en proceso de carga, evitar solicitudes duplicadas
    if (this.isLoadingKeyspaces) {
      return new Promise((resolve) => {
        // Revisar cada 100ms si ya se completó la carga
        const checkInterval = setInterval(() => {
          if (!this.isLoadingKeyspaces) {
            clearInterval(checkInterval);
            // Intentar obtener keyspaces de localStorage
            const cachedKeyspaces = localStorage.getItem('cachedKeyspaces');
            resolve(cachedKeyspaces ? JSON.parse(cachedKeyspaces) : []);
          }
        }, 100);
        // Timeout para evitar espera infinita
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve([]);
        }, 5000);
      });
    }

    this.isLoadingKeyspaces = true;
    try {
      // Obtener el usuario actual del servicio de autenticación
      const user = AuthService.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Usar el servicio de permisos con el proxy configurado
      const response = await HttpService.get<UserPermissionsResponse>(
        `/admin/keyspaces/user?cedula=${user.cedula}`, 
        { service: 'permissions' }
      );
      
      console.log('Keyspaces obtenidos:', response.keyspaces);
      
      // Guardar los keyspaces en localStorage para futuras referencias rápidas
      if (response.keyspaces && response.keyspaces.length > 0) {
        localStorage.setItem('cachedKeyspaces', JSON.stringify(response.keyspaces));
      }
      
      // Extraer el array de keyspaces
      return response.keyspaces || [];
    } catch (error) {
      console.error('Error al obtener keyspaces del usuario:', error);
      // En caso de error, intentar usar la caché
      const cachedKeyspaces = localStorage.getItem('cachedKeyspaces');
      if (cachedKeyspaces) {
        return JSON.parse(cachedKeyspaces);
      }
      // Devolvemos un array vacío en caso de error y sin caché
      return [];
    } finally {
      this.isLoadingKeyspaces = false;
    }
  }
}

export default new KeyspaceService();