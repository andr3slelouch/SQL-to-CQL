import { Provider, Logger } from '@nestjs/common';
import { Client, auth } from 'cassandra-driver';
import { ConfigService } from '@nestjs/config';
export const CASSANDRA_CLIENT = 'CASSANDRA_CLIENT';

/**
 * Sets up the required database tables for the auth-service.
 * This function is now only responsible for creating the table structures.
 * User seeding is handled by the UserSeederService.
 * @param client - The connected Cassandra client instance.
 * @param logger - The logger instance for logging messages.
 */
const setupTables = async (client: Client, logger: Logger) => {
    try {
        // 1. Create the 'users' table
        await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        cedula text PRIMARY KEY,
        nombre text,
        contrasena text,
        pin text,
        rol boolean,
        estado boolean
      )
    `);
        logger.log("Schema setup: Ensured 'users' table exists.");

        // 2. Create the 'permissions' table
        await client.execute(`
      CREATE TABLE IF NOT EXISTS permissions (
        cedula text PRIMARY KEY,
        operaciones set<text>,
        keyspaces set<text>
      )
    `);
        logger.log("Schema setup: Ensured 'permissions' table exists.");

    } catch (error) {
        logger.error('An error occurred during table setup.', error.stack);
        throw error;
    }
};

export const CassandraProvider: Provider = {
    provide: CASSANDRA_CLIENT,
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
        const logger = new Logger('Auth-Service');
        const host = configService.get<string>('CASSANDRA_HOST');
        const port = configService.get<number>('CASSANDRA_PORT');
        const user = configService.get<string>('CASSANDRA_USER');
        const password = configService.get<string>('CASSANDRA_PASSWORD');
        const keyspace = configService.get<string>('CASSANDRA_KEYSPACE');
        const datacenter = 'datacenter1'; // As defined in your docker-compose files

        if (!user || !password) {
            throw new Error('Cassandra username or password is not defined in environment variables.');
        }

        logger.log(`Attempting to connect to Cassandra at ${host}:${port}`);

        const tempClient = new Client({
            contactPoints: [`${host}:${port}`],
            localDataCenter: datacenter,
            authProvider: new auth.PlainTextAuthProvider(user, password),
        });

        try {
            await tempClient.connect();
            logger.log('Temporarily connected to Cassandra to verify keyspace.');
            await tempClient.execute(`
        CREATE KEYSPACE IF NOT EXISTS ${keyspace}
        WITH REPLICATION = { 'class': 'SimpleStrategy', 'replication_factor': 1 }
      `);
            logger.log(`Keyspace "${keyspace}" has been created or already exists.`);
            await tempClient.shutdown();
        } catch (error) {
            logger.error('Failed to create or verify keyspace.', error.stack);
            await tempClient.shutdown();
            throw error;
        }

        const mainClient = new Client({
            contactPoints: [`${host}:${port}`],
            localDataCenter: datacenter,
            keyspace: keyspace,
            authProvider: new auth.PlainTextAuthProvider(user, password),
        });

        try {
            await mainClient.connect();
            logger.log(`Successfully connected to Cassandra and set keyspace to "${keyspace}"`);

            // Run the table setup logic
            await setupTables(mainClient, logger);

            return mainClient;
        } catch (error) {
            logger.error('Failed to connect to Cassandra or set up tables.', error.stack);
            await mainClient.shutdown();
            throw error;
        }
    },
};

