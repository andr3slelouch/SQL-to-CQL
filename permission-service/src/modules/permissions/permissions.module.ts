import { Module } from '@nestjs/common';
import { ManagePermissionsController } from './controllers/manage-permissions.controller';
import { KeyspacesController } from './controllers/keyspaces.controller';
import { OperationsController } from './controllers/operations.controller';
import { ChangeRoleController } from './controllers/change-role.controller'; // AGREGAR
import { ManagePermissionsService } from './services/manage-permissions.service';
import { KeyspacesService } from './services/keyspaces.service';
import { ChangeRoleService } from './services/change-role.service'; // AGREGAR
import { DatabaseModule } from '../../database/database.module';
import { UserFinderUtil } from '../../common/utils/user-finder.util';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DatabaseModule,
    HttpModule,
    ConfigModule
  ],
  controllers: [
    ManagePermissionsController,
    KeyspacesController,
    OperationsController,
    ChangeRoleController  // AGREGAR
  ],
  providers: [
    ManagePermissionsService,
    KeyspacesService,
    ChangeRoleService,  // AGREGAR
    UserFinderUtil
  ],
  exports: [
    ManagePermissionsService,
    KeyspacesService,
    ChangeRoleService  // AGREGAR (opcional)
  ]
})
export class PermissionsModule {}