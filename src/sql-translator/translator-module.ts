// src/sql-translator/translator-module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SqlParserModule } from '../sql-parser/sql-parser.module';
import { TranslatorService } from './services/translator.service';
import { ValidationService } from './services/validation.service';
import { CassandraModule } from './cassandra-connection/cassandra.module';

// Importar todos los traductores
import { DatabaseTranslator } from './translators/database.translator';
import { TableTranslator } from './translators/table.translator';
import { SelectTranslator } from './translators/select.translator';
import { InsertTranslator } from './translators/insert.translator';
import { UpdateTranslator } from './translators/update.translator';
import { DeleteTranslator } from './translators/delete.translator';
import { IndexTranslator } from './translators/index.translator';
import { ViewTranslator } from './translators/view.translator';
import { OperatorsTranslator } from './translators/operators.translator';
import { ExecutionTranslator } from './translators/execution.translator';

@Module({
  imports: [
    SqlParserModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CassandraModule
  ],
  providers: [
    TranslatorService,
    ValidationService,
    DatabaseTranslator,
    TableTranslator,
    SelectTranslator,
    InsertTranslator,
    UpdateTranslator,
    DeleteTranslator,
    IndexTranslator,
    ViewTranslator,
    OperatorsTranslator,
    ExecutionTranslator
  ],
  exports: [TranslatorService, ValidationService]
})
export class TranslatorModule {}