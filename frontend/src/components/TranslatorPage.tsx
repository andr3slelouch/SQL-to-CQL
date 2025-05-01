// src/components/TranslatorPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowsAltH, FaSignOutAlt, FaUserCircle, FaCopy, FaPlay, FaSpinner } from 'react-icons/fa';
import KeyspaceService from '../services/KeyspaceService';
import AuthService from '../services/AuthService';
import '../styles/TranslatorPage.css';

const TranslatorPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDatabase, setSelectedDatabase] = useState<string>(KeyspaceService.getCurrentKeyspace() || '');
  const [tables, setTables] = useState<string[]>([]);
  const [sqlQuery, setSqlQuery] = useState('');
  const [cqlQuery, setCqlQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simular datos de resultado
  const sampleData = [
    { campo1: 'Valor1A', campo2: 'Valor2A', campo3: 'Valor3A', campoN: 'ValorNA' },
    { campo1: 'Valor1B', campo2: 'Valor2B', campo3: 'Valor3B', campoN: 'ValorNB' },
    { campo1: 'Valor1C', campo2: 'Valor2C', campo3: 'Valor3C', campoN: 'ValorNC' }
  ];

  // Cargar las bases de datos (keyspaces) del backend sin bloquear la interfaz
  useEffect(() => {
    // Esta función se ejecutará de manera asíncrona sin bloquear el renderizado
    const fetchDatabases = async () => {
      try {
        // Obtener keyspaces del usuario desde el backend
        const keyspaces = await KeyspaceService.getUserKeyspaces();
        console.log("Keyspaces obtenidos:", keyspaces);
        setDatabases(keyspaces);
        
        // Si hay un keyspace guardado y está en la lista, cargarlo
        const currentKeyspace = KeyspaceService.getCurrentKeyspace();
        if (currentKeyspace && keyspaces.includes(currentKeyspace)) {
          setSelectedDatabase(currentKeyspace);
          // Simular carga de tablas para el keyspace guardado
          simulateLoadTables(currentKeyspace);
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
    
    // No hay dependencias, solo se ejecuta una vez al montar el componente
  }, []);

  // Simular la carga de tablas para un keyspace
  const simulateLoadTables = (keyspace: string) => {
    if (!keyspace) return;
    
    // En una aplicación real, esto sería una llamada a la API con el keyspace seleccionado
    const mockTables = [
      'usuarios', 
      'productos', 
      'pedidos', 
      'categorias', 
      'inventario'
    ];
    
    // Simulamos un pequeño retraso como en una llamada real a API
    setTimeout(() => {
      setTables(mockTables);
    }, 300);
  };

  // Manejar el cambio de base de datos seleccionada
  const handleDatabaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const keyspace = e.target.value;
    setSelectedDatabase(keyspace);
    
    // Guardar el keyspace seleccionado en el servicio (equivalente a "USE keyspace")
    KeyspaceService.setCurrentKeyspace(keyspace);
    
    // Limpiar resultados anteriores
    setResults([]);
    setCqlQuery('');
    setSqlQuery('');
    
    if (keyspace) {
      console.log(`Keyspace seleccionado: ${keyspace}`);
      // Cargar tablas para el keyspace seleccionado
      simulateLoadTables(keyspace);
    } else {
      // Si no hay keyspace seleccionado, limpiar las tablas
      setTables([]);
    }
  };

  const handleExecute = () => {
    // Simulación de traducción SQL a CQL
    if (sqlQuery) {
      // Esto es solo un ejemplo simple para mostrar
      let translated = sqlQuery;
      // Conversión básica de SQL a CQL (muy simplificada)
      translated = translated
        .replace(/SELECT\s+(.*?)\s+FROM/i, 'SELECT $1 FROM')
        .replace(/WHERE\s+(.*?)(?=\s+ORDER BY|GROUP BY|LIMIT|;|$)/i, 'WHERE $1')
        .replace(/ORDER BY/i, 'ORDER BY')
        .replace(/LIMIT/i, 'LIMIT')
        .replace(/JOIN/i, 'JOIN /* Las JOINs no funcionan igual en CQL */');
      setCqlQuery(translated);
      // Simulando resultados
      setResults(sampleData);
    }
  };

  const handleLogout = () => {
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
                {isLoadingDatabases && (
                  <div className="loading-indicator">
                    <FaSpinner className="spinner-icon" />
                    <span>Cargando bases de datos...</span>
                  </div>
                )}
                
                <select
                  className="database-select"
                  value={selectedDatabase}
                  onChange={handleDatabaseChange}
                  disabled={isLoadingDatabases}
                >
                  <option value="">Seleccionar una base de datos</option>
                  {databases.map((db, index) => (
                    <option key={index} value={db}>{db}</option>
                  ))}
                </select>
              </div>
              <div className="select-container">
                <div className="readonly-select">
                  <span className={tables.length === 0 ? "placeholder" : ""}>
                    {tables.length > 0 ? tables.join(", ") : "Tablas"}
                  </span>
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
                  disabled={isLoadingDatabases && !selectedDatabase}
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
                  <button className="copy-button" onClick={copyToClipboard}>
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
                disabled={isLoadingDatabases || !sqlQuery.trim()}
              >
                <span>Ejecutar</span>
                <FaPlay className="execute-icon" />
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
                      <th>Campo1</th>
                      <th>Campo2</th>
                      <th>Campo3</th>
                      <th>CampoN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, index) => (
                      <tr key={index}>
                        <td>{row.campo1}</td>
                        <td>{row.campo2}</td>
                        <td>{row.campo3}</td>
                        <td>{row.campoN}</td>
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