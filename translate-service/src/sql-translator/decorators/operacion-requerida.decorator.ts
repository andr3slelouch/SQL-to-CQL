import { SetMetadata } from '@nestjs/common';

// Clave para metadatos de permisos de operaciones SQL
export const OPERACION_REQUERIDA = 'operacion_requerida';

/**
 * Decorador para establecer la operación SQL requerida en un controlador
 * @param operacion Operación SQL (SELECT, INSERT, UPDATE, DELETE, etc.)
 */
export const OperacionRequerida = (operacion: string) => SetMetadata(OPERACION_REQUERIDA, operacion);