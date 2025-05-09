import { Module } from '@nestjs/common';
import { ManagePermissionsController } from './controllers/manage-permissions.controller';
import { KeyspacesController } from './controllers/keyspaces.controller';
import { OperationsController } from './controllers/operations.controller';
import { ManagePermissionsService } from './services/manage-permissions.service';
import { KeyspacesService } from './services/keyspaces.service';
import { DatabaseModule } from '../../database/database.module';
import { UserFinderUtil } from '../../common/utils/user-finder.util';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DatabaseModule,
    HttpModule,                // Añadimos el HttpModule para las peticiones HTTP
    ConfigModule              // Añadimos el ConfigModule para leer las variables de entorno
  ],
  controllers: [
    ManagePermissionsController,
    KeyspacesController,
    OperationsController
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