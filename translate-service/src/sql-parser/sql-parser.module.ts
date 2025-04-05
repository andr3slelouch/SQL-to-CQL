import { Module } from '@nestjs/common';
import { SqlParserService } from './sql-parser.service';
import { DataTypeService } from './services/data-type.service';

@Module({
  providers: [SqlParserService, DataTypeService],
  exports: [SqlParserService, DataTypeService]
})
export class SqlParserModule {}