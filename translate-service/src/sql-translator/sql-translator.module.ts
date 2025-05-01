import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from './auth/auth.module';
import { SqlParserModule } from '../sql-parser/sql-parser.module';
import { TranslatorService } from './services/translator.service';
import { TranslatorController } from '../controllers/translator.controller';
import { ExecutionTranslator } from './translators/execution.translator';
import { DatabaseTranslator } from './translators/database.translator';
import { DeleteTranslator } from './translators/delete.translator';
import { IndexTranslator } from './translators/index.translator';
import { InsertTranslator } from './translators/insert.translator';
import { OperatorsTranslator } from './translators/operators.translator';
import { SelectTranslator } from './translators/select.translator';
import { TableTranslator } from './translators/table.translator';
import { UpdateTranslator } from './translators/update.translator';
import { ViewTranslator } from './translators/view.translator';
import { PermissionsModule } from './permissions/permissions.module'; 
import { ResponseFormatterService } from './services/response-formatter.service'; // Importar el nuevo servicio

@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule,
    AuthModule,
    SqlParserModule,
    PermissionsModule
  ],
  controllers: [TranslatorController],
  providers: [ 
    TranslatorService,
    ExecutionTranslator,
    DatabaseTranslator,
    DeleteTranslator,
    IndexTranslator,
    InsertTranslator,
    OperatorsTranslator,
    SelectTranslator,
    TableTranslator,
    UpdateTranslator,
    ViewTranslator,
    ResponseFormatterService // Añadir el nuevo servicio aquí
  ],
  exports: [
    TranslatorService,
    ResponseFormatterService // Exportarlo si otros módulos lo necesitan
  ]
})
export class SqlTranslatorModule {}