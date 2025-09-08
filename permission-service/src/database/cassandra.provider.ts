import { Provider } from '@nestjs/common';
import { Client, policies } from 'cassandra-driver';

export const CASSANDRA_CLIENT = 'CASSANDRA_CLIENT';

export const cassandraProvider: Provider = {
  provide: CASSANDRA_CLIENT,
  useFactory: async () => {
    const contactPoints = [process.env.DB_HOST || 'localhost'];
    const localDataCenter = process.env.DB_DATA_CENTER || 'datacenter1';
    const keyspace = process.env.DB_KEYSPACE || 'auth';
    const protocolOptions = {
      port: parseInt(process.env.DB_PORT || '9042', 10)
    };
    const credentials = {
      username: process.env.DB_USERNAME || 'cassandra',
      password: process.env.DB_PASSWORD || 'cassandra'
    };

    // Connect without keyspace to create it if it does not exist
    const tempClient = new Client({
      contactPoints,
      localDataCenter,
      protocolOptions,
      credentials,
    });

    try {
      await tempClient.connect();
      const query = `
        CREATE KEYSPACE IF NOT EXISTS ${keyspace}
        WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
      `;
      await tempClient.execute(query);
      await tempClient.shutdown();
    } catch (error) {
      console.error('❌ Error creating keyspace:', error);
      await tempClient.shutdown();
      throw error;
    }

    const client = new Client({
      contactPoints,
      localDataCenter,
      keyspace,
      protocolOptions,
      credentials,
      queryOptions: {
        consistency: 1, // LOCAL_ONE
        prepare: true
      },
      pooling: {
        coreConnectionsPerHost: {
          [0]: 2, // Local distance
          [1]: 1, // Remote distance
          [2]: 0  // Ignored distance
        }
      },
      socketOptions: {
        connectTimeout: 10000, // 10 segundos de timeout para la conexión
        readTimeout: 12000     // 12 segundos de timeout para las consultas
      },
      policies: {
        reconnection: new policies.reconnection.ExponentialReconnectionPolicy(1000, 10 * 60 * 1000, true)
      }
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