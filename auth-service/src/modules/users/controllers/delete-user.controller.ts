import { 
    Controller, 
    Post,
    Delete, 
    Body, 
    ValidationPipe, 
    HttpCode, 
    HttpStatus
  } from '@nestjs/common';
  import { DeleteUserService } from '../services/delete-user.service';
  import { DeleteUserDto, DeactivateUserDto } from '../dto/delete-user.dto';
  import { UserManageResponse } from '../../../common/interfaces/user.interface';
  
  @Controller('admin/users')
  export class DeleteUserController {
    constructor(private readonly deleteUserService: DeleteUserService) {}
  
    @Delete()
    @HttpCode(HttpStatus.OK)
    deleteUser(@Body(ValidationPipe) deleteUserDto: DeleteUserDto): Promise<{ message: string }> {
      return this.deleteUserService.deleteUser(deleteUserDto);
    }
  
    @Post('deactivate')
    @HttpCode(HttpStatus.OK)
    deactivateUser(@Body(ValidationPipe) deactivateUserDto: DeactivateUserDto): Promise<UserManageResponse> {
      return this.deleteUserService.deactivateUser(deactivateUserDto);
    }
  }