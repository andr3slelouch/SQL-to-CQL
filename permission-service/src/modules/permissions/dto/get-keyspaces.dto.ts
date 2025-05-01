// src/modules/permissions/dto/get-keyspaces.dto.ts
import { IsOptional, IsString } from 'class-validator';


/**
 * DTO para obtener los keyspaces disponibles o los keyspaces de un usuario específico
 */
export class GetKeyspacesDto {
 
  @IsOptional()
  @IsString({ message: 'La cédula debe ser una cadena de texto' })
  cedula?: string;
}