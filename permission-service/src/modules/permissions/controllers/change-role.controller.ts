import { Controller, Post, Body, ValidationPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChangeRoleService } from '../services/change-role.service';
import { SearchUserDto } from '../dto/search-user.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { UserResponse } from '../../../common/interfaces/user.interface';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/permissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ChangeRoleController {
  constructor(private readonly changeRoleService: ChangeRoleService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @Roles(true) // Solo admins (rol = true) pueden acceder
  findUser(@Body(ValidationPipe) searchUserDto: SearchUserDto): Promise<UserResponse> {
    return this.changeRoleService.findUser(searchUserDto);
  }

  @Post('change-role')
  @HttpCode(HttpStatus.OK)
  @Roles(true) // Solo admins (rol = true) pueden acceder
  updateRole(@Body(ValidationPipe) updateRoleDto: UpdateRoleDto): Promise<UserResponse> {
    return this.changeRoleService.updateRole(updateRoleDto);
  }
}