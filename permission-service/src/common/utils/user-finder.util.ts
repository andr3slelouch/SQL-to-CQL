import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Client } from 'cassandra-driver';
import { CASSANDRA_CLIENT } from '../../database/cassandra.provider';
import { User, UserResponse } from '../interfaces/user.interface';
import { hashPassword, compareHashed } from './password.util';

@Injectable()
export class UserFinderUtil {
  private readonly logger = new Logger(UserFinderUtil.name);

  constructor(
    @Inject(CASSANDRA_CLIENT)
    private cassandraClient: Client,
  ) {}

  /**
   * Busca un usuario por su cédula encriptándola primero
   * @param cedula Cédula del usuario a buscar
   * @returns Datos del usuario encontrado
   */
  async findByCedula(cedula: string): Promise<UserResponse | null> {
    try {
      // Encriptar la cédula para buscarla en la base de datos
      const hashedCedula = await hashPassword(cedula);
      
      // Buscar todos los usuarios
      const query = 'SELECT cedula, nombre, rol, estado FROM auth.users ALLOW FILTERING';
      const result = await this.cassandraClient.execute(query, [], { prepare: true });
      
      // Filtrar los resultados para encontrar la coincidencia mediante bcrypt.compare
      for (const row of result.rows) {
        const matches = await compareHashed(cedula, row.cedula);
        if (matches) {
          return {
            cedula: row.cedula, // Devolvemos la cédula encriptada almacenada en DB
            nombre: row.nombre,
            rol: row.rol,
            estado: row.estado
          };
        }
      }
      
      return null; // No se encontró coincidencia
    } catch (error) {
      this.logger.error(`Error al buscar usuario por cédula: ${error.message}`, error.stack);
      throw error;
    }
  }
}