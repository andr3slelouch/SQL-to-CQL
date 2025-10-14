import { Module } from '@nestjs/common';
// Correct the import casing from 'cassandraProvider' to 'CassandraProvider'. This resolves the TS2724 error.
import { CassandraProvider } from './cassandra.provider';

@Module({
    providers: [CassandraProvider],
    exports: [CassandraProvider],
})
export class DatabaseModule {}