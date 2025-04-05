import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, types, auth } from 'cassandra-driver';

@Injectable()
export class CassandraService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CassandraService.name);
  private client: Client;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const contactPoint = this.configService.get<string>('CASSANDRA_CONTACT_POINT', 'localhost');
    const port = parseInt(this.configService.get<string>('CASSANDRA_PORT', '9042'), 10);
    const keyspace = this.configService.get<string>('CASSANDRA_KEYSPACE', 'sql_translator');
    // Usar credenciales predeterminadas para simplificar
    const username = 'cassandra';
    const password = 'cassandra';
    const datacenter = this.configService.get<string>('CASSANDRA_DATA_CENTER', 'datacenter1');

    this.logger.log(`Intentando conectar a Cassandra con usuario: ${username}`);

    // Crear auth provider con las credenciales predeterminadas
    const authProvider = new auth.PlainTextAuthProvider(username, password);

    try {
      // Primero conectar sin keyspace para crearlo si no existe
      const tempClient = new Client({
        contactPoints: [`${contactPoint}:${port}`],
        localDataCenter: datacenter,
        authProvider,
      });
      
      await tempClient.connect();
      this.logger.log('Conectado temporalmente a Cassandra para verificar keyspace');
      
      // Crear keyspace si no existe
      await this.createKeyspaceIfNotExists(tempClient, keyspace);
      
      await tempClient.shutdown();
      
      // Ahora conectar con el keyspace
      this.client = new Client({
        contactPoints: [`${contactPoint}:${port}`],
        localDataCenter: datacenter,
        keyspace,
        authProvider,
        queryOptions: {
          consistency: types.consistencies.quorum
        }
      });
      
      await this.client.connect();
      this.logger.log(`Conectado a Cassandra con keyspace: ${keyspace}`);
    } catch (error) {
      this.logger.error(`Error al conectar con Cassandra: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.shutdown();
      this.logger.log('Desconectado de Cassandra');
    }
  }

  async createKeyspaceIfNotExists(client: Client, keyspaceName: string) {
    const query = `
      CREATE KEYSPACE IF NOT EXISTS ${keyspaceName}
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `;
    
    try {
      await client.execute(query);
      this.logger.log(`Keyspace ${keyspaceName} creado o ya existe`);
    } catch (error) {
      this.logger.error(`Error al crear keyspace: ${error.message}`);
      throw error;
    }
  }

  async execute(query: string, params: any[] = []): Promise<types.ResultSet> {
    try {
      return await this.client.execute(query, params, { prepare: true });
    } catch (error) {
      this.logger.error(`Error ejecutando query en Cassandra: ${error.message}`);
      throw error;
    }
  }
}