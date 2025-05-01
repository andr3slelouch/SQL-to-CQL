import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

interface PermisosUsuario {
  cedula: string;
  operaciones: string[];
  ultimaActualizacion: Date;
}

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  private cachePermisos: Map<string, PermisosUsuario> = new Map();
  // Tiempo en milisegundos para considerar la caché válida (15 minutos por defecto)
  private tiempoValidezCache: number;
  private readonly permissionsApiUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService
  ) {
    this.tiempoValidezCache = this.configService.get<number>('CACHE_TTL_MS', 15 * 60 * 1000);
    this.permissionsApiUrl = this.configService.get<string>('PERMISSIONS_API_URL', 'http://localhost:3002/api/admin');
    this.logger.log(`PermissionCacheService inicializado con TTL: ${this.tiempoValidezCache}ms`);
  }

  /**
   * Obtiene los permisos de operaciones SQL de un usuario
   * @param cedula Cédula del usuario
   * @param token Token JWT del usuario
   * @returns Lista de operaciones permitidas (SELECT, INSERT, UPDATE, DELETE, etc.)
   */
  async getPermisosOperaciones(cedula: string, token: string): Promise<string[]> {
    // Verificar si tenemos permisos en caché que aún son válidos
    const permisosEnCache = this.cachePermisos.get(cedula);
    const ahora = new Date();
    
    if (permisosEnCache && 
        (ahora.getTime() - permisosEnCache.ultimaActualizacion.getTime()) < this.tiempoValidezCache) {
      this.logger.debug(`Usando permisos en caché para usuario ${cedula}`);
      return permisosEnCache.operaciones;
    }
    
    // Si no está en caché o expiró, obtener del servicio de permisos
    this.logger.debug(`Cargando permisos para usuario ${cedula} del servicio de permisos`);
    const operaciones = await this.cargarPermisosDesdeAPI(cedula, token);
    
    // Actualizar caché
    this.cachePermisos.set(cedula, {
      cedula,
      operaciones,
      ultimaActualizacion: ahora
    });
    
    return operaciones;
  }

  /**
   * Carga los permisos de operaciones desde la API de permisos
   * @param cedula Cédula del usuario
   * @param token Token JWT para autenticación
   * @returns Lista de operaciones permitidas
   */
  private async cargarPermisosDesdeAPI(cedula: string, token: string): Promise<string[]> {
    try {
      // Usar el endpoint que acabamos de crear para consultar permisos
      const url = `${this.permissionsApiUrl}/permissions/operations?cedula=${cedula}`;
      
      const response = await lastValueFrom(this.httpService.get(
        url,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      ));
      
      // Verificar si la respuesta existe y tiene datos
      if (response && response.data && response.data.operations) {
        return response.data.operations;
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Error al obtener permisos de operaciones: ${error.message}`);
      // En caso de error, devuelve un array vacío (sin permisos)
      return [];
    }
  }

  /**
   * Verifica si un usuario tiene permiso para una operación específica
   * @param cedula Cédula del usuario
   * @param operacion Operación a verificar (SELECT, INSERT, UPDATE, DELETE)
   * @param token Token JWT del usuario
   * @returns true si tiene permiso, false en caso contrario
   */
  async tienePermiso(cedula: string, operacion: string, token: string): Promise<boolean> {
    const permisos = await this.getPermisosOperaciones(cedula, token);
    
    // Verificar si tiene permiso para la operación específica
    // También verifica si tiene permisos de administrador (todas las operaciones)
    return permisos.includes(operacion) || permisos.includes('*');
  }

  /**
   * Limpia la caché de permisos para un usuario específico
   * @param cedula Cédula del usuario
   */
  limpiarCacheUsuario(cedula: string): void {
    this.cachePermisos.delete(cedula);
    this.logger.debug(`Cache de permisos eliminado para usuario ${cedula}`);
  }

  /**
   * Limpia toda la caché de permisos
   */
  limpiarTodaLaCache(): void {
    this.cachePermisos.clear();
    this.logger.debug('Cache de permisos completamente limpiado');
  }
}