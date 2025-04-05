// src/sql-parser/interfaces/sql-parser.interface.ts
export interface SqlParseResult {
    success: boolean;
    ast?: any;
    type?: string;
    error?: string;
  }
  
  // src/sql-parser/interfaces/data-type.interface.ts
  export interface SqlTypeInfo {
    originalType: string;
    baseType: string;
    params: TypeParameters;
    cqlType: string;
    requiresQuotes: boolean;
  }
  
  export interface TypeParameters {
    length?: number;
    precision?: number;
    scale?: number;
    [key: string]: any;
  }
  
  export interface ColumnDataTypeInfo {
    columnName: string;
    sqlType: string;
    cqlType: string;
    params: TypeParameters;
    requiresQuotes: boolean;
  }
  
  export interface SupportedDataType {
    sqlType: string;
    cqlType: string;
    requiresQuotes: boolean;
    description?: string;
  }