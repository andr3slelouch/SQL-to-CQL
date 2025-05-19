import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../services/auth.service';
import { JwtPayload } from '../interfaces/auth.interfaces';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticación no proporcionado');
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const payload: JwtPayload = this.authService.verifyToken(token);
      
      // Adjuntar el usuario al request para uso posterior
      request.user = payload;
      
      // Verificar roles requeridos 
      const requiredRoles = this.reflector.get<boolean[]>('roles', context.getHandler());
      
      if (requiredRoles && requiredRoles.length) {
        const hasRequiredRole = requiredRoles.some(role => payload.rol === role);
        
        if (!hasRequiredRole) {
          throw new UnauthorizedException('No tiene permisos para acceder a este recurso');
        }
      }
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}