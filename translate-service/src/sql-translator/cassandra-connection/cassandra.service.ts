import { Injectable, OnModuleInit, OnModuleDestroy, Logger, InternalServerErrorException } from '@nestjs/common';
import { Client, auth, types } from 'cassandra-driver';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CassandraService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CassandraService.name);
    private client: Client;

    constructor(private configService: ConfigService) {}

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    /**
     * Establishes a resilient connection to Cassandra by first ensuring the keyspace exists.
     */
    private async connect() {
        const host = this.configService.get<string>('CASSANDRA_HOST');
        const port = this.configService.get<number>('CASSANDRA_PORT');
        const user = this.configService.get<string>('CASSANDRA_USER');
        const password = this.configService.get<string>('CASSANDRA_PASSWORD');
        const keyspace = this.configService.get<string>('CASSANDRA_KEYSPACE');
        const datacenter = this.configService.get<string>('CASSANDRA_DATA_CENTER', 'datacenter1');

        if (!host || !port || !user || !password || !keyspace) {
            this.logger.error('Missing one or more required Cassandra environment variables (HOST, PORT, USER, PASSWORD, KEYSPACE)');
            throw new InternalServerErrorException('Cassandra configuration is incomplete.');
        }

        this.logger.log(`Attempting to connect to Cassandra at ${host}:${port} with user: ${user}`);

        const authProvider = new auth.PlainTextAuthProvider(user, password);

        // Step 1: Connect without a keyspace to create it if it doesn't exist
        const tempClient = new Client({
            contactPoints: [host],
            protocolOptions: { port },
            localDataCenter: datacenter,
            authProvider,
        });

        try {
            await tempClient.connect();
            this.logger.log('Temporarily connected to Cassandra to verify keyspace.');

            // Step 2: Create the keyspace if it's not already there
            const createKeyspaceQuery = `
        CREATE KEYSPACE IF NOT EXISTS ${keyspace}
        WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
      `;
            await tempClient.execute(createKeyspaceQuery);
            this.logger.log(`Keyspace "${keyspace}" has been created or already exists.`);
            await tempClient.shutdown();

            // Step 3: Establish the final, permanent connection to the desired keyspace
            this.client = new Client({
                contactPoints: [host],
                protocolOptions: { port },
                localDataCenter: datacenter,
                authProvider: authProvider,
                keyspace: keyspace,
                queryOptions: { consistency: types.consistencies.quorum },
            });

            await this.client.connect();
            this.logger.log(`Successfully connected to Cassandra and set keyspace to "${keyspace}"`);

        } catch (error) {
            this.logger.error('Failed to connect to Cassandra:', error.stack);
            if (tempClient) await tempClient.shutdown();
            throw error;
        }
    }

    /**
     * Gracefully shuts down the Cassandra client connection.
     */
    private async disconnect() {
        if (this.client) {
            this.logger.log('Disconnecting from Cassandra...');
            await this.client.shutdown();
            this.logger.log('Cassandra connection closed.');
        }
    }

    /**
     * Executes a single CQL query.
     */
    async execute(query: string, params: any[] = []): Promise<types.ResultSet> {
        if (!this.client) {
            throw new InternalServerErrorException('Cassandra client is not connected.');
        }
        try {
            return await this.client.execute(query, params, { prepare: true });
        } catch (error) {
            this.logger.error(`Error executing query in Cassandra: ${error.message}`);
            throw error;
        }
    }

    /**
     * Provides direct access to the Cassandra client instance.
     */
    getClient(): Client {
        return this.client;
    }

    /**
     * Executes a batch of queries.
     */
    async executeBatch(batch: { queries: string[] }): Promise<any> {
        if (!this.client) {
            throw new InternalServerErrorException('Cassandra client is not connected.');
        }
        try {
            this.logger.log(`Executing batch with ${batch.queries.length} queries`);
            const batchQueries = batch.queries.map(query => ({ query }));

            if (batchQueries.length === 0) {
                throw new Error('No queries to execute in the batch');
            }

            const result = await this.client.batch(batchQueries, { prepare: true });
            this.logger.log('Batch executed successfully.');
            return {
                success: true,
                message: `Batch executed successfully: ${batch.queries.length} operations`,
                affectedRows: batch.queries.length,
                info: result.info,
            };
        } catch (error) {
            this.logger.error(`Error executing CQL batch: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extracts individual statements from a BEGIN BATCH...APPLY BATCH string.
     */
    extractBatchStatements(batchCql: string): string[] {
        const batchMatch = batchCql.match(/BEGIN\s+BATCH\s+([\s\S]*?)\s+APPLY\s+BATCH/i);
        if (!batchMatch || !batchMatch[1]) {
            this.logger.error('Could not extract content from BATCH string');
            return [];
        }
        const batchContent = batchMatch[1].trim();
        return batchContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0)
            .map(stmt => stmt + ';');
    }

    /**
     * Executes a full BATCH statement provided as a single string.
     */
    async executeBatchFromString(batchCql: string): Promise<any> {
        const statements = this.extractBatchStatements(batchCql);
        if (statements.length === 0) {
            throw new Error('Could not extract valid statements from the BATCH string');
        }
        return this.executeBatch({ queries: statements });
    }
}

