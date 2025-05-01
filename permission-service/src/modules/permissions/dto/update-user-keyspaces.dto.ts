// src/modules/permissions/dto/update-user-keyspaces.dto.ts
import { IsArray, IsNotEmpty, IsString } from 'class-validator';


/**
 * DTO para actualizar los keyspaces a los que un usuario tiene acceso
 */
export class UpdateUserKeyspacesDto {
  
  @IsNotEmpty({ message: 'La cédula es requerida' })
  @IsString({ message: 'La cédula debe ser una cadena de texto' })
  cedula: string;

  @IsNotEmpty({ message: 'La lista de keyspaces es requerida' })
  @IsArray({ message: 'Keyspaces debe ser un array de strings' })
  keyspaces: string[];
}