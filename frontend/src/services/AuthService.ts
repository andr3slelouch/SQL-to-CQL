// src/services/AuthService.ts
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
    // Guarda los datos de autenticación
    saveAuthData(token: string, user: User, expiresIn: number): void {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('userData', JSON.stringify(user));
      
      const expirationTime = new Date().getTime() + expiresIn * 1000;
      localStorage.setItem('tokenExpiration', expirationTime.toString());
      
      // Configurar temporizador para refrescar o cerrar sesión antes de que expire
      this.setupTokenRefresh(expiresIn);
    }
    
    // Limpia los datos de autenticación y redirige al login
    logout(): void {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('tokenExpiration');
      // Opcional: redirigir al login
      window.location.href = '/';
    }
    
    // Obtiene el token de acceso
    getToken(): string | null {
      return localStorage.getItem('accessToken');
    }
    
    // Alias para getToken (para compatibilidad con AuthApiService)
    getAccessToken(): string | null {
      return this.getToken();
    }
    
    // Obtiene el usuario actual
    getCurrentUser(): User | null {
      const userStr = localStorage.getItem('userData');
      if (!userStr) return null;
      
      try {
        return JSON.parse(userStr) as User;
      } catch (error) {
        this.logout();
        return null;
      }
    }
    
    // Verifica si el token ha expirado
    isTokenExpired(): boolean {
      const expiration = localStorage.getItem('tokenExpiration');
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
        // Aquí implementaríamos la lógica para refrescar el token
        // Por ahora, simplemente mostramos una alerta cuando se acerque al tiempo de expiración
        if (this.isAuthenticated()) {
          alert('Su sesión está por expirar. Por favor, vuelva a iniciar sesión.');
          this.logout();
        }
      }, refreshTime);
    }
  }
  
  export default new AuthService();