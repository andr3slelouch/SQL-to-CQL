// src/modules/permissions/controllers/manage-permissions.controller.ts
import { Controller, Post, Body, ValidationPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ManagePermissionsService } from '../services/manage-permissions.service';
import { SearchUserDto } from '../dto/search-user.dto';
import { UpdateUserPermissionDto } from '../dto/update-user-permissions.dto';
import { UserPermissionsResponse } from '../../../common/interfaces/permissions.interface';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/permissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ManagePermissionsController {
  constructor(private readonly managePermissionsService: ManagePermissionsService) {}

  @Post('get-user-permissions')
  @HttpCode(HttpStatus.OK)
  @Roles(true) // Solo admins pueden ver permisos
  getUserPermissions(
    @Body(ValidationPipe) searchUserDto: SearchUserDto
  ): Promise<UserPermissionsResponse> {
    return this.managePermissionsService.getUserPermissions(searchUserDto);
  }

  @Post('update-user-permission')
  @HttpCode(HttpStatus.OK)
  @Roles(true) // Solo admins pueden actualizar permisos
  updateUserPermission(
    @Body(ValidationPipe) updateUserPermissionDto: UpdateUserPermissionDto
  ): Promise<UserPermissionsResponse> {
    return this.managePermissionsService.updateUserPermission(updateUserPermissionDto);
  }
}