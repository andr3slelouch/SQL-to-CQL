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
   * Normaliza el nombre del keyspace a minúsculas
   * @param keyspace Nombre del keyspace
   * @returns Nombre normalizado (en minúsculas)
   */
  private normalizeKeyspaceName(keyspace: string): string {
    return keyspace ? keyspace.toLowerCase() : '';
  }

  /**
   * Limpia la caché de keyspaces
   * Debe llamarse cuando el usuario cierra sesión o cambia
   */
  clearCache(): void {
    sessionStorage.removeItem('cachedKeyspaces');
    sessionStorage.removeItem('cachedUserCedula');
    this.isLoadingKeyspaces = false;
    console.log('Caché de keyspaces limpiado');
  }

  /**
   * Obtiene las bases de datos (keyspaces) a las que el usuario tiene acceso
   * @returns Lista de keyspaces disponibles para el usuario
   */
  async getUserKeyspaces(): Promise<string[]> {
    // Si ya está en proceso de carga, evitar solicitudes duplicadas
    if (this.isLoadingKeyspaces) {
      console.log('Ya hay una carga de keyspaces en progreso, esperando...');
      return new Promise((resolve) => {
        // Revisar cada 100ms si ya se completó la carga
        const checkInterval = setInterval(() => {
          if (!this.isLoadingKeyspaces) {
            clearInterval(checkInterval);
            // Obtener keyspaces de caché pero verificar que sea del usuario actual
            const currentUser = AuthService.getCurrentUser();
            const cachedUserCedula = sessionStorage.getItem('cachedUserCedula');
            if (currentUser && cachedUserCedula === currentUser.cedula) {
              const cachedKeyspaces = sessionStorage.getItem('cachedKeyspaces');
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
      const cachedUserCedula = sessionStorage.getItem('cachedUserCedula');
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
      
      // Guardar los keyspaces en sessionStorage junto con la cédula del usuario
      if (response.keyspaces) {
        sessionStorage.setItem('cachedKeyspaces', JSON.stringify(response.keyspaces));
        sessionStorage.setItem('cachedUserCedula', user.cedula);
      }
      
      // Extraer el array de keyspaces
      return response.keyspaces || [];
    } catch (error) {
      console.error('Error al obtener keyspaces del usuario:', error);
      
      // En caso de error, intentar usar la caché solo si es del usuario actual
      const currentUser = AuthService.getCurrentUser();
      const cachedUserCedula = sessionStorage.getItem('cachedUserCedula');
      
      if (currentUser && cachedUserCedula === currentUser.cedula) {
        const cachedKeyspaces = sessionStorage.getItem('cachedKeyspaces');
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

      // Normalizar el keyspace a minúsculas para garantizar compatibilidad
      const normalizedKeyspace = this.normalizeKeyspaceName(keyspace);
      console.log(`Obteniendo tablas para keyspace: ${normalizedKeyspace}`);
      
      // Usar el servicio de permisos con el proxy configurado
      const response = await HttpService.get<{ tables: string[] }>(
        `/admin/keyspaces/tables?keyspace=${encodeURIComponent(normalizedKeyspace)}`,
        { service: 'permissions' }
      );
      
      console.log(`Tablas obtenidas para ${normalizedKeyspace}:`, response.tables);
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
      // Si se proporciona un keyspace, normalizarlo
      const normalizedKeyspace = keyspace ? this.normalizeKeyspaceName(keyspace) : undefined;
      
      const endpoint = normalizedKeyspace
        ? `/admin/keyspaces/cache/tables/${normalizedKeyspace}`
        : '/admin/keyspaces/cache/tables';
      
      await HttpService.delete(endpoint, { service: 'permissions' });
      console.log(`Caché invalidado para keyspace: ${normalizedKeyspace || 'todos'}`);
    } catch (error) {
      console.error('Error al invalidar caché:', error);
      throw error;
    }
  }
}

export default new KeyspaceService();