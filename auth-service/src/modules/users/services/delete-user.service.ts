import { Injectable, NotFoundException, InternalServerErrorException, Inject, Logger } from '@nestjs/common';
import { Client } from 'cassandra-driver';
import { CASSANDRA_CLIENT } from '../../../database/cassandra.provider';
import { UserFinderUtil } from '../../../common/utils/user-finder.util';
import { DeleteUserDto, DeactivateUserDto } from '../dto/delete-user.dto';
import { UserManageResponse } from '../../../common/interfaces/user.interface';

@Injectable()
export class DeleteUserService {
  private readonly logger = new Logger(DeleteUserService.name);

  constructor(
    @Inject(CASSANDRA_CLIENT)
    private cassandraClient: Client,
    private userFinderUtil: UserFinderUtil
  ) {}

  /**
   * Elimina permanentemente un usuario
   * @param deleteUserDto DTO con la cédula del usuario a eliminar
   * @returns Mensaje de confirmación
   */
  async deleteUser(deleteUserDto: DeleteUserDto): Promise<{ message: string }> {
    const { cedula } = deleteUserDto;
    
    try {
      // Buscar el usuario por cédula
      const user = await this.userFinderUtil.findByCedula(cedula);
      
      if (!user) {
        throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
      }
      
      // 1. Eliminar los permisos del usuario
      const deletePermissionsQuery = 'DELETE FROM auth.permissions WHERE cedula = ?';
      await this.cassandraClient.execute(deletePermissionsQuery, [cedula], { prepare: true });
      
      // 2. Eliminar el usuario
      const deleteUserQuery = 'DELETE FROM auth.users WHERE cedula = ?';
      await this.cassandraClient.execute(deleteUserQuery, [user.cedula], { prepare: true });
      
      this.logger.log(`Usuario con cédula ${cedula} y sus permisos eliminados correctamente`);
      return { message: `Usuario con cédula ${cedula} eliminado correctamente` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al eliminar el usuario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al eliminar el usuario');
    }
  }

  /**
   * Desactiva un usuario (cambia su estado a false/0)
   * @param deactivateUserDto DTO con la cédula y nuevo estado
   * @returns Usuario con estado actualizado
   */
  async deactivateUser(deactivateUserDto: DeactivateUserDto): Promise<UserManageResponse> {
    const { cedula, estado } = deactivateUserDto;
    
    try {
      // Buscar el usuario por cédula
      const user = await this.userFinderUtil.findByCedula(cedula);
      
      if (!user) {
        throw new NotFoundException(`No se encontró un usuario con la cédula: ${cedula}`);
      }
      
      // Actualizar el estado del usuario
      const updateQuery = 'UPDATE auth.users SET estado = ? WHERE cedula = ?';
      await this.cassandraClient.execute(updateQuery, [estado, user.cedula], { prepare: true });
      
      this.logger.log(`Estado del usuario con cédula ${cedula} actualizado a ${estado ? 'activo' : 'inactivo'}`);
      
      // Devolver usuario actualizado
      return {
        cedula: user.cedula,
        nombre: user.nombre,
        rol: user.rol,
        estado: estado // Estado actualizado
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al desactivar el usuario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al desactivar el usuario');
    }
  }
}