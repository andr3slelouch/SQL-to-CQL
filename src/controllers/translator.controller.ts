import { Controller, Post, Body } from '@nestjs/common';
import { TranslatorService } from '../sql-translator/services/translator.service';

@Controller('translator')
export class TranslatorController {
  constructor(private readonly translatorService: TranslatorService) {}

  @Post('translate')
  translateSQL(@Body() body: { sql: string }) {
    return this.translatorService.translateSQL(body.sql);
  }

  @Post('execute')
  async executeSQL(@Body() body: { sql: string }) {
    return this.translatorService.translateAndExecute(body.sql, {
      executeInCassandra: true
    });
  }
}