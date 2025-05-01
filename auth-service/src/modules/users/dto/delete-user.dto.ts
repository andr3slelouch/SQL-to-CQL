import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class DeleteUserDto {
  @IsNotEmpty({ message: 'La cédula es requerida' })
  @IsString({ message: 'La cédula debe ser una cadena de texto' })
  cedula: string;
}

export class DeactivateUserDto {
  @IsNotEmpty({ message: 'La cédula es requerida' })
  @IsString({ message: 'La cédula debe ser una cadena de texto' })
  cedula: string;
  
  @IsNotEmpty({ message: 'El estado es requerido' })
  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  estado: boolean;
}