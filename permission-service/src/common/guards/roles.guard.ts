import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<boolean[]>('roles', context.getHandler());
    
    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    // Verificar que el usuario existe y tiene un rol
    if (!user || user.rol === undefined) {
      throw new UnauthorizedException('Usuario no autenticado o sin rol asignado');
    }
    
    // Verificar si el rol del usuario está en los roles permitidos
    return requiredRoles.some(role => user.rol === role);
  }
}