import { Module } from '@nestjs/common';
import { ManagePermissionsController } from './controllers/manage-permissions.controller';
import { KeyspacesController } from './controllers/keyspaces.controller';
import { OperationsController } from './controllers/operations.controller';
import { ManagePermissionsService } from './services/manage-permissions.service';
import { KeyspacesService } from './services/keyspaces.service';
import { DatabaseModule } from '../../database/database.module';
import { UserFinderUtil } from '../../common/utils/user-finder.util';

@Module({
  imports: [DatabaseModule],
  controllers: [
    ManagePermissionsController,
    KeyspacesController,
    OperationsController // Agregar el nuevo controlador
  ],
  providers: [
    ManagePermissionsService,
    KeyspacesService,
    UserFinderUtil
  ],
  exports: [
    ManagePermissionsService,
    KeyspacesService
  ]
})
export class PermissionsModule {}