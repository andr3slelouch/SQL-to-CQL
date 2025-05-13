// src/modules/permissions/dto/get-keyspace-tables.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class GetKeyspaceTablesDto {
  @IsNotEmpty({ message: 'El keyspace es requerido' })
  @IsString({ message: 'El keyspace debe ser una cadena de texto' })
  keyspace: string;
}