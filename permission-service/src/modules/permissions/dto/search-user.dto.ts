import { IsNotEmpty, IsString } from 'class-validator';

export class SearchUserDto {
  @IsNotEmpty({ message: 'La cédula es requerida' })
  @IsString({ message: 'La cédula debe ser una cadena de texto' })
  cedula: string;
}