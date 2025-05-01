// src/sql-translator/translator-module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Importar SqlParserModule
import { SqlParserModule } from '../sql-parser/sql-parser.module';

// Servicios
import { TranslatorService } from './services/translator.service';
import { CassandraService } from './cassandra-connection/cassandra.service';
import { PermissionsApiService } from './services/permissions-api.service';
import { PermissionCacheService } from './services/permission-cache.service';
import { ResponseFormatterService } from './services/response-formatter.service'; // Importamos el nuevo servicio

// Controladores
import { TranslatorController } from '../controllers/translator.controller';

// Traductores
import { DatabaseTranslator } from './translators/database.translator';
import { TableTranslator } from './translators/table.translator';
import { IndexTranslator } from './translators/index.translator';
import { ViewTranslator } from './translators/view.translator';
import { SelectTranslator } from './translators/select.translator';
import { InsertTranslator } from './translators/insert.translator';
import { UpdateTranslator } from './translators/update.translator';
import { DeleteTranslator } from './translators/delete.translator';
import { OperatorsTranslator } from './translators/operators.translator';
import { ExecutionTranslator } from './translators/execution.translator';

// JWT
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    SqlParserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default_secret_change_this_in_production'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [
    TranslatorController  // El controlador que usa ResponseFormatterService
  ],
  providers: [
    JwtStrategy,
    TranslatorService,
    CassandraService,
    PermissionsApiService,
    PermissionCacheService,
    ResponseFormatterService, // Añadimos el nuevo servicio aquí
    DatabaseTranslator,
    TableTranslator,
    IndexTranslator,
    ViewTranslator,
    SelectTranslator,
    InsertTranslator,
    UpdateTranslator,
    DeleteTranslator,
    OperatorsTranslator,
    ExecutionTranslator,
  ],
  exports: [
    TranslatorService,
    CassandraService,
    PermissionsApiService,
    PermissionCacheService,
    ResponseFormatterService, // Lo exportamos también por si otro módulo lo necesita
    JwtModule,
    PassportModule
  ],
})
export class TranslatorModule {}