// src/common/interfaces/user-keyspaces-response.interface.ts
export interface UserKeyspacesResponse {
    cedula: string;
    nombre: string;
    rol: boolean;
    keyspaces: string[];
  }