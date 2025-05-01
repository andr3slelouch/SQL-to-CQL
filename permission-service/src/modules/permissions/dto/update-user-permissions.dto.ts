// src/modules/permissions/dto/update-user-permissions.dto.ts
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';


export class UpdateUserPermissionDto {

  @IsNotEmpty({ message: 'La cédula es requerida' })
  @IsString({ message: 'La cédula debe ser una cadena de texto' })
  cedula: string;

 
  @IsOptional()
  @IsString({ message: 'La operación debe ser una cadena de texto' })
  @ValidateIf(o => !o.operations)
  operation?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  @ValidateIf(o => !o.operations)
  enabled?: boolean;

  @IsOptional()
  @IsArray({ message: 'Las operaciones deben ser un array' })
  @ValidateIf(o => !o.operation)
  operations?: {
    name: string;
    enabled: boolean;
  }[];
}