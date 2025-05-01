import { Controller, Post, Body, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { CreateUserService } from '../services/create-user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserCreateResponse } from '../../../common/interfaces/user.interface';

@Controller('users')
export class CreateUserController {
  constructor(private readonly createUserService: CreateUserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body(ValidationPipe) createUserDto: CreateUserDto): Promise<UserCreateResponse> {
    return this.createUserService.create(createUserDto);
  }
}