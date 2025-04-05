// src/sql-translator/cassandra-connection/cassandra.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CassandraService } from './cassandra.service';

@Module({
  imports: [ConfigModule],
  providers: [CassandraService],
  exports: [CassandraService],
})
export class CassandraModule {}