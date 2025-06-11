// src/pages/AdminTranslatorPage.tsx
import React, { useState, useEffect } from 'react';
import { FaCopy, FaPlay, FaSpinner, FaDownload } from 'react-icons/fa';
import AdminLayout from '../components/layouts/AdminLayout';
import KeyspaceService from '../services/KeyspaceService';
import TranslatorService, { ExecuteResponse } from '../services/TranslatorService';
import '../styles/AdminTranslatorPage.css';

// Modal types
type ModalType = 'deleteConfirmation' | null;

const AdminTranslatorPage: React.FC = () => {
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
  
  // Rastrea el keyspace actual
  const [currentKeyspace, setCurrentKeyspace] = useState<string>('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [pendingQuery, setPendingQuery] = useState<string>('');

  // Show modal helper function
  const showModal = (type: ModalType) => {
    setModalType(type);
    setModalOpen(true);
  };

  // Close modal helper function
  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setPendingQuery('');
  };

  // Función para detectar si la consulta SQL es una sentencia DROP DATABASE
  const isDropDatabaseQuery = (query: string): boolean => {
    const trimmedQuery = query.trim().toLowerCase();
    return trimmedQuery.includes('drop') && trimmedQuery.includes('database');
  };

  // Cargar las bases de datos (keyspaces) del backend
  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        const keyspaces = await KeyspaceService.getUserKeyspaces();
        setDatabases(keyspaces);
        if (keyspaces.length > 0) {
          const defaultKeyspace = keyspaces[0];
          setSelectedDatabase(defaultKeyspace);
          setCurrentKeyspace(defaultKeyspace);
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
    setTables([]);
    if (keyspace && keyspace !== currentKeyspace) {
      await sendUseCommand(keyspace);
      setCurrentKeyspace(keyspace);
    }
  };

  // Función para enviar comando USE al backend
  const sendUseCommand = async (keyspace: string) => {
    if (!keyspace) return;
    setIsExecuting(true);
    setError(null);
    try {
      const useCommand = `USE "${keyspace}";`;
      const response = await TranslatorService.executeQuery(useCommand);
      
      if (response && response.success) {
        // Actualizar CQL
        if (response.copyableCqlQuery && response.copyableCqlQuery.query) {
          setCqlQuery(response.copyableCqlQuery.query);
        } else if (response.cql) {
          setCqlQuery(response.cql);
        } else if (response.translatedQuery) {
          setCqlQuery(response.translatedQuery);
        }
        
        // Mostrar mensaje (ya mejorado por el servicio)
        const mensaje = response.message || `Base de datos ${keyspace} seleccionada correctamente.`;
        setResults([{ mensaje }]);
        setColumns(['mensaje']);
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

  // Función para ejecutar la consulta SQL
  const executeQuery = async (query: string) => {
    setIsExecuting(true);
    setError(null);
    try {
      const response = await TranslatorService.executeQuery(query);
      
      if (response) {
        // Actualizar CQL
        if (response.copyableCqlQuery && response.copyableCqlQuery.query) {
          setCqlQuery(response.copyableCqlQuery.query);
        } else if (response.cql) {
          setCqlQuery(response.cql);
        } else if (response.translatedQuery) {
          setCqlQuery(response.translatedQuery);
        }
        
        // Procesar respuesta
        if (response.success) {
          if (response.executionResult && response.executionResult.data && response.executionResult.data.rows) {
            // Datos de SELECT
            setResults(response.executionResult.data.rows);
            if (response.executionResult.data.columns) {
              const columnNames = response.executionResult.data.columns.map(col => col.name);
              setColumns(columnNames);
            } else if (response.executionResult.data.rows.length > 0) {
              setColumns(Object.keys(response.executionResult.data.rows[0]));
            }
          } else {
            // Operación sin datos (mensaje ya mejorado por el servicio)
            const mensaje = response.message || 'Operación ejecutada correctamente.';
            setResults([{ mensaje }]);
            setColumns(['mensaje']);
          }
        } else {
          // Error (mensaje ya mejorado por el servicio)
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

  // Función principal para manejar la ejecución
  const handleExecute = async () => {
    if (!sqlQuery.trim()) return;

    if (isDropDatabaseQuery(sqlQuery)) {
      setPendingQuery(sqlQuery);
      showModal('deleteConfirmation');
      return;
    }

    await executeQuery(sqlQuery);
  };

  // Handle confirmation modal response
  const handleConfirmation = (confirmed: boolean) => {
    closeModal();
    if (confirmed && pendingQuery) {
      executeQuery(pendingQuery);
    }
  };

  // Función para descargar resultados como CSV
  const downloadCSV = () => {
    if (results.length === 0 || columns.length === 0) return;

    const csvContent = [
      columns.join(','),
      ...results.map(row =>
        columns.map(column => {
          const value = row[column];
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    let fileName = 'resultados';
    if (selectedDatabase) {
      const tableName = extractTableNameFromQuery(sqlQuery);
      if (tableName) {
        fileName = `resultados_${selectedDatabase}.${tableName}`;
      } else {
        fileName = `resultados_${selectedDatabase}`;
      }
    } else {
      fileName = `resultados_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para extraer el nombre de la tabla del query SQL
  const extractTableNameFromQuery = (query: string): string | null => {
    if (!query) return null;
    
    const trimmedQuery = query.trim().toLowerCase();
    
    const selectFromMatch = trimmedQuery.match(/select\s+.*?\s+from\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    if (selectFromMatch) return selectFromMatch[1];
    
    const insertMatch = trimmedQuery.match(/insert\s+into\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    if (insertMatch) return insertMatch[1];
    
    const updateMatch = trimmedQuery.match(/update\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    if (updateMatch) return updateMatch[1];
    
    const deleteMatch = trimmedQuery.match(/delete\s+from\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    if (deleteMatch) return deleteMatch[1];
    
    return null;
  };

  // Función para verificar si los resultados son descargables
  const isDataDownloadable = () => {
    return results.length > 0 && columns.length > 0 && !columns.includes('mensaje');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cqlQuery);
    setShowTooltip(true);
    setTimeout(() => {
      setShowTooltip(false);
    }, 2000);
  };

  return (
    <AdminLayout>
      {/* Modal component */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            {modalType === 'deleteConfirmation' && (
              <>
                <p className="modal-message">
                  La ejecución de esta sentencia podría ocasionar fallos en el sistema. ¿Seguro que desea continuar?
                </p>
                <div className="modal-buttons">
                  <button
                    className="modal-button si-button"
                    onClick={() => handleConfirmation(true)}
                  >
                    SI
                  </button>
                  <button
                    className="modal-button no-button"
                    onClick={() => handleConfirmation(false)}
                  >
                    NO
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="admin-panel translator-panel">
        {error && <div className="error-message">{error}</div>}
        
        <div className="database-selector">
          <div className="select-container">
            {isLoadingDatabases ? (
              <div className="loading-indicator">
                <FaSpinner className="spinner-icon" />
                <span>Cargando bases de datos...</span>
              </div>
            ) : (
              <select
                id="database-select"
                name="database-select"
                className="database-select admin-input"
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
            className="admin-button execute-button"
            onClick={handleExecute}
            disabled={isLoadingDatabases || !sqlQuery.trim() || isExecuting}
          >
            <span>{isExecuting ? 'Ejecutando...' : 'Ejecutar'}</span>
            {isExecuting ? <FaSpinner className="execute-icon spinner-icon" /> : <FaPlay className="execute-icon" />}
          </button>
        </div>
      </div>

      <div className="admin-panel results-panel">
        <div className="results-header">
          <h3 className="admin-panel-title">Resultado</h3>
          {isDataDownloadable() && (
            <button className="download-button" onClick={downloadCSV} title="Descargar CSV">
              <FaDownload />
            </button>
          )}
        </div>
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
                      <td key={colIndex}>{row[column] !== undefined ? String(row[column]) : ''}</td>
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
    </AdminLayout>
  );
};

export default AdminTranslatorPage;