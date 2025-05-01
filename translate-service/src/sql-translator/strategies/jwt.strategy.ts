// src/sql-translator/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'default_secret_change_this_in_production'),
    });
  }

  async validate(payload: JwtPayload) {
    // Aquí podríamos hacer validaciones adicionales si fuera necesario
    // Por ejemplo, verificar si el usuario sigue activo en la base de datos

    return {
      cedula: payload.sub,
      nombre: payload.nombre,
      rol: payload.rol,
    };
  }
}