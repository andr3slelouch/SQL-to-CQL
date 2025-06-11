// src/modules/permissions/dto/delete-keyspace.dto.ts
import { IsNotEmpty, IsString, IsBoolean } from 'class-validator';

/**
 * DTO para eliminar un keyspace
 */
export class DeleteKeyspaceDto {
  @IsNotEmpty({ message: 'El nombre del keyspace es requerido' })
  @IsString({ message: 'El nombre del keyspace debe ser una cadena de texto' })
  keyspaceName: string;

  @IsNotEmpty({ message: 'Debe confirmar la eliminación' })
  @IsBoolean({ message: 'La confirmación debe ser un valor booleano' })
  confirmDeletion: boolean;
}

/**
 * DTO para buscar un keyspace
 */
export class SearchKeyspaceDto {
  @IsNotEmpty({ message: 'El nombre del keyspace es requerido' })
  @IsString({ message: 'El nombre del keyspace debe ser una cadena de texto' })
  keyspaceName: string;
}