import { Module } from '@nestjs/common';
import { CreateUserService } from './services/create-user.service';
import { CreateUserController } from './controllers/create-user.controller';
import { DeleteUserService } from './services/delete-user.service';
import { DeleteUserController } from './controllers/delete-user.controller';
import { SearchUserController } from './controllers/search-user.controller';
import { ChangePasswordService } from './services/change-password.service';
import { ChangePasswordController } from './controllers/change-password.controller';
import { UserFinderUtil } from '../../common/utils/user-finder.util';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    CreateUserController, 
    DeleteUserController, 
    SearchUserController,
    ChangePasswordController
  ],
  providers: [
    CreateUserService, 
    DeleteUserService, 
    ChangePasswordService,
    UserFinderUtil
  ],
  exports: [
    CreateUserService, 
    DeleteUserService, 
    ChangePasswordService,
    UserFinderUtil
  ],
})
export class UserModule {}