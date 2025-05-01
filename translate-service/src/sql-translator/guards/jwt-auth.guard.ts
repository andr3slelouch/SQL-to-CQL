// src/sql-translator/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Añadir lógica adicional aquí si es necesario
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Puedes personalizar la gestión de errores aquí
    if (err || !user) {
      throw err || new UnauthorizedException('No autenticado');
    }
    return user;
  }
}