/**
 * Interfaz para representar un usuario en la base de datos
 */
export interface User {
    cedula: string;
    nombre: string;
    contrasena: string;
    pin: string;
    rol: boolean;
    estado: boolean;
  }
  
  /**
   * Interfaz para respuestas de búsqueda/gestión de usuarios
   */
  export interface UserManageResponse {
    cedula: string;
    nombre: string;
    rol: boolean;
    estado: boolean;
  }
  
  /**
   * Interfaz para respuesta de creación de usuario
   */
  export interface UserCreateResponse {
    nombre: string;
    pin: string;
  }