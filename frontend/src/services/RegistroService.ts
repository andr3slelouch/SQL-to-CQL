// src/services/RegistroService.ts
import HttpService from './HttpService';

// Interfaces para tipado basadas en el backend
interface CreateUserDto {
  cedula: string;
  name: string;
  password: string;
}

interface UserCreateResponse {
  nombre: string;
  pin: string;
}

class RegistroService {
  /**
   * Crea un nuevo usuario
   * @param userData Datos del usuario a crear
   * @returns Respuesta con nombre y PIN generado
   */
  async createUser(userData: CreateUserDto): Promise<UserCreateResponse> {
    try {
      const response = await HttpService.post<UserCreateResponse>(
        '/users',  // Solo '/users' ya que HttpService añade el prefijo /api
        userData,
        { service: 'auth' }
      );
      
      return response;
    } catch (error) {
      console.error('Error en RegistroService.createUser:', error);
      
      // El HttpService ya maneja el mensaje para cédula duplicada, simplemente re-lanzar el error
      throw error;
    }
  }
}

// Exportamos una instancia única del servicio
export default new RegistroService();