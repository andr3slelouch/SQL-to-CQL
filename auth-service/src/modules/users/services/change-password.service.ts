import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException, Inject, Logger } from '@nestjs/common';
import { Client } from 'cassandra-driver';
import { CASSANDRA_CLIENT } from '../../../database/cassandra.provider';
import { UserFinderUtil } from '../../../common/utils/user-finder.util';
import { VerifyUserCredentialsDto, ChangePasswordDto, GenerateTempPinDto } from '../dto/change-password.dto';
import { hashPassword, compareHashed } from '../../../common/utils/password.util';

interface TempPin {
  pin: string;
  expiresAt: Date;
}

@Injectable()
export class ChangePasswordService {
  private readonly logger = new Logger(ChangePasswordService.name);
  private tempPins: Map<string, TempPin> = new Map(); // Almacena PINs temporales por cédula

  constructor(
    @Inject(CASSANDRA_CLIENT)
    private cassandraClient: Client,
    private userFinderUtil: UserFinderUtil
  ) {}

  /**
   * Verifica las credenciales del usuario (nombre, cédula y PIN)
   * @param verifyUserCredentialsDto DTO con credenciales a verificar
   * @returns true si las credenciales son válidas
   */
  async verifyUserCredentials(verifyUserCredentialsDto: VerifyUserCredentialsDto): Promise<{ valid: boolean, message: string }> {
    const { nombre, cedula, pin } = verifyUserCredentialsDto;
    
    try {
      // Buscar el usuario por cédula
      const user = await this.userFinderUtil.findByCedula(cedula);
      
      if (!user) {
        return { valid: false, message: 'Usuario no encontrado' };
      }
      
      // Verificar que el nombre coincide
      if (user.nombre !== nombre) {
        return { valid: false, message: 'Las credenciales no son válidas' };
      }
      
      // Verificar si hay un PIN temporal para este usuario
      const tempPinData = this.tempPins.get(cedula);
      let pinValid = false;
      
      if (tempPinData && new Date() < tempPinData.expiresAt) {
        // Verificar PIN temporal
        pinValid = tempPinData.pin === pin;
      } else {
        // Verificar PIN almacenado
        pinValid = await compareHashed(pin, user.pin);
      }
      
      if (!pinValid) {
        return { valid: false, message: 'Las credenciales no son válidas' };
      }
      
      return { valid: true, message: 'Credenciales válidas' };
    } catch (error) {
      this.logger.error(`Error al verificar credenciales: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al verificar credenciales');
    }
  }

  /**
   * Cambia la contraseña del usuario
   * @param changePasswordDto DTO con datos para cambio de contraseña
   * @returns Mensaje de confirmación
   */
  async changePassword(changePasswordDto: ChangePasswordDto): Promise<{ message: string, newPin?: string }> {
    const { nombre, cedula, nuevaContrasena, confirmarContrasena, pin } = changePasswordDto;
    
    // Verificar que las contraseñas coinciden
    if (nuevaContrasena !== confirmarContrasena) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }
    
    // Verificar credenciales
    const verification = await this.verifyUserCredentials({ nombre, cedula, pin });
    if (!verification.valid) {
      throw new UnauthorizedException(verification.message);
    }
    
    try {
      // Buscar usuario
      const user = await this.userFinderUtil.findByCedula(cedula);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      
      // Encriptar la nueva contraseña
      const hashedPassword = await hashPassword(nuevaContrasena);
      
      // Verificar si se usó un PIN temporal
      const tempPinData = this.tempPins.get(cedula);
      const usedTempPin = tempPinData && 
                         new Date() < tempPinData.expiresAt &&
                         tempPinData.pin === pin;
      
      let newPin: string | undefined = undefined;
      let hashedPin = user.pin; // Por defecto, mantener el PIN existente
      
      // Si se usó un PIN temporal, generar uno nuevo
      if (usedTempPin) {
        newPin = this.generateRandomPin();
        hashedPin = await hashPassword(newPin);
        // Limpiar el PIN temporal
        this.tempPins.delete(cedula);
      }
      
      // Actualizar contraseña y PIN (si es necesario)
      const updateQuery = 'UPDATE auth.users SET contrasena = ?, pin = ? WHERE cedula = ?';
      await this.cassandraClient.execute(
        updateQuery, 
        [hashedPassword, hashedPin, user.cedula], 
        { prepare: true }
      );
      
      if (newPin) {
        return { 
          message: 'Contraseña actualizada correctamente. Se ha generado un nuevo PIN.',
          newPin
        };
      } else {
        return { message: 'Contraseña actualizada correctamente' };
      }
    } catch (error) {
      if (error instanceof UnauthorizedException || 
          error instanceof NotFoundException ||
          error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al cambiar contraseña: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al cambiar la contraseña');
    }
  }

  /**
   * Genera un PIN temporal para un usuario (solo admin)
   * @param generateTempPinDto DTO con cédula del usuario
   * @returns PIN temporal generado
   */
  async generateTemporaryPin(generateTempPinDto: GenerateTempPinDto): Promise<{ tempPin: string, expiresAt: Date }> {
    const { cedula } = generateTempPinDto;
    
    try {
      // Verificar que el usuario existe
      const user = await this.userFinderUtil.findByCedula(cedula);
      if (!user) {
        throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
      }
      
      // Generar PIN temporal
      const tempPin = this.generateRandomPin();
      
      // Establecer tiempo de expiración (5 minutos)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);
      
      // Guardar PIN temporal
      this.tempPins.set(cedula, { pin: tempPin, expiresAt });
      
      this.logger.log(`PIN temporal generado para usuario con cédula ${cedula}`);
      
      return { tempPin, expiresAt };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al generar PIN temporal: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al generar PIN temporal');
    }
  }

  /**
   * Busca un usuario por cédula y devuelve información básica
   * @param cedula Cédula del usuario a buscar
   * @returns Información básica del usuario
   */
  async findUserByCedula(cedula: string): Promise<{ 
  nombre: string, 
  cedula: string, 
  rol: string 
}> {
  try {
    const user = await this.userFinderUtil.findByCedula(cedula);
    
    if (!user) {
      throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
    }
    
    return {
      nombre: user.nombre,
      cedula: cedula, // Devolver la cédula sin cifrar que recibimos como parámetro
      rol: user.rol === true ? 'Administrador' : 'Usuario Común'
    };
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    this.logger.error(`Error al buscar usuario por cédula: ${error.message}`, error.stack);
    throw new InternalServerErrorException('Error al buscar usuario');
  }
}

  /**
   * Genera un PIN aleatorio de 6 caracteres alfanuméricos
   */
  private generateRandomPin(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    
    return result;
  }
}