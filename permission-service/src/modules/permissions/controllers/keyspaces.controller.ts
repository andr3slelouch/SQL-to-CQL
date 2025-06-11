// src/modules/permissions/controllers/keyspaces.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Body, 
  Query, 
  UseGuards, 
  Param, 
  BadRequestException, 
  HttpCode, 
  HttpStatus, 
  ValidationPipe,
  Request
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { KeyspacesService } from '../services/keyspaces.service';
import { DeleteKeyspaceService, DeleteKeyspaceResponse } from '../services/delete-keyspace.service';
import { GetKeyspacesDto } from '../dto/get-keyspaces.dto';
import { UpdateUserKeyspacesDto } from '../dto/update-user-keyspaces.dto';
import { KeyspaceUpdateDto } from '../dto/keyspace-update.dto';
import { DeleteKeyspaceDto, SearchKeyspaceDto } from '../dto/delete-keyspace.dto';
import { UserPermissionsResponse } from '../../../common/interfaces/permissions.interface';
import { KeyspacesResponse } from '../services/keyspaces.service';

@Controller('admin/keyspaces')
@UseGuards(AuthGuard('jwt'))  // SOLO JWT, sin RolesGuard para permitir endpoints específicos
export class KeyspacesController {
  constructor(
    private readonly keyspacesService: KeyspacesService,
    private readonly deleteKeyspaceService: DeleteKeyspaceService
  ) {}

  /**
   * Obtiene todos los keyspaces disponibles o los keyspaces de un usuario específico
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(true)  // Solo admins
  getKeyspaces(@Query() getKeyspacesDto: GetKeyspacesDto): Promise<KeyspacesResponse> {
    return this.keyspacesService.getKeyspaces(getKeyspacesDto);
  }

  /**
   * Obtiene los keyspaces de un usuario específico
   */
  @Get('user')
  getUserKeyspaces(@Query('cedula') cedula: string): Promise<UserPermissionsResponse> {
    return this.keyspacesService.getUserKeyspaces(cedula);
  }

  /**
   * Actualiza todos los keyspaces a los que tiene acceso un usuario
   */
  @Post('update-user-keyspaces')
  @UseGuards(RolesGuard)
  @Roles(true) // solo admins
  updateUserKeyspaces(
    @Body(ValidationPipe) updateUserKeyspacesDto: UpdateUserKeyspacesDto
  ): Promise<UserPermissionsResponse> {
    return this.keyspacesService.updateUserKeyspaces(updateUserKeyspacesDto);
  }

  /**
   * Actualiza un keyspace específico del usuario (añadir o eliminar)
   * PERMITE AUTO-ASIGNACIÓN: Usuarios regulares pueden asignarse keyspaces que crean
   */
  @Post('update-single-keyspace')
  // SIN @UseGuards(RolesGuard) ni @Roles(true) para permitir auto-asignación
  updateSingleKeyspace(
    @Body(ValidationPipe) keyspaceUpdateDto: KeyspaceUpdateDto,
    @Request() req: any
  ): Promise<UserPermissionsResponse> {
    // Pasar información del usuario actual para validación interna
    return this.keyspacesService.updateSingleKeyspace(keyspaceUpdateDto, req.user);
  }

  /**
   * Obtiene las tablas de un keyspace específico
   */
  @Get('tables')
  async getKeyspaceTables(@Query('keyspace') keyspace: string): Promise<{ tables: string[] }> {
    if (!keyspace) {
      throw new BadRequestException('El keyspace es requerido');
    }
    return this.keyspacesService.getKeyspaceTables(keyspace);
  }

  // ===== NUEVOS ENDPOINTS PARA ELIMINAR KEYSPACES =====

  /**
   * Busca un keyspace por nombre para verificar que existe y obtener información básica
   * Incluye información sobre tablas y usuarios que tienen acceso
   */
  @Get('search')
  @UseGuards(RolesGuard)
  @Roles(true) // Solo administradores
  async searchKeyspace(
    @Query(ValidationPipe) searchKeyspaceDto: SearchKeyspaceDto
  ): Promise<{
    exists: boolean;
    keyspace?: string;
    tables?: string[];
    usersWithAccess?: Array<{ cedula: string; nombre: string; rol: boolean }>;
  }> {
    const keyspaceInfo = await this.deleteKeyspaceService.searchKeyspace(
      searchKeyspaceDto.keyspaceName
    );
    
    if (keyspaceInfo.exists) {
      // Si el keyspace existe, también obtenemos los usuarios que tienen acceso
      const usersWithAccess = await this.deleteKeyspaceService.getUsersWithKeyspaceAccess(
        searchKeyspaceDto.keyspaceName
      );
      
      return {
        ...keyspaceInfo,
        usersWithAccess
      };
    }
    
    return keyspaceInfo;
  }

  /**
   * Obtiene todos los usuarios que tienen acceso a un keyspace específico
   */
  @Get(':keyspaceName/users')
  @UseGuards(RolesGuard)
  @Roles(true) // Solo administradores
  async getUsersWithKeyspaceAccess(@Param('keyspaceName') keyspaceName: string): Promise<{
    keyspace: string;
    users: Array<{ cedula: string; nombre: string; rol: boolean }>;
  }> {
    if (!keyspaceName) {
      throw new BadRequestException('El nombre del keyspace es requerido');
    }

    const users = await this.deleteKeyspaceService.getUsersWithKeyspaceAccess(keyspaceName);
    
    return {
      keyspace: keyspaceName,
      users
    };
  }

  /**
   * Elimina un keyspace y todos los permisos asociados
   * IMPORTANTE: Esta operación es irreversible y requiere confirmación explícita
   */
  @Delete()
  @UseGuards(RolesGuard)
  @Roles(true) // Solo administradores
  @HttpCode(HttpStatus.OK)
  async deleteKeyspace(
    @Body(ValidationPipe) deleteKeyspaceDto: DeleteKeyspaceDto
  ): Promise<DeleteKeyspaceResponse> {
    return this.deleteKeyspaceService.deleteKeyspace(deleteKeyspaceDto);
  }

  // ===== ENDPOINTS PARA MANEJO DE CACHÉ =====

  /**
   * Invalida todo el caché de tablas
   */
  @Delete('cache/tables')
  @UseGuards(RolesGuard)
  @Roles(true) // Solo administradores
  async invalidateAllTablesCache(): Promise<{ message: string }> {
    this.keyspacesService.invalidateTablesCache();
    return { message: 'Todo el caché de tablas ha sido invalidado' };
  }

  /**
   * Invalida el caché de tablas para un keyspace específico
   */
  @Delete('cache/tables/:keyspace')
  @UseGuards(RolesGuard)
  @Roles(true) // Solo administradores
  async invalidateKeyspaceTablesCache(@Param('keyspace') keyspace: string): Promise<{ message: string }> {
    this.keyspacesService.invalidateTablesCache(keyspace);
    return { message: `Caché invalidado para keyspace ${keyspace}` };
  }
}