import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO para obtener las operaciones permitidas de un usuario
 */
export class GetOperationsDto {
  @IsString()
  @IsNotEmpty({ message: 'La cédula es requerida' })
  cedula: string;
}