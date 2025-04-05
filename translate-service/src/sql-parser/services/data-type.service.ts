// src/sql-parser/services/data-type.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { DataTypesMapper } from '../util/data-types.util';

@Injectable()
export class DataTypeService {
  private readonly logger = new Logger(DataTypeService.name);

  /**
   * Traduce un tipo de datos SQL a su equivalente en CQL
   * @param sqlType Tipo de datos SQL (puede incluir parámetros como VARCHAR(255))
   * @returns Tipo de datos CQL equivalente
   */
  translateSqlTypeToCql(sqlType: string): string {
    this.logger.debug(`Traduciendo tipo SQL: ${sqlType}`);
    
    // Extraer el tipo base
    const baseType = DataTypesMapper.extractBaseType(sqlType);
    
    // Mapear a CQL
    const cqlBaseType = DataTypesMapper.mapSQLTypeToCQL(baseType);
    
    // Manejar parámetros específicos según el tipo
    const params = DataTypesMapper.extractTypeParameters(sqlType);
    
    // Adaptar el tipo según los parámetros
    return this.applyCqlTypeParameters(cqlBaseType, params);
  }

  /**
   * Aplica parámetros específicos a un tipo CQL
   * @param cqlType Tipo base CQL
   * @param params Parámetros extraídos del tipo SQL
   * @returns Tipo CQL con parámetros aplicados si corresponde
   */
  private applyCqlTypeParameters(cqlType: string, params: any): string {
    // Si no hay parámetros, devolver el tipo base
    if (!params || Object.keys(params).length === 0) {
      return cqlType;
    }
    
    // Aplicar parámetros según el tipo
    switch (cqlType) {
      case 'decimal':
        // En Cassandra, decimal puede tener precisión y escala
        if (params.precision && params.scale !== undefined) {
          return `decimal(${params.precision},${params.scale})`;
        }
        return cqlType;
        
      case 'text':
        // En Cassandra, text no tiene longitud
        // Pero podemos registrar la longitud original para referencia
        this.logger.debug(`Longitud original del campo text: ${params.length}`);
        return cqlType;
        
      default:
        return cqlType;
    }
  }

  /**
   * Verifica si un tipo de datos SQL es compatible con Cassandra
   * @param sqlType Tipo de datos SQL
   * @returns true si es compatible, false en caso contrario
   */
  isSqlTypeCompatibleWithCql(sqlType: string): boolean {
    const baseType = DataTypesMapper.extractBaseType(sqlType);
    return !!DataTypesMapper.mapSQLTypeToCQL(baseType);
  }

  /**
   * Formatea un valor para su uso en CQL según el tipo de datos
   * @param value Valor a formatear
   * @param sqlType Tipo de datos SQL
   * @returns Valor formateado para CQL
   */
  formatValueForCql(value: any, sqlType: string): string {
    return DataTypesMapper.formatValueForCQL(value, sqlType);
  }

  /**
   * Obtiene información sobre un tipo de datos SQL
   * @param sqlType Tipo de datos SQL
   * @returns Objeto con información del tipo
   */
  getSqlTypeInfo(sqlType: string): any {
    const baseType = DataTypesMapper.extractBaseType(sqlType);
    const params = DataTypesMapper.extractTypeParameters(sqlType);
    const cqlType = DataTypesMapper.mapSQLTypeToCQL(baseType);
    const requiresQuotes = DataTypesMapper.requiresQuotes(baseType);
    
    return {
      originalType: sqlType,
      baseType,
      params,
      cqlType,
      requiresQuotes
    };
  }

  /**
   * Obtiene todos los tipos de datos soportados
   * @returns Lista de tipos de datos SQL soportados y sus equivalentes CQL
   */
  getSupportedDataTypes(): any[] {
    const types = Object.entries(DataTypesMapper['SQL_TO_CQL_TYPE_MAP']).map(([sqlType, cqlType]) => ({
      sqlType,
      cqlType,
      requiresQuotes: DataTypesMapper.requiresQuotes(sqlType)
    }));
    
    return types;
  }
}