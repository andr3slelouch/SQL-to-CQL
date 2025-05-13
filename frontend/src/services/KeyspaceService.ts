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
   * Limpia la caché de keyspaces
   * Debe llamarse cuando el usuario cierra sesión o cambia
   */
  clearCache(): void {
    localStorage.removeItem('cachedKeyspaces');
    localStorage.removeItem('cachedUserCedula');
    this.isLoadingKeyspaces = false;
  }

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
            // Obtener keyspaces de caché pero verificar que sea del usuario actual
            const currentUser = AuthService.getCurrentUser();
            const cachedUserCedula = localStorage.getItem('cachedUserCedula');
            if (currentUser && cachedUserCedula === currentUser.cedula) {
              const cachedKeyspaces = localStorage.getItem('cachedKeyspaces');
              resolve(cachedKeyspaces ? JSON.parse(cachedKeyspaces) : []);
            } else {
              resolve([]);
            }
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
      
      if (!user || !user.cedula) {
        console.error('Usuario no autenticado o sin cédula');
        this.clearCache(); // Limpiar caché si no hay usuario
        return [];
      }

      // Verificar si el caché es del usuario actual
      const cachedUserCedula = localStorage.getItem('cachedUserCedula');
      if (cachedUserCedula && cachedUserCedula !== user.cedula) {
        // Si el caché es de otro usuario, limpiarlo
        console.log('Limpiando caché de usuario anterior');
        this.clearCache();
      }

      console.log('Obteniendo keyspaces para usuario:', user.cedula);

      // Usar el servicio de permisos con el proxy configurado
      const response = await HttpService.get<UserPermissionsResponse>(
        `/admin/keyspaces/user?cedula=${user.cedula}`, 
        { service: 'permissions' }
      );

      console.log('Keyspaces obtenidos:', response.keyspaces);

      // Guardar los keyspaces en localStorage junto con la cédula del usuario
      if (response.keyspaces) {
        localStorage.setItem('cachedKeyspaces', JSON.stringify(response.keyspaces));
        localStorage.setItem('cachedUserCedula', user.cedula);
      }

      // Extraer el array de keyspaces
      return response.keyspaces || [];
      
    } catch (error) {
      console.error('Error al obtener keyspaces del usuario:', error);
      
      // En caso de error, intentar usar la caché solo si es del usuario actual
      const currentUser = AuthService.getCurrentUser();
      const cachedUserCedula = localStorage.getItem('cachedUserCedula');
      
      if (currentUser && cachedUserCedula === currentUser.cedula) {
        const cachedKeyspaces = localStorage.getItem('cachedKeyspaces');
        if (cachedKeyspaces) {
          console.log('Usando keyspaces desde caché para el usuario actual');
          return JSON.parse(cachedKeyspaces);
        }
      }
      
      // Devolvemos un array vacío en caso de error y sin caché válido
      return [];
    } finally {
      this.isLoadingKeyspaces = false;
    }
  }

  /**
   * Obtiene las tablas de un keyspace específico
   * @param keyspace Nombre del keyspace
   * @returns Lista de tablas del keyspace
   */
  async getKeyspaceTables(keyspace: string): Promise<string[]> {
    try {
      if (!keyspace) {
        console.warn('No se proporcionó un keyspace');
        return [];
      }

      console.log(`Obteniendo tablas para keyspace: ${keyspace}`);

      // Usar el servicio de permisos con el proxy configurado
      const response = await HttpService.get<{ tables: string[] }>(
        `/admin/keyspaces/tables?keyspace=${encodeURIComponent(keyspace)}`,
        { service: 'permissions' }
      );

      console.log(`Tablas obtenidas para ${keyspace}:`, response.tables);
      
      return response.tables || [];
    } catch (error) {
      console.error(`Error al obtener tablas del keyspace ${keyspace}:`, error);
      return [];
    }
  }

  /**
   * Invalida el caché de tablas en el backend (solo para administradores)
   * @param keyspace Nombre del keyspace (opcional)
   */
  async invalidateTablesCache(keyspace?: string): Promise<void> {
    try {
      const endpoint = keyspace 
        ? `/admin/keyspaces/cache/tables/${keyspace}` 
        : '/admin/keyspaces/cache/tables';
      
      await HttpService.delete(endpoint, { service: 'permissions' });
      console.log(`Caché invalidado para keyspace: ${keyspace || 'todos'}`);
    } catch (error) {
      console.error('Error al invalidar caché:', error);
      throw error;
    }
  }
}

export default new KeyspaceService();