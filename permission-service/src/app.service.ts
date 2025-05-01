import { Injectable, Inject, Logger } from '@nestjs/common';
import { Client } from 'cassandra-driver';
import { CASSANDRA_CLIENT } from './database/cassandra.provider';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @Inject(CASSANDRA_CLIENT)
    private cassandraClient: Client,
  ) {}

  getHello(): string {
    return 'Permission Service is running!';
  }

  async testDatabaseConnection(): Promise<string> {
    try {
      // Intentar una consulta simple para verificar la conexión
      const query = 'SELECT keyspace_name FROM system_schema.keyspaces';
      const result = await this.cassandraClient.execute(query);
      
      return `Conexión a Cassandra exitosa. Keyspaces disponibles: ${result.rows.map(row => row.keyspace_name).join(', ')}`;
    } catch (error) {
      this.logger.error(`Error al probar la conexión a Cassandra: ${error.message}`, error.stack);
      throw error;
    }
  }
}