import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionCacheService } from '../services/permission-cache.service';

// Clave para metadatos de decorador
export const OPERACION_REQUERIDA = 'operacion_requerida';

@Injectable()
export class SqlOperationGuard implements CanActivate {
  private readonly logger = new Logger(SqlOperationGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionCacheService: PermissionCacheService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obtener la operación requerida desde los metadatos del endpoint
    const operacionRequerida = this.reflector.get<string>(
      OPERACION_REQUERIDA,
      context.getHandler(),
    );

    // Si no se especifica operación requerida, permitir acceso
    if (!operacionRequerida) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    
    // Obtener información del usuario desde la request
    if (!request.user || !request.user.cedula) {
      this.logger.warn('Intento de acceso sin usuario autenticado');
      throw new ForbiddenException('Usuario no autenticado');
    }

    const cedula = request.user.cedula;
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      this.logger.warn(`Token no encontrado para usuario ${cedula}`);
      throw new ForbiddenException('Token de autenticación no encontrado');
    }

    // Verificar permiso desde la caché
    const tienePermiso = await this.permissionCacheService.tienePermiso(
      cedula, 
      operacionRequerida, 
      token
    );

    if (!tienePermiso) {
      this.logger.warn(`Usuario ${cedula} no tiene permiso para operación ${operacionRequerida}`);
      throw new ForbiddenException(`No tienes permiso para realizar operaciones de tipo ${operacionRequerida}`);
    }

    return true;
  }

  /**
   * Extrae el token JWT de la request
   * @param request Request HTTP
   * @returns Token JWT sin el prefijo "Bearer " o null si no se encuentra
   */
  private extractTokenFromRequest(request: any): string | null {
    if (!request.headers.authorization) {
      return null;
    }

    const authHeader = request.headers.authorization;
    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}