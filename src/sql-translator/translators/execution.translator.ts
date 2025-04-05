import { Injectable, Logger } from '@nestjs/common';
import { Translator } from '../interfaces/translator.interface';
import { CassandraService } from '../cassandra-connection/cassandra.service';

@Injectable()
export class ExecutionTranslator implements Translator {
  private readonly logger = new Logger(ExecutionTranslator.name);

  constructor(private readonly cassandraService: CassandraService) {}

  canHandle(ast: any): boolean {
    // Este traductor no maneja traducciones, solo ejecuciones
    return false;
  }

  translate(ast: any): string {
    // No implementamos este método ya que este traductor no realiza traducciones
    return '';
  }

  /**
   * Ejecuta una consulta CQL en la base de datos Cassandra
   * @param cql Consulta CQL a ejecutar
   * @returns Resultado de la ejecución
   */
  async execute(cql: string): Promise<any> {
    try {
      this.logger.debug(`Ejecutando CQL: ${cql}`);
      const result = await this.cassandraService.execute(cql);
      return {
        success: true,
        result
      };
    } catch (error) {
      this.logger.error(`Error al ejecutar CQL: ${error.message}`);
      return {
        success: false,
        error: `Error en la ejecución: ${error.message}`
      };
    }
  }
}