// src/components/TranslatorPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowsAltH, FaSignOutAlt, FaUserCircle, FaCopy, FaPlay, FaSpinner } from 'react-icons/fa';
import KeyspaceService from '../services/KeyspaceService';
import AuthService from '../services/AuthService';
import HttpService from '../services/HttpService';
import '../styles/TranslatorPage.css';

// Definir interfaces para las respuestas del API
interface ExecuteResponse {
  success: boolean;
  cql?: string;
  translatedQuery?: string;
  copyableCqlQuery?: {
    query: string;
    description: string;
  };
  message?: string;
  data?: any[];
  metadata?: {
    columns: string[];
  };
  executionResult?: {
    success: boolean;
    data: {
      info?: any;
      rows: any[];
      rowLength: number;
      columns: {
        name: string;
        type: {
          code: number;
          type: any;
        };
      }[];
      pageState: any;
    };
  };
}

const TranslatorPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [tables, setTables] = useState<string[]>([]);
  const [sqlQuery, setSqlQuery] = useState('');
  const [cqlQuery, setCqlQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>(['campo1', 'campo2', 'campo3', 'campoN']);
  const [showTooltip, setShowTooltip] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(true);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Rastrea el keyspace actual en lugar de usar un Set
  const [currentKeyspace, setCurrentKeyspace] = useState<string>('');

  // Cargar las bases de datos (keyspaces) del backend sin bloquear la interfaz
  useEffect(() => {
    // Esta función se ejecutará de manera asíncrona sin bloquear el renderizado
    const fetchDatabases = async () => {
      try {
        // Verificar si el usuario actual cambió
        const currentUser = AuthService.getCurrentUser();
        const cachedUserCedula = localStorage.getItem('cachedUserCedula');
        
        if (currentUser && cachedUserCedula && cachedUserCedula !== currentUser.cedula) {
          console.log('Detectado cambio de usuario, limpiando caché');
          KeyspaceService.clearCache();
        }
        
        // Obtener keyspaces del usuario desde el backend
        const keyspaces = await KeyspaceService.getUserKeyspaces();
        console.log("Keyspaces obtenidos:", keyspaces);
        setDatabases(keyspaces);
        
        // Si hay keyspaces disponibles, seleccionar el primero por defecto
        if (keyspaces.length > 0) {
          const defaultKeyspace = keyspaces[0];
          setSelectedDatabase(defaultKeyspace);
          setCurrentKeyspace(defaultKeyspace); // Establecer el keyspace actual
          // Enviar USE para el keyspace inicial
          await sendUseCommand(defaultKeyspace);
        }
      } catch (error) {
        console.error('Error al cargar las bases de datos:', error);
        setError('No se pudieron cargar las bases de datos. Por favor, intente nuevamente.');
        setDatabases([]);
      } finally {
        setIsLoadingDatabases(false);
      }
    };

    // Iniciamos la carga de manera no bloqueante
    fetchDatabases();
  }, []);

  // Cargar tablas cuando cambia la base de datos seleccionada
  useEffect(() => {
    const loadTables = async () => {
      if (!selectedDatabase) {
        setTables([]);
        return;
      }

      setIsLoadingTables(true);
      try {
        const tables = await KeyspaceService.getKeyspaceTables(selectedDatabase);
        setTables(tables);
      } catch (error) {
        console.error('Error al cargar tablas:', error);
        setTables([]);
        setError(`Error al cargar las tablas del keyspace ${selectedDatabase}`);
      } finally {
        setIsLoadingTables(false);
      }
    };

    loadTables();
  }, [selectedDatabase]);

  // Manejar cambio de base de datos seleccionada
  const handleDatabaseChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const keyspace = e.target.value;
    setSelectedDatabase(keyspace);
    
    // Limpiar las tablas mientras se cargan las nuevas
    setTables([]);
    
    // SIEMPRE enviar el comando USE cuando se selecciona un keyspace diferente
    if (keyspace && keyspace !== currentKeyspace) {
      await sendUseCommand(keyspace);
      // Actualizar el keyspace actual
      setCurrentKeyspace(keyspace);
    }
  };

  // Función para enviar comando USE al backend
  const sendUseCommand = async (keyspace: string) => {
    if (!keyspace) return;
    
    setIsExecuting(true);
    setError(null);
    
    try {
      // Crear el comando USE
      const useCommand = `USE ${keyspace};`;
      
      console.log(`Enviando comando USE para keyspace: ${keyspace}`);
      
      // Enviar el comando al backend
      const response = await HttpService.post<ExecuteResponse>(
        '/translator/execute',
        { sql: useCommand },
        { service: 'translator' }
      );
      
      if (response && response.success) {
        // Priorizar el campo copyableCqlQuery.query para mostrar en el campo CQL
        if (response.copyableCqlQuery && response.copyableCqlQuery.query) {
          setCqlQuery(response.copyableCqlQuery.query);
        } else if (response.cql) {
          setCqlQuery(response.cql);
        } else if (response.translatedQuery) {
          setCqlQuery(response.translatedQuery);
        }
        
        // Mostrar mensaje de éxito en la sección de resultados
        const mensaje = response.message || `Base de datos ${keyspace} seleccionada correctamente.`;
        setResults([{ mensaje }]);
        setColumns(['mensaje']);
        
        console.log(`Comando USE ejecutado exitosamente para ${keyspace}`);
      } else {
        const errorMsg = response?.message || `Error al seleccionar la base de datos ${keyspace}.`;
        setError(errorMsg);
        setResults([{ mensaje: errorMsg }]);
        setColumns(['mensaje']);
      }
    } catch (error: any) {
      console.error('Error al ejecutar USE:', error);
      const errorMsg = `Error al seleccionar la base de datos ${keyspace}: ${error.message}`;
      setError(errorMsg);
      setResults([{ mensaje: errorMsg }]);
      setColumns(['mensaje']);
    } finally {
      setIsExecuting(false);
    }
  };

  // Función para ejecutar la consulta SQL (ahora también maneja la traducción)
  const handleExecute = async () => {
    if (!sqlQuery.trim()) return;
    
    setIsExecuting(true);
    setError(null);
    
    try {
      // Ejecutamos la consulta directamente - el backend se encarga de traducir y ejecutar
      const response = await HttpService.post<ExecuteResponse>(
        '/translator/execute', 
        { sql: sqlQuery },
        { service: 'translator' }
      );
      
      if (response) {
        // Actualizar el campo CQL con el valor de copyableCqlQuery.query si existe
        if (response.copyableCqlQuery && response.copyableCqlQuery.query) {
          setCqlQuery(response.copyableCqlQuery.query);
        } else if (response.cql) {
          // Si no hay copyableCqlQuery, usar el campo cql
          setCqlQuery(response.cql);
        } else if (response.translatedQuery) {
          // Si tampoco hay cql, usar translatedQuery como fallback
          setCqlQuery(response.translatedQuery);
        }
        
        // Procesar la respuesta según su estructura
        if (response.success) {
          // Verificar si hay datos en executionResult
          if (response.executionResult && response.executionResult.data && response.executionResult.data.rows) {
            // Es un resultado de tipo SELECT con datos
            setResults(response.executionResult.data.rows);
            
            // Extraer los nombres de las columnas
            if (response.executionResult.data.columns) {
              const columnNames = response.executionResult.data.columns.map(col => col.name);
              setColumns(columnNames);
            } else {
              // Si no hay definición de columnas, extraer las claves del primer objeto
              if (response.executionResult.data.rows.length > 0) {
                setColumns(Object.keys(response.executionResult.data.rows[0]));
              }
            }
          } else {
            // Es una operación sin datos (INSERT, UPDATE, etc.)
            // Mostrar el mensaje proporcionado por el backend
            if (response.message) {
              setResults([{ mensaje: response.message }]);
              setColumns(['mensaje']);
            } else {
              // Si por alguna razón no hay mensaje, mostrar uno genérico
              setResults([{ mensaje: 'Operación ejecutada correctamente.' }]);
              setColumns(['mensaje']);
            }
          }
        } else {
          // La operación falló
          const mensajeError = response.message || 'Error al ejecutar la consulta.';
          setError(mensajeError);
          setResults([{ mensaje: mensajeError }]);
          setColumns(['mensaje']);
        }
      } else {
        const mensajeError = 'La respuesta del servidor no tiene el formato esperado.';
        setError(mensajeError);
        setResults([{ mensaje: mensajeError }]);
        setColumns(['mensaje']);
      }
    } catch (error: any) {
      console.error('Error al ejecutar:', error);
      const mensajeError = error.message || 'Error al ejecutar la consulta SQL.';
      setError(mensajeError);
      setResults([{ mensaje: mensajeError }]);
      setColumns(['mensaje']);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cqlQuery);
    setShowTooltip(true);
    // Ocultar el tooltip después de 2 segundos
    setTimeout(() => {
      setShowTooltip(false);
    }, 2000);
  };

  return (
    <div className="translator-container">
      {/* Sidebar izquierdo */}
      <div className="sidebar">
        <div className="logo">CASSQL</div>
        <div className="menu-item active">
          <FaArrowsAltH className="menu-icon" />
          <span>Traductor</span>
        </div>
        <div className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt className="menu-icon" />
          <span>Salir</span>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="main-content">
        {/* Barra superior con usuario */}
        <div className="top-bar">
          <div className="user-info">
            <span>{AuthService.getCurrentUser()?.nombre || 'Usuario'}</span>
            <FaUserCircle className="user-icon" />
          </div>
        </div>

        {/* Área de trabajo */}
        <div className="work-area">
          {/* Sección de consulta */}
          <div className="query-section">
            {error && <div className="error-message">{error}</div>}
            
            <div className="database-selector">
              <div className="select-container">
                {/* Indicador de carga para el selector de bases de datos */}
                {isLoadingDatabases ? (
                  <div className="loading-indicator">
                    <FaSpinner className="spinner-icon" />
                    <span>Cargando bases de datos...</span>
                  </div>
                ) : (
                  /* Select funcional que envía USE la primera vez */
                  <select
                    id="database-select"
                    name="database-select"
                    className="database-select"
                    value={selectedDatabase}
                    onChange={handleDatabaseChange}
                    disabled={isExecuting}
                  >
                    {databases.length === 0 ? (
                      <option value="">No hay bases de datos disponibles</option>
                    ) : (
                      <>
                        <option value="" disabled>Seleccionar base de datos</option>
                        {databases.map((db, index) => (
                          <option key={index} value={db}>{db}</option>
                        ))}
                      </>
                    )}
                  </select>
                )}
              </div>
              
              <div className="select-container">
                <div className="readonly-select">
                  {isLoadingTables ? (
                    <div className="loading-indicator">
                      <FaSpinner className="spinner-icon" />
                      <span>Cargando tablas...</span>
                    </div>
                  ) : (
                    <span className={tables.length === 0 ? "placeholder" : ""}>
                      {tables.length > 0 ? tables.join(", ") : "No hay tablas disponibles"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="query-editors">
              <div className="editor-container">
                <h3>SQL</h3>
                <textarea
                  className="query-editor"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder={isLoadingDatabases 
                    ? "Cargando bases de datos..." 
                    : "Escribe tu consulta SQL aquí..."}
                  disabled={isLoadingDatabases || isExecuting}
                />
              </div>
              
              <div className="editor-container">
                <h3>CQL</h3>
                <div className="cql-container">
                  <textarea
                    className="query-editor"
                    value={cqlQuery}
                    placeholder="Resultado de la traducción a CQL..."
                    readOnly
                  />
                  <button className="copy-button" onClick={copyToClipboard} disabled={!cqlQuery}>
                    <FaCopy />
                  </button>
                  <div className={`copy-tooltip ${showTooltip ? 'show' : ''}`}>
                    Copiado al portapapeles
                  </div>
                </div>
              </div>
            </div>

            <div className="execute-button-container">
              <button
                className="execute-button"
                onClick={handleExecute}
                disabled={isLoadingDatabases || !sqlQuery.trim() || isExecuting}
              >
                <span>{isExecuting ? 'Ejecutando...' : 'Ejecutar'}</span>
                {isExecuting ? <FaSpinner className="execute-icon spinner-icon" /> : <FaPlay className="execute-icon" />}
              </button>
            </div>
          </div>

          {/* Sección de resultados */}
          <div className="results-section">
            <h3>Resultado</h3>
            <div className="results-table">
              {results.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      {columns.map((column, index) => (
                        <th key={index}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {columns.map((column, colIndex) => (
                          <td key={colIndex}>
                            {row[column] !== undefined ? String(row[column]) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-results">
                  No hay resultados para mostrar.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslatorPage;