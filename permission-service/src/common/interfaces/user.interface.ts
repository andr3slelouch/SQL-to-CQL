export interface User {
    cedula: string;
    nombre: string;
    contrasena: string;
    pin: string;
    rol: boolean;
    estado: boolean;
  }
  
  export interface UserResponse {
    cedula: string;
    nombre: string;
    rol: boolean;
    estado: boolean;
  }