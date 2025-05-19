// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SqlParserModule } from './sql-parser/sql-parser.module';
import { TranslatorModule } from './sql-translator/translator-module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    SqlParserModule,
    TranslatorModule
  ]
   
})
export class AppModule {}