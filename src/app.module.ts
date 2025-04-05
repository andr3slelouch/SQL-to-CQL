// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SqlParserModule } from './sql-parser/sql-parser.module';
import { TranslatorModule } from './sql-translator/translator-module';
import { TranslatorController } from './controllers/translator.controller';

@Module({
  imports: [SqlParserModule, TranslatorModule],
  controllers: [AppController, TranslatorController],
  providers: [AppService],
})
export class AppModule {}