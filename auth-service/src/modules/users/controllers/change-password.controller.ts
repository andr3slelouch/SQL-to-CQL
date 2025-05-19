import { 
  Controller, 
  Post, 
  Body, 
  Get,          
  Param,        
  ValidationPipe, 
  HttpCode, 
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { ChangePasswordService } from '../services/change-password.service';
import { VerifyUserCredentialsDto, ChangePasswordDto, GenerateTempPinDto } from '../dto/change-password.dto';

@Controller('users')
export class ChangePasswordController {
  constructor(private readonly changePasswordService: ChangePasswordService) {}

  // ENDPOINT PARA BUSCAR POR CÉDULA
  @Get('find-by-cedula/:cedula')
  @HttpCode(HttpStatus.OK)
  async findUserByCedula(@Param('cedula') cedula: string): Promise<{ 
    nombre: string, 
    cedula: string, 
    rol: string 
  }> {
    return this.changePasswordService.findUserByCedula(cedula);
  }

  @Post('verify-credentials')
  @HttpCode(HttpStatus.OK)
  verifyCredentials(@Body(ValidationPipe) verifyUserCredentialsDto: VerifyUserCredentialsDto): Promise<{ valid: boolean, message: string }> {
    return this.changePasswordService.verifyUserCredentials(verifyUserCredentialsDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@Body(ValidationPipe) changePasswordDto: ChangePasswordDto): Promise<{ message: string, newPin?: string }> {
    return this.changePasswordService.changePassword(changePasswordDto);
  }

  // Endpoint solo para administradores
  @Post('admin/generate-temp-pin')
  @HttpCode(HttpStatus.OK)
  generateTemporaryPin(@Body(ValidationPipe) generateTempPinDto: GenerateTempPinDto): Promise<{ tempPin: string, expiresAt: Date }> {
    return this.changePasswordService.generateTemporaryPin(generateTempPinDto);
  }
}