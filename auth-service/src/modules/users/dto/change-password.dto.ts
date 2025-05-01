import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class VerifyUserCredentialsDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  nombre: string;

  @IsNotEmpty({ message: 'La cédula es requerida' })
  @IsString({ message: 'La cédula debe ser una cadena de texto' })
  cedula: string;

  @IsNotEmpty({ message: 'El PIN es requerido' })
  @IsString({ message: 'El PIN debe ser una cadena de texto' })
  pin: string;
}

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  nombre: string;

  @IsNotEmpty({ message: 'La cédula es requerida' })
  @IsString({ message: 'La cédula debe ser una cadena de texto' })
  cedula: string;

  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @IsString({ message: 'La nueva contraseña debe ser una cadena de texto' })
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  nuevaContrasena: string;

  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  @IsString({ message: 'La confirmación de contraseña debe ser una cadena de texto' })
  confirmarContrasena: string;

  @IsNotEmpty({ message: 'El PIN es requerido' })
  @IsString({ message: 'El PIN debe ser una cadena de texto' })
  pin: string;
}

export class GenerateTempPinDto {
  @IsNotEmpty({ message: 'La cédula es requerida' })
  @IsString({ message: 'La cédula debe ser una cadena de texto' })
  cedula: string;
}