// src/modules/permissions/dto/keyspace-update.dto.ts
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export class KeyspaceUpdateDto {
  @IsNotEmpty({ message: 'La cédula es requerida' })
  @IsString({ message: 'La cédula debe ser una cadena de texto' })
  cedula: string;

  @IsNotEmpty({ message: 'El keyspace es requerido' })
  @IsString({ message: 'El keyspace debe ser una cadena de texto' })
  keyspace: string;

  @IsNotEmpty({ message: 'La acción es requerida' })
  @IsEnum(['add', 'remove'], { message: 'La acción debe ser "add" o "remove"' })
  action: 'add' | 'remove';
}