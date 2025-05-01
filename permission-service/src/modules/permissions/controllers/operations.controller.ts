import { Controller, Get, Query, UseGuards, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ManagePermissionsService } from '../services/manage-permissions.service';
import { GetOperationsDto } from '../dto/get-operations.dto';

/**
 * Controlador para obtener operaciones SQL permitidas para usuarios
 * Este endpoint será utilizado por el microservicio de traducción SQL
 */
@Controller('admin/permissions/operations')
@UseGuards(AuthGuard('jwt'))
export class OperationsController {
  constructor(private readonly managePermissionsService: ManagePermissionsService) {}

  /**
   * Obtiene las operaciones SQL permitidas para un usuario
   * @param getOperationsDto DTO con la cédula del usuario
   * @returns Lista de operaciones permitidas
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getUserOperations(
    @Query(ValidationPipe) getOperationsDto: GetOperationsDto
  ): Promise<{ operations: string[] }> {
    // Obtener los permisos completos del usuario
    const userPermissions = await this.managePermissionsService.getUserPermissions(getOperationsDto);
    
    // Devolver solo las operaciones permitidas en un formato simplificado
    return {
      operations: userPermissions.operaciones
    };
  }
}