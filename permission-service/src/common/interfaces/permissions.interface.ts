// src/common/interfaces/permissions.interface.ts
export interface UserPermissions {
  cedula: string;
  keyspaces: string[];
  operaciones: string[];
}
  
export interface UserPermissionsResponse {
  cedula: string;
  nombre: string;
  rol: boolean;
  operaciones: string[];
  operacionesDisponibles: string[];
  keyspaces?: string[];
}

export interface KeyspaceUpdateRequest {
  cedula: string;
  keyspace: string;
  action: 'add' | 'remove';
}