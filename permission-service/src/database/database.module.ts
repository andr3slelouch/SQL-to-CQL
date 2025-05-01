import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { cassandraProvider } from './cassandra.provider';

@Module({
  imports: [ConfigModule],
  providers: [cassandraProvider],
  exports: [cassandraProvider],
})
export class DatabaseModule {}