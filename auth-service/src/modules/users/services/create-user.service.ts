import { Injectable, InternalServerErrorException, Inject, Logger, ConflictException } from '@nestjs/common';
import { Client } from 'cassandra-driver';
import { CASSANDRA_CLIENT } from '../../../database/cassandra.provider';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserCreateResponse } from '../../../common/interfaces/user.interface';
import { hashPassword } from '../../../common/utils/password.util';
import { getDefaultOperations } from '../../../common/utils/user-operations.util';

@Injectable()
export class CreateUserService {
  private readonly logger = new Logger(CreateUserService.name);

  constructor(
    @Inject(CASSANDRA_CLIENT)
    private cassandraClient: Client,
  ) {}

  /**
   * Crea un nuevo usuario
   * @param createUserDto Datos para crear el usuario
   * @returns Datos del usuario creado (solo nombre y PIN)
   */
  async create(createUserDto: CreateUserDto): Promise<UserCreateResponse> {
    const { cedula, name, password } = createUserDto;
    
    // Verificar si la cédula ya existe en la tabla permissions (sin hash)
    await this.checkIfCedulaExistsInPermissions(cedula);
    
    // Encriptar cédula y contraseña
    const hashedCedula = await hashPassword(cedula);
    const hashedPassword = await hashPassword(password);
    
    // Generar PIN único (sin encriptar)
    const plainPin = await this.generateUniquePin(); 
    
    // Encriptar el PIN para guardarlo en la base de datos
    const hashedPin = await hashPassword(plainPin);
    
    const rol = false; // 0 como valor predeterminado (normal)
    const estado = true; // 1 como valor predeterminado (activo)
    
    try {
      // 1. Insertar usuario en la tabla users
      const userQuery = `
        INSERT INTO auth.users 
        (cedula, nombre, contrasena, pin, rol, estado) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await this.cassandraClient.execute(
        userQuery,
        [hashedCedula, name.trim(), hashedPassword, hashedPin, rol, estado],
        { prepare: true }
      );
      
      // 2. Insertar permisos predeterminados en la tabla permissions
      const permissionsQuery = `
        INSERT INTO auth.permissions
        (cedula, keyspaces, operaciones)
        VALUES (?, ?, ?)
      `;

      // Obtener operaciones predeterminadas
      const defaultOperations = getDefaultOperations();
      
      // Lista de keyspaces vacía inicialmente
      const emptyKeyspaces: string[] = [];
      
      await this.cassandraClient.execute(
        permissionsQuery,
        [cedula, emptyKeyspaces, defaultOperations],  // Cédula sin hash para permisos
        { prepare: true }
      );
      
      this.logger.log(`Creado usuario ${name.trim()} con cédula ${cedula} y asignadas ${defaultOperations.length} operaciones predeterminadas`);
      
      // Devolver solo el nombre y el PIN sin encriptar
      return {
        nombre: name.trim(),
        pin: plainPin
      };
    } catch (error) {
      this.logger.error(`Error al crear el usuario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al crear el usuario');
    }
  }

  /**
   * Verifica si la cédula ya existe en la tabla permissions
   * @param cedula Cédula a verificar
   * @throws ConflictException si la cédula ya existe
   */
  private async checkIfCedulaExistsInPermissions(cedula: string): Promise<void> {
    try {
      const query = 'SELECT cedula FROM auth.permissions WHERE cedula = ? ALLOW FILTERING';
      const result = await this.cassandraClient.execute(query, [cedula], { prepare: true });
      
      if (result.rowLength > 0) {
        this.logger.warn(`Intento de crear usuario con cédula duplicada: ${cedula}`);
        throw new ConflictException(`Ya existe un usuario con la cédula ${cedula}`);
      }
    } catch (error) {
      // Si el error es nuestro ConflictException, lo propagamos
      if (error instanceof ConflictException) {
        throw error;
      }
      
      // Para otros errores, registramos y lanzamos un error genérico
      this.logger.error(`Error al verificar si la cédula existe en permissions: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al verificar si el usuario existe');
    }
  }

  /**
   * Genera un PIN aleatorio de 6 caracteres alfanuméricos
   * @returns PIN generado
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

  /**
   * Genera un PIN único
   * @returns PIN único sin encriptar
   */
  private async generateUniquePin(): Promise<string> {
    let isUnique = false;
    let pin = '';
    let attempts = 0;
    const maxAttempts = 10; // Limitar número de intentos
    
    while (!isUnique && attempts < maxAttempts) {
      attempts++;
      pin = this.generateRandomPin();
      
      try {
        // Para verificar si el PIN ya existe, primero debemos encriptarlo
        const hashedPin = await hashPassword(pin);
        
        // Verificar si el PIN ya existe
        const query = 'SELECT cedula FROM auth.users WHERE pin = ? ALLOW FILTERING';
        const result = await this.cassandraClient.execute(query, [hashedPin], { prepare: true });
        
        // Si no hay resultados, el PIN es único
        isUnique = result.rowLength === 0;
      } catch (error) {
        this.logger.warn(`Error al verificar PIN, retentando: ${error.message}`);
        // Si hay un error al verificar, intentamos con otro PIN
      }
    }
    
    if (attempts >= maxAttempts) {
      this.logger.warn(`Se alcanzó el máximo de intentos (${maxAttempts}) al generar un PIN único`);
      // En caso extremo, generamos un nuevo PIN con timestamp para garantizar unicidad
      pin = this.generateRandomPin() + Date.now().toString().slice(-4);
    }
    
    // Registrar lo que ocurrió (sin mostrar el PIN real)
    this.logger.log(`PIN único generado después de ${attempts} intentos`);
    
    return pin; // Devolvemos el PIN sin encriptar
  }
}