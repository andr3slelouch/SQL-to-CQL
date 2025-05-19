import { Controller, Post, Body, ValidationPipe, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { UserFinderUtil } from '../../../common/utils/user-finder.util';
import { SearchUserDto } from '../dto/search-user.dto';
import { UserManageResponse } from '../../../common/interfaces/user.interface';

@Controller('admin/users')
export class SearchUserController {
  constructor(private readonly userFinderUtil: UserFinderUtil) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async searchByCedula(@Body(ValidationPipe) searchUserDto: SearchUserDto): Promise<UserManageResponse> {
    const user = await this.userFinderUtil.findByCedula(searchUserDto.cedula);
    
    if (!user) {
      throw new NotFoundException(`No se encontró un usuario con la cédula: ${searchUserDto.cedula}`);
    }
    
    // Retornar solo los datos seguros 
    return {
      cedula: user.cedula,
      nombre: user.nombre,
      rol: user.rol,
      estado: user.estado
    };
  }
}