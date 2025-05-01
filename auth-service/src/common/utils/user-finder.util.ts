import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Client } from 'cassandra-driver';
import { CASSANDRA_CLIENT } from '../../database/cassandra.provider';
import { compareHashed } from './password.util';
import { User, UserManageResponse } from '../interfaces/user.interface';

@Injectable()
export class UserFinderUtil {
  private readonly logger = new Logger(UserFinderUtil.name);

  constructor(
    @Inject(CASSANDRA_CLIENT)
    private cassandraClient: Client,
  ) {}

  /**
   * Busca usuarios por nombre
   * @param nombre Nombre a buscar
   * @returns Lista de usuarios que coinciden
   */
  async findByName(nombre: string): Promise<UserManageResponse[]> {
    try {
      const query = 'SELECT cedula, nombre, rol, estado FROM auth.users WHERE nombre = ? ALLOW FILTERING';
      const result = await this.cassandraClient.execute(query, [nombre], { prepare: true });
      
      if (result.rowLength === 0) {
        throw new NotFoundException(`No se encontraron usuarios con el nombre: ${nombre}`);
      }
      
      return result.rows.map(row => ({
        cedula: row.cedula,
        nombre: row.nombre,
        rol: row.rol,
        estado: row.estado
      }));
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al buscar usuarios por nombre: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca un usuario por su cédula
   * @param cedula Cédula del usuario a buscar
   * @returns Usuario encontrado o null
   */
  async findByCedula(cedula: string): Promise<User | null> {
    try {
      // Como la cédula está cifrada, tenemos que obtener todos y comparar
      const query = 'SELECT cedula, nombre, contrasena, pin, rol, estado FROM auth.users ALLOW FILTERING';
      const result = await this.cassandraClient.execute(query, [], { prepare: true });
      
      // Buscar coincidencia de cédula
      for (const row of result.rows) {
        if (await compareHashed(cedula, row.cedula)) {
          return {
            cedula: row.cedula,
            nombre: row.nombre,
            contrasena: row.contrasena,
            pin: row.pin,
            rol: row.rol,
            estado: row.estado
          };
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error al buscar usuario por cédula: ${error.message}`, error.stack);
      throw error;
    }
  }
}