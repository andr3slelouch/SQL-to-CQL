// src/services/AuthApiService.ts

import AuthService, { User } from './AuthService';

export interface LoginCredentials {
  nombre: string;
  cedula: string;
  contrasena: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
  expiresIn: number;
}

class AuthApiService {
  // Método para realizar el inicio de sesión
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Realizar la petición de login directamente sin usar HttpService
      // porque aún no tenemos token para las cabeceras
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        // Manejo de errores según el código HTTP
        if (response.status === 429) {
          // Extraer el mensaje del backend para demasiados intentos fallidos
          const errorData = await response.json();
          
          // Formatear el mensaje para que sea más amigable
          let message = errorData.message || 'Demasiados intentos fallidos. Intente más tarde.';
          
          // Verificar si el mensaje contiene información sobre el tiempo de espera
          if (message.includes('minutos')) {
            // El mensaje ya está formateado correctamente
            throw new Error(message);
          } else {
            // Formatear el mensaje con un formato más amigable
            throw new Error('Demasiados intentos fallidos. Por favor, intente nuevamente más tarde.');
          }
        } else if (response.status === 401) {
          throw new Error('Credenciales inválidas. Por favor, verifique su nombre, cédula y contraseña.');
        } else {
          throw new Error('Error en la autenticación. Intente nuevamente.');
        }
      }
      
      // Procesar la respuesta exitosa
      const data = await response.json() as LoginResponse;
      
      // Guardar la información de autenticación
      AuthService.saveAuthData(data.accessToken, data.user, data.expiresIn);
      
      // Configurar temporizador para refrescar el token antes de que expire
      AuthService.setupTokenRefresh(data.expiresIn);
      
      return data;
    } catch (error) {
      // Re-lanzar el error para que lo maneje el componente
      throw error;
    }
  }

  // Método para verificar el estado del token
  async verifyToken(): Promise<boolean> {
    // No necesitamos hacer una solicitud al servidor si el token no está en localStorage
    if (!AuthService.getAccessToken()) {
      return false;
    }
    
    try {
      
      return AuthService.isAuthenticated();
    } catch (error) {
      console.error('Error al verificar el token:', error);
      return false;
    }
  }

  // Método para cerrar sesión
  logout(): void {
    
    
    // Limpiamos la información de autenticación local
    AuthService.logout();
  }
}

// Exportamos una instancia única del servicio
export default new AuthApiService();