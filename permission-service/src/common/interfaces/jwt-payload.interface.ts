export interface JwtPayload {
    sub: string;       // cédula del usuario
    nombre: string;    // nombre del usuario
    rol: boolean;      // rol del usuario (true = admin, false = normal)
    iat?: number;      
    exp?: number;      
  }