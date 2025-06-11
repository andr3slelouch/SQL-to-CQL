import KeyspaceService from './KeyspaceService';

export interface User {
  nombre: string;
  cedula: string;
  rol: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
}

class AuthService {
  // Guarda los datos de autenticación siempre en sessionStorage
  saveAuthData(token: string, user: User, expiresIn: number): void {
    sessionStorage.setItem('accessToken', token);
    sessionStorage.setItem('userData', JSON.stringify(user));
    const expirationTime = new Date().getTime() + expiresIn * 1000;
    sessionStorage.setItem('tokenExpiration', expirationTime.toString());
    
    // Marcar cada pestaña con un identificador único para debugging
    if (!sessionStorage.getItem('tabIdentifier')) {
      sessionStorage.setItem('tabIdentifier', Date.now().toString());
    }
    
    // Configurar temporizador para refrescar o cerrar sesión antes de que expire
    this.setupTokenRefresh(expiresIn);
    
    console.log('Datos de autenticación guardados en sessionStorage');
  }
  
  // Limpia los datos de autenticación y redirige al login
  logout(redirectToLogin: boolean = true): void {
    console.log('Cerrando sesión');
    
    // Limpiar tokens y datos de usuario
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('tokenExpiration');
    sessionStorage.removeItem('tabIdentifier');
    
    // IMPORTANTE: Limpiar también el caché de keyspaces
    KeyspaceService.clearCache();
    
    // Redirigir al login si se solicita
    if (redirectToLogin) {
      window.location.href = '/';
    }
  }
  
  // Obtiene el token de acceso
  getToken(): string | null {
    return sessionStorage.getItem('accessToken');
  }
  
  // Alias para getToken (para compatibilidad con AuthApiService)
  getAccessToken(): string | null {
    return this.getToken();
  }
  
  // Obtiene el usuario actual
  getCurrentUser(): User | null {
    const userStr = sessionStorage.getItem('userData');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch (error) {
      console.error('Error al parsear datos de usuario:', error);
      this.logout(false);
      return null;
    }
  }
  
  // Verifica si el token ha expirado
  isTokenExpired(): boolean {
    const expiration = sessionStorage.getItem('tokenExpiration');
    if (!expiration) return true;
    const expirationTime = parseInt(expiration);
    return new Date().getTime() > expirationTime;
  }
  
  // Verifica si el usuario está autenticado
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired();
  }
  
  // Obtiene el estado de autenticación actual
  getAuthState(): AuthState {
    const isAuthenticated = this.isAuthenticated();
    const user = this.getCurrentUser();
    const accessToken = this.getToken();
    return {
      isAuthenticated,
      user,
      accessToken
    };
  }
  
  // Configura un temporizador para refrescar el token antes de que expire
  setupTokenRefresh(expiresIn: number): void {
    // Configuramos el tiempo de refresco a 1 minuto antes de que expire el token
    const refreshTime = (expiresIn - 60) * 1000;
    if (refreshTime <= 0) {
      // Si el tiempo ya pasó, simplemente cerramos sesión
      this.logout();
      return;
    }
    
    setTimeout(() => {
      if (this.isAuthenticated()) {
        alert('Su sesión está por expirar. Por favor, vuelva a iniciar sesión.');
        this.logout();
      }
    }, refreshTime);
  }
}

// Crear instancia y exportar
const authServiceInstance = new AuthService();
export default authServiceInstance;