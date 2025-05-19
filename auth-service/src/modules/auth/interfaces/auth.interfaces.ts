export interface LoginResponse {
    accessToken: string;
    user: {
      nombre: string;
      cedula: string;
      rol: boolean;
    };
    expiresIn: number; // Tiempo de expiración en segundos
  }
  
  export interface FailedLoginAttempt {
    count: number;
    lastAttempt: Date;
    blockedUntil: Date | null;
  }
  
  export interface JwtPayload {
    sub: string; // cedula del usuario
    nombre: string;
    rol: boolean;
    iat?: number; 
    exp?: number; 
  }