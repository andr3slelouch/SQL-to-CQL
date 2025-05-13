/**
 * Operaciones estándar disponibles para usuarios
 */
export const StandardOperations = [
    // Operaciones de Lectura
    'SELECT',
    'USE KEYSPACE',
    
    // Operaciones de Escritura
    'INSERT',
    'UPDATE',
    'DELETE',
    
    // Operaciones de Referencia/Metadatos
    'DESCRIBE TABLES',
    'DESCRIBE TABLE'
  ];
  
  /**
   * Obtiene la lista de operaciones predeterminadas para un nuevo usuario
   * @returns Lista de operaciones permitidas
   */
  export const getDefaultOperations = (): string[] => {
    return [...StandardOperations];
  };