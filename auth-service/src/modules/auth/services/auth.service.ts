import { Injectable, UnauthorizedException, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '../dto/login.dto';
import { LoginResponse, FailedLoginAttempt, JwtPayload } from '../interfaces/auth.interfaces';
import { UserFinderUtil } from '../../../common/utils/user-finder.util';
import { compareHashed } from '../../../common/utils/password.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private failedAttempts: Map<string, FailedLoginAttempt> = new Map();
  private readonly JWT_EXPIRATION = 900; // 15 minutos en segundos

  constructor(
    private userFinderUtil: UserFinderUtil,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Autentica un usuario
   * @param loginDto DTO con credenciales para login
   * @returns Respuesta con token JWT y datos del usuario
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { nombre, cedula, contrasena } = loginDto;
    
    // Verificar si el usuario está bloqueado temporalmente
    await this.checkBlockedStatus(cedula);
    
    try {
      // Buscar el usuario por cédula
      const user = await this.userFinderUtil.findByCedula(cedula);
      
      if (!user) {
        await this.handleFailedAttempt(cedula);
        throw new UnauthorizedException('Credenciales inválidas');
      }
      
      // Verificar que el nombre coincide
      if (user.nombre !== nombre) {
        await this.handleFailedAttempt(cedula);
        throw new UnauthorizedException('Credenciales inválidas');
      }
      
      // Verificar contraseña
      const isPasswordValid = await compareHashed(contrasena, user.contrasena);
      if (!isPasswordValid) {
        await this.handleFailedAttempt(cedula);
        throw new UnauthorizedException('Credenciales inválidas');
      }
      
      // Si llegamos aquí, las credenciales son válidas
      // Limpiar intentos fallidos
      this.failedAttempts.delete(cedula);
      
      // Generar token JWT
      const payload: JwtPayload = {
        sub: cedula,
        nombre: user.nombre,
        rol: user.rol
      };
      
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: this.JWT_EXPIRATION,
        secret: this.configService.get<string>('JWT_SECRET')
      });
      
      return {
        accessToken,
        user: {
          nombre: user.nombre,
          cedula: cedula,
          rol: user.rol
        },
        expiresIn: this.JWT_EXPIRATION
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error en autenticación: ${error.message}`, error.stack);
      throw new UnauthorizedException('Error en la autenticación');
    }
  }

  /**
   * Verificar el token JWT
   * @param token Token JWT a verificar
   * @returns Payload del token si es válido
   */
  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET')
      });
    } catch (error) {
      this.logger.error(`Error al verificar token: ${error.message}`);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  /**
   * Verifica si un usuario está bloqueado temporalmente
   * @param cedula Cédula del usuario
   */
  private async checkBlockedStatus(cedula: string): Promise<void> {
    const attempt = this.failedAttempts.get(cedula);
    
    if (attempt && attempt.blockedUntil) {
      const now = new Date();
      
      if (now < attempt.blockedUntil) {
        // Calcular tiempo restante en minutos
        const remainingTimeMs = attempt.blockedUntil.getTime() - now.getTime();
        const remainingMinutes = Math.ceil(remainingTimeMs / 60000);
        
        throw new HttpException(
          `Demasiados intentos fallidos. Intente nuevamente en ${remainingMinutes} minutos.`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }
  }

  /**
   * Gestiona un intento fallido de login
   * @param cedula Cédula del usuario
   */
  private async handleFailedAttempt(cedula: string): Promise<void> {
    const now = new Date();
    const attempt = this.failedAttempts.get(cedula) || { count: 0, lastAttempt: now, blockedUntil: null };
    
    // Incrementar contador
    attempt.count += 1;
    attempt.lastAttempt = now;
    
    // Calcular tiempo de bloqueo basado en número de intentos
    if (attempt.count >= 3) {
      // Bloqueo exponencial: 1 min, 2 min, 4 min, 8 min, etc.
      const blockMinutes = Math.pow(2, attempt.count - 3);
      const blockedUntil = new Date();
      blockedUntil.setMinutes(blockedUntil.getMinutes() + blockMinutes);
      
      attempt.blockedUntil = blockedUntil;
      
      this.logger.warn(`Usuario con cédula ${cedula} bloqueado hasta ${blockedUntil.toISOString()}`);
    }
    
    // Guardar intento
    this.failedAttempts.set(cedula, attempt);
  }
}