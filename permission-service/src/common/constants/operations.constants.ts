/**
 * Lista de operaciones disponibles para traducción SQL a CQL
 */
export const AVAILABLE_OPERATIONS = [
    'CREATE KEYSPACE',
    'ALTER KEYSPACE',
    'DROP KEYSPACE',
    'DESCRIBE KEYSPACES',
    'USE',
    'CREATE TABLE',
    'ALTER TABLE ADD',
    'ALTER TABLE DROP',
    'ALTER TABLE RENAME',
    'DROP TABLE',
    'TRUNCATE TABLE',
    'DESCRIBE TABLES',
    'DESCRIBE TABLE',
    'CREATE INDEX',
    'DROP INDEX',
    'INSERT',
    'UPDATE',
    'DELETE',
    'SELECT'
  ];
  
  /**
   * Operaciones predeterminadas para un administrador
   */
  export const ADMIN_DEFAULT_OPERATIONS = [...AVAILABLE_OPERATIONS];
  
  /**
   * Operaciones predeterminadas para un usuario normal
   * Estas son las operaciones con las que se crea un usuario por defecto
   */
  export const USER_DEFAULT_OPERATIONS = [
    'SELECT',
    'USE',
    'INSERT',
    'UPDATE',
    'DELETE',
    'DESCRIBE KEYSPACES',
    'DESCRIBE TABLES',
    'DESCRIBE TABLE'
  ];