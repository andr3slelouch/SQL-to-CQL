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

  /**
   * Obtiene el cliente de Cassandra actual
   * @param token Token JWT opcional (no utilizado en esta implementación)
   * @returns Cliente de Cassandra
   */
  async getClient(token?: string): Promise<Client> {
    // En esta implementación actual, ignoramos el token y devolvemos el cliente predeterminado
    // Si en el futuro quieres implementar conexiones por usuario, puedes usar el token
    return this.client;
  }

  /**
   * Ejecuta una consulta CQL en Cassandra
   * @param query Consulta CQL a ejecutar
   * @param params Parámetros opcionales para la consulta
   * @returns Conjunto de resultados de Cassandra
   */
  async execute(query: string, params: any[] = []): Promise<types.ResultSet> {
    try {
      return await this.client.execute(query, params, { prepare: true });
    } catch (error) {
      this.logger.error(`Error ejecutando query en Cassandra: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ejecuta un batch de consultas CQL en Cassandra
   * @param batch Información del batch a ejecutar
   * @returns Resultado de la ejecución del batch
   */
  async executeBatch(batch: { queries: string[] }): Promise<any> {
    try {
      this.logger.log(`Ejecutando batch con ${batch.queries.length} consultas`);
      
      // Convertir strings de consultas a objetos de consulta para cassandra-driver
      const batchQueries = batch.queries.map(query => ({ query }));
      
      // Verificar que hay consultas para ejecutar
      if (batchQueries.length === 0) {
        throw new Error('No hay consultas para ejecutar en el batch');
      }
      
      // Ejecutar el batch
      const result = await this.client.batch(batchQueries, { prepare: true });
      
      // El resultado de batch no tiene wasApplied, así que no lo verificamos
      // En su lugar, si llegamos aquí es que se aplicó correctamente
      this.logger.log(`Batch ejecutado con éxito.`);
      
      return {
        success: true,
        message: `Batch ejecutado con éxito: ${batch.queries.length} operaciones`,
        affectedRows: batch.queries.length,
        info: result.info
      };
    } catch (error) {
      this.logger.error(`Error al ejecutar batch CQL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extrae las sentencias individuales de un string CQL que contiene un BATCH
   * @param batchCql Consulta CQL que contiene un BATCH
   * @returns Array de sentencias CQL individuales
   */
  extractBatchStatements(batchCql: string): string[] {
    try {
      // Extraer el contenido entre BEGIN BATCH y APPLY BATCH
      const batchMatch = batchCql.match(/BEGIN\s+BATCH\s+([\s\S]*?)\s+APPLY\s+BATCH/i);
      
      if (!batchMatch || !batchMatch[1]) {
        this.logger.error('No se pudo extraer el contenido del BATCH');
        return [];
      }
      
      const batchContent = batchMatch[1].trim();
      
      // Dividir en sentencias individuales (terminadas en punto y coma)
      const statements = batchContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0)
        .map(stmt => stmt + ';');
      
      if (statements.length === 0) {
        this.logger.error('No se encontraron sentencias válidas en el BATCH');
        return [];
      }
      
      return statements;
    } catch (error) {
      this.logger.error(`Error al extraer sentencias del BATCH: ${error.message}`);
      return [];
    }
  }

  /**
   * Ejecuta un BATCH a partir de un string CQL completo que contiene un BATCH
   * @param batchCql String CQL completo con formato BEGIN BATCH ... APPLY BATCH
   * @returns Resultado de la ejecución del batch
   */
  async executeBatchFromString(batchCql: string): Promise<any> {
    // Extraer las sentencias individuales del BATCH
    const statements = this.extractBatchStatements(batchCql);
    
    if (statements.length === 0) {
      throw new Error('No se pudieron extraer sentencias válidas del BATCH');
    }
    
    // Ejecutar el batch con las sentencias extraídas
    return await this.executeBatch({ queries: statements });
  }
}