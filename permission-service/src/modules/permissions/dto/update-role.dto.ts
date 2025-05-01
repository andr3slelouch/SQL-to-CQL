import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class UpdateRoleDto {
  @IsNotEmpty({ message: 'La cédula es requerida' })
  @IsString({ message: 'La cédula debe ser una cadena de texto' })
  cedula: string;

  @IsNotEmpty({ message: 'El rol es requerido' })
  @IsBoolean({ message: 'El rol debe ser un valor booleano' })
  rol: boolean;
}