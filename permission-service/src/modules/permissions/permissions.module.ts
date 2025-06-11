// src/modules/permissions/permissions.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { ManagePermissionsController } from './controllers/manage-permissions.controller';
import { KeyspacesController } from './controllers/keyspaces.controller';
import { OperationsController } from './controllers/operations.controller';
import { ChangeRoleController } from './controllers/change-role.controller'; 

// Services
import { ManagePermissionsService } from './services/manage-permissions.service';
import { KeyspacesService } from './services/keyspaces.service';
import { ChangeRoleService } from './services/change-role.service'; 
import { DeleteKeyspaceService } from './services/delete-keyspace.service'; // Nuevo servicio

// Database and Utils
import { DatabaseModule } from '../../database/database.module';
import { UserFinderUtil } from '../../common/utils/user-finder.util';

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
    ChangeRoleController  
  ],
  providers: [
    ManagePermissionsService,
    KeyspacesService,
    ChangeRoleService,
    DeleteKeyspaceService,  // Agregado el nuevo servicio
    UserFinderUtil
  ],
  exports: [
    ManagePermissionsService,
    KeyspacesService,
    ChangeRoleService,
    DeleteKeyspaceService   // Exportado para uso en otros módulos si es necesario
  ]
})
export class PermissionsModule {}