// src/services/UserService.ts
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

class UserService {
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
      console.error('Error en UserService.createUser:', error);
      
      if (error instanceof Error) {
        // Si es un error conocido, re-lanzarlo
        throw error;
      }
      
      // Si es un error desconocido, lanzar un error genérico
      throw new Error('Error al crear el usuario');
    }
  }
}

// Exportamos una instancia única del servicio
export default new UserService();