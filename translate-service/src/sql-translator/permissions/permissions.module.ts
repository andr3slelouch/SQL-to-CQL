import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PermissionCacheService } from '../services/permission-cache.service';
import { SqlOperationGuard } from '../guards/sql-operation.guard';

@Module({
  imports: [
    HttpModule,
    ConfigModule
  ],
  providers: [
    PermissionCacheService,
    SqlOperationGuard
  ],
  exports: [
    PermissionCacheService,
    SqlOperationGuard
  ]
})
export class PermissionsModule {}