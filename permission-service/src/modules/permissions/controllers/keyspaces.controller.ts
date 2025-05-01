// src/modules/permissions/controllers/keyspaces.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { KeyspacesService } from '../services/keyspaces.service';
import { GetKeyspacesDto } from '../dto/get-keyspaces.dto';
import { UpdateUserKeyspacesDto } from '../dto/update-user-keyspaces.dto';
import { KeyspaceUpdateDto } from '../dto/keyspace-update.dto';
import { UserPermissionsResponse } from '../../../common/interfaces/permissions.interface';
import { KeyspacesResponse } from '../services/keyspaces.service';

@Controller('admin/keyspaces')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class KeyspacesController {
  constructor(private readonly keyspacesService: KeyspacesService) {}

  @Get()
  getKeyspaces(@Query() getKeyspacesDto: GetKeyspacesDto): Promise<KeyspacesResponse> {
    return this.keyspacesService.getKeyspaces(getKeyspacesDto);
  }

  @Get('user')
  getUserKeyspaces(@Query('cedula') cedula: string): Promise<UserPermissionsResponse> {
    return this.keyspacesService.getUserKeyspaces(cedula);
  }

  @Post('update-user-keyspaces')
  @Roles(true) // solo admins
  updateUserKeyspaces(@Body() updateUserKeyspacesDto: UpdateUserKeyspacesDto): Promise<UserPermissionsResponse> {
    return this.keyspacesService.updateUserKeyspaces(updateUserKeyspacesDto);
  }

  @Post('update-single-keyspace')
  updateSingleKeyspace(@Body() keyspaceUpdateDto: KeyspaceUpdateDto): Promise<UserPermissionsResponse> {
    return this.keyspacesService.updateSingleKeyspace(keyspaceUpdateDto);
  }
}