import { Injectable, NotFoundException, InternalServerErrorException, Inject, Logger } from '@nestjs/common';
import { Client } from 'cassandra-driver';
import { CASSANDRA_CLIENT } from '../../../database/cassandra.provider';
import { UserFinderUtil } from '../../../common/utils/user-finder.util';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { SearchUserDto } from '../dto/search-user.dto';
import { UserResponse } from '../../../common/interfaces/user.interface';

@Injectable()
export class ChangeRoleService {
  private readonly logger = new Logger(ChangeRoleService.name);

  constructor(
    @Inject(CASSANDRA_CLIENT)
    private cassandraClient: Client,
    private userFinderUtil: UserFinderUtil
  ) {}

  /**
   * Busca un usuario por cédula
   * @param searchUserDto DTO con la cédula a buscar
   * @returns Datos del usuario encontrado
   */
  async findUser(searchUserDto: SearchUserDto): Promise<UserResponse> {
    const { cedula } = searchUserDto;
    
    const user = await this.userFinderUtil.findByCedula(cedula);
    if (!user) {
      throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
    }
    
    // Modificamos la respuesta para mostrar la cédula sin encriptar
    return {
      ...user,
      cedula: cedula 
    };
  }

  /**
   * Actualiza el rol de un usuario
   * @param updateRoleDto DTO con la cédula y el nuevo rol
   * @returns Usuario con el rol actualizado
   */
  async updateRole(updateRoleDto: UpdateRoleDto): Promise<UserResponse> {
    const { cedula, rol } = updateRoleDto;
    
    try {
      // Buscar usuario por cédula para verificar que existe
      const user = await this.userFinderUtil.findByCedula(cedula);
      if (!user) {
        throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
      }
      
      // Actualizar el rol del usuario usando la cédula encriptada que encontramos
      const updateQuery = 'UPDATE auth.users SET rol = ? WHERE cedula = ?';
      await this.cassandraClient.execute(updateQuery, [rol, user.cedula], { prepare: true });
      
      this.logger.log(`Rol del usuario con cédula ${cedula} actualizado a ${rol ? 'administrador' : 'normal'}`);
      
      // Retornar usuario con rol actualizado, mostrando la cédula sin encriptar
      return {
        cedula: cedula, // Cédula sin encriptar
        nombre: user.nombre,
        rol: rol, // Rol actualizado
        estado: user.estado
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al actualizar el rol del usuario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al actualizar el rol del usuario');
    }
  }
}