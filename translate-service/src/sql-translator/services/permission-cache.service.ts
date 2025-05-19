import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

// Lista oficial de operaciones permitidas
const AVAILABLE_OPERATIONS = [
  'CREATE KEYSPACE',
  'ALTER KEYSPACE',
  'DROP KEYSPACE',
  'DESCRIBE KEYSPACES',
  'USE',
  'CREATE TABLE',
  'ALTER TABLE ADD',
  'ALTER TABLE DROP',
  'ALTER TABLE RENAME',
  'DROP TABLE',
  'TRUNCATE TABLE',
  'DESCRIBE TABLES',
  'DESCRIBE TABLE',
  'CREATE INDEX',
  'DROP INDEX',
  'INSERT',
  'UPDATE',
  'DELETE',
  'SELECT'
];

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
    this.permissionsApiUrl = this.configService.get<string>('PERMISSIONS_API_URL', 
      'http://localhost:3002/api/admin');
    this.logger.log(`PermissionCacheService inicializado con TTL: 
      ${this.tiempoValidezCache}ms`);
  }

  /**
   * Obtiene los permisos de operaciones SQL de un usuario
   * @param cedula Cédula del usuario
   * @param token Token JWT del usuario
   * @returns Lista de operaciones permitidas 
   */
  async getPermisosOperaciones(cedula: string, token: string): Promise<string[]> {
    this.logger.log(`[CACHÉ DEBUG] Solicitando permisos para usuario: ${cedula}`);

    // Mostrar estado actual del caché completo
    this.logger.log(`[CACHÉ DEBUG] Estado actual del caché completo: 
      ${JSON.stringify(Array.from(this.cachePermisos.entries()).map(([key, value]) => ({
        cedula: key,
        operaciones: value.operaciones,
        ultimaActualizacion: value.ultimaActualizacion
      })))}`);

    // Verificar si tenemos permisos en caché que aún son válidos
    const permisosEnCache = this.cachePermisos.get(cedula);
    const ahora = new Date();

    if (permisosEnCache) {
      const tiempoTranscurrido = ahora.getTime() - permisosEnCache.ultimaActualizacion.getTime();
      const cacheValido = tiempoTranscurrido < this.tiempoValidezCache;

      this.logger.log(`[CACHÉ DEBUG] Información de caché para usuario ${cedula}:`);
      this.logger.log(`[CACHÉ DEBUG] - Operaciones en caché: 
        [${permisosEnCache.operaciones.join(', ')}]`);
      this.logger.log(`[CACHÉ DEBUG] - Última actualización: 
        ${permisosEnCache.ultimaActualizacion.toISOString()}`);
      this.logger.log(`[CACHÉ DEBUG] - Tiempo transcurrido: ${tiempoTranscurrido}ms`);
      this.logger.log(`[CACHÉ DEBUG] - Tiempo validez caché: ${this.tiempoValidezCache}ms`);
      this.logger.log(`[CACHÉ DEBUG] - Caché válido: ${cacheValido ? 'SÍ' : 'NO'}`);

      if (cacheValido) {
        this.logger.log(`[CACHÉ DEBUG] Usando permisos en caché para usuario ${cedula}`);
        return permisosEnCache.operaciones;
      } else {
        this.logger.log(`[CACHÉ DEBUG] Caché expirado para usuario ${cedula}, recargando...`);
      }
    } else {
      this.logger.log(`[CACHÉ DEBUG] No hay caché para usuario ${cedula}, cargando por 
        primera vez`);
    }

    // Si no está en caché o expiró, obtener del servicio de permisos
    this.logger.log(`[CACHÉ DEBUG] Cargando permisos para usuario ${cedula} del servicio de 
      permisos`);
    const operaciones = await this.cargarPermisosDesdeAPI(cedula, token);

    // Actualizar caché
    this.cachePermisos.set(cedula, {
      cedula,
      operaciones,
      ultimaActualizacion: ahora
    });

    this.logger.log(`[CACHÉ DEBUG] Caché actualizado para usuario ${cedula} con 
      operaciones: [${operaciones.join(', ')}]`);

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
      // Usar el endpoint
      const url = `${this.permissionsApiUrl}/permissions/operations?cedula=${cedula}`;
      this.logger.log(`[API DEBUG] Consultando permisos en URL: ${url}`);

      const startTime = Date.now();
      const response = await lastValueFrom(this.httpService.get(
        url,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      ));
      const endTime = Date.now();
      this.logger.log(`[API DEBUG] Tiempo de respuesta API: ${endTime - startTime}ms`);

      // Verificar si la respuesta existe y tiene datos
      if (response && response.data) {
        this.logger.log(`[API DEBUG] Respuesta API completa: ${JSON.stringify(response.data)}`);
        if (response.data.operations) {
          this.logger.log(`[API DEBUG] Operaciones recibidas de API: 
            [${response.data.operations.join(', ')}]`);
          return response.data.operations;
        } else {
          this.logger.log(`[API DEBUG] La respuesta no contiene campo 'operations'`);
        }
      } else {
        this.logger.log(`[API DEBUG] La respuesta está vacía o no tiene estructura esperada`);
      }

      return [];
    } catch (error) {
      this.logger.error(`[API DEBUG] Error al obtener permisos de operaciones:`, error);
      this.logger.error(`[API DEBUG] Mensaje de error: ${error.message}`);
      if (error.response) {
        this.logger.error(`[API DEBUG] Status: ${error.response.status}`);
        this.logger.error(`[API DEBUG] Respuesta de error: 
          ${JSON.stringify(error.response.data)}`);
      }
      // En caso de error, devuelve un array vacío (sin permisos)
      return [];
    }
  }

  /**
   * Verifica si un usuario tiene permiso para una operación específica
   * @param cedula Cédula del usuario
   * @param operacion Operación a verificar
   * @param token Token JWT del usuario
   * @returns true si tiene permiso, false en caso contrario
   */
  async tienePermiso(cedula: string, operacion: string, token: string): Promise<boolean> {
    this.logger.log(`[PERMISOS DEBUG] Verificando permiso para operación '${operacion}' del 
      usuario ${cedula}`);

    // Normalizar la operación al formato estándar definido en AVAILABLE_OPERATIONS
    const operacionNormalizada = this.normalizarOperacion(operacion);
    if (operacion !== operacionNormalizada) {
      this.logger.log(`[PERMISOS DEBUG] Operación normalizada: '${operacion}' -> 
        '${operacionNormalizada}'`);
    }

    const permisos = await this.getPermisosOperaciones(cedula, token);
    this.logger.log(`[PERMISOS DEBUG] Permisos disponibles: [${permisos.join(', ')}]`);

    // Verificar si tiene permiso para la operación específica
    // También verifica si tiene permisos de administrador (todas las operaciones)
    const esAdmin = permisos.includes('*');
    const tieneOperacionEspecifica = permisos.includes(operacionNormalizada);
    const tienePermiso = esAdmin || tieneOperacionEspecifica;

    this.logger.log(`[PERMISOS DEBUG] Resultado de verificación para usuario ${cedula}:`);
    this.logger.log(`[PERMISOS DEBUG] - Es admin (*): ${esAdmin ? 'SÍ' : 'NO'}`);
    this.logger.log(`[PERMISOS DEBUG] - Tiene operación específica 
      (${operacionNormalizada}): ${tieneOperacionEspecifica ? 'SÍ' : 'NO'}`);
    this.logger.log(`[PERMISOS DEBUG] - Resultado final: ${tienePermiso ? 'AUTORIZADO' : 
      'DENEGADO'}`);

    return tienePermiso;
  }

  /**
   * Normaliza una operación al formato estándar definido en AVAILABLE_OPERATIONS
   * @param operacion Operación a normalizar
   * @returns Operación normalizada
   */
  private normalizarOperacion(operacion: string): string {
    // MODIFICADO: Casos especiales de normalización mejorado para manejar todas las variantes
    const operacionUpper = operacion.toUpperCase();
    
    // SHOW DATABASES/SCHEMAS -> DESCRIBE KEYSPACES
    if (operacionUpper.startsWith('SHOW') && 
       (operacionUpper.includes('DATABASE') || operacionUpper.includes('SCHEMA'))) {
      this.logger.log(`[PERMISOS DEBUG] SHOW DATABASES/SCHEMAS normalizado a DESCRIBE KEYSPACES`);
      return 'DESCRIBE KEYSPACES';
    }
    
    // DESCRIBE/DESC DATABASES -> DESCRIBE KEYSPACES
    if ((operacionUpper.startsWith('DESC') || operacionUpper.startsWith('DESCRIBE')) && 
        (operacionUpper.includes('DATABASE') || operacionUpper.includes('SCHEMA'))) {
      this.logger.log(`[PERMISOS DEBUG] DESC/DESCRIBE DATABASES/SCHEMAS normalizado a DESCRIBE KEYSPACES`);
      return 'DESCRIBE KEYSPACES';
    }
    
    // Casos explícitos de KEYSPACES, DATABASES o SCHEMAS
    if (operacionUpper.includes('KEYSPACE') || 
        operacionUpper.includes('DATABASE') || 
        operacionUpper.includes('SCHEMA')) {
      // Si es una operación de creación, alteración o eliminación
      if (operacionUpper.startsWith('CREATE')) {
        return 'CREATE KEYSPACE';
      }
      if (operacionUpper.startsWith('ALTER')) {
        return 'ALTER KEYSPACE';
      }
      if (operacionUpper.startsWith('DROP')) {
        return 'DROP KEYSPACE';
      }
      // Por defecto, asumimos que es DESCRIBE KEYSPACES
      this.logger.log(`[PERMISOS DEBUG] Operación con KEYSPACES/DATABASES/SCHEMAS identificada: ${operacion}`);
      return 'DESCRIBE KEYSPACES';
    }
    
    // SHOW TABLES -> DESCRIBE TABLES
    if (operacionUpper.startsWith('SHOW') && operacionUpper.includes('TABLE')) {
      this.logger.log(`[PERMISOS DEBUG] SHOW TABLES normalizado a DESCRIBE TABLES`);
      return 'DESCRIBE TABLES';
    }
    
    // Verificar casos explícitos de TABLES
    if (operacionUpper.includes('TABLE')) {
      if (operacionUpper.startsWith('DESCRIBE') || operacionUpper.startsWith('DESC')) {
        if (operacionUpper.includes('TABLES')) {
          this.logger.log(`[PERMISOS DEBUG] DESCRIBE/DESC TABLES identificado`);
          return 'DESCRIBE TABLES';
        } else {
          this.logger.log(`[PERMISOS DEBUG] DESCRIBE/DESC TABLE identificado`);
          return 'DESCRIBE TABLE';
        }
      }
    }
    
    // Manejar otros casos específicos con switch
    switch(operacionUpper) {
      case 'DESC':
      case 'DESCRIBE':
        this.logger.log(`[PERMISOS DEBUG] Operación DESC/DESCRIBE sin especificar, mapeando a DESCRIBE TABLES`);
        return 'DESCRIBE TABLES';
      case 'DESC TABLE':
      case 'DESCRIBE TABLE':
        return 'DESCRIBE TABLE';
      case 'DESC TABLES':
      case 'DESCRIBE TABLES':
        return 'DESCRIBE TABLES';
      case 'DESC KEYSPACES':
      case 'DESCRIBE KEYSPACES':
      case 'DESC DATABASES':
      case 'DESCRIBE DATABASES':
      case 'DESC SCHEMAS':
      case 'DESCRIBE SCHEMAS':
        return 'DESCRIBE KEYSPACES';
      case 'SHOW DATABASES':
      case 'SHOW SCHEMAS':
      case 'SHOW KEYSPACES':
        return 'DESCRIBE KEYSPACES';
      case 'SHOW TABLES':
        return 'DESCRIBE TABLES';
      case 'USE DATABASE':
      case 'USE SCHEMA':
      case 'USE KEYSPACE':
      case 'USE':
        return 'USE';
      default:
        // Buscar coincidencia exacta en AVAILABLE_OPERATIONS
        if (AVAILABLE_OPERATIONS.includes(operacionUpper)) {
          return operacionUpper;
        }
        // Buscar coincidencia parcial
        for (const op of AVAILABLE_OPERATIONS) {
          // Si la operación está contenida en una operación disponible o viceversa
          if (op.includes(operacionUpper) || operacionUpper.includes(op)) {
            return op;
          }
        }
        // Si no hay coincidencia, devolver la operación original
        return operacion;
    }
  }

  /**
   * Limpia la caché de permisos para un usuario específico
   * @param cedula Cédula del usuario
   */
  limpiarCacheUsuario(cedula: string): void {
    this.logger.log(`[CACHÉ DEBUG] Limpiando caché de permisos para usuario ${cedula}`);
    const existiaCache = this.cachePermisos.has(cedula);
    this.cachePermisos.delete(cedula);
    this.logger.log(`[CACHÉ DEBUG] Caché ${existiaCache ? 'eliminado' : 'no existía'} para 
      usuario ${cedula}`);
  }

  /**
   * Limpia toda la caché de permisos
   */
  limpiarTodaLaCache(): void {
    this.cachePermisos.clear();
    this.logger.debug('Cache de permisos completamente limpiado');
  }
}