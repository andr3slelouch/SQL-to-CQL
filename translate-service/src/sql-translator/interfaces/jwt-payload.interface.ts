// src/sql-translator/interfaces/jwt-payload.interface.ts
export interface JwtPayload {
    sub: string;       // cédula del usuario
    nombre: string;    // nombre del usuario
    rol: boolean;      // rol del usuario (true = admin, false = normal)
    iat?: number;      // issued at
    exp?: number;      // expires
  }