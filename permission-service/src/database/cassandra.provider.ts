import { Provider } from '@nestjs/common';
import { Client, auth } from 'cassandra-driver';
import { ConfigService } from '@nestjs/config';
export const CASSANDRA_CLIENT = 'CASSANDRA_CLIENT';

export const cassandraProvider: Provider = {
    provide: CASSANDRA_CLIENT,
    inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
      // Read connection details from environment variables
      const host = configService.get<string>('CASSANDRA_HOST');
      const port = configService.get<number>('CASSANDRA_PORT');
      const user = configService.get<string>('CASSANDRA_USER');
      const password = configService.get<string>('CASSANDRA_PASSWORD');
      const keyspace = configService.get<string>('CASSANDRA_KEYSPACE');
      const datacenter = configService.get<string>('CASSANDRA_LOCAL_DATACENTER');

      // Fail fast if essential variables are missing
      if (!host || !port || !user || !password || !keyspace || !datacenter) {
          throw new Error('Missing critical Cassandra environment variables.');
      }

      const authProvider = new auth.PlainTextAuthProvider(user, password);

      // Initial client to create keyspace if it doesn't exist
      const initialClient = new Client({
          contactPoints: [`${host}:${port}`],
          localDataCenter: datacenter,
          authProvider: authProvider,
      });

      try {
          await initialClient.connect();
          await initialClient.execute(`
        CREATE KEYSPACE IF NOT EXISTS ${keyspace}
        WITH REPLICATION = { 'class': 'SimpleStrategy', 'replication_factor': 1 };
      `);
          await initialClient.shutdown();
      } catch (error) {
          console.error('❌ Error creating keyspace:', error);
          await initialClient.shutdown();
          throw error;
      }

      // Main client connected to the correct keyspace
      const client = new Client({
          contactPoints: [`${host}:${port}`],
          localDataCenter: datacenter,
          keyspace: keyspace,
          authProvider: authProvider,
      });

      try {
      await client.connect();
      console.log(`✅ Conectado a la base de datos Cassandra (keyspace: ${keyspace})`);
      return client;
    } catch (error) {
      console.error('❌ Error al conectar a Cassandra:', error);
      throw error;
    }
  },
};