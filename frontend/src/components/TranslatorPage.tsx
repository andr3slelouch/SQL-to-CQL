// src/components/TranslatorPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowsAltH, FaSignOutAlt, FaUserCircle, FaCopy, FaPlay } from 'react-icons/fa';
import '../styles/TranslatorPage.css';

const TranslatorPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [tables, setTables] = useState<string[]>([]);
  const [sqlQuery, setSqlQuery] = useState('');
  const [cqlQuery, setCqlQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  
  // Simular datos de resultado
  const sampleData = [
    { campo1: 'Valor1A', campo2: 'Valor2A', campo3: 'Valor3A', campoN: 'ValorNA' },
    { campo1: 'Valor1B', campo2: 'Valor2B', campo3: 'Valor3B', campoN: 'ValorNB' },
    { campo1: 'Valor1C', campo2: 'Valor2C', campo3: 'Valor3C', campoN: 'ValorNC' }
  ];
  
  // Simular la carga de bases de datos desde el backend
  useEffect(() => {
    // En una aplicación real, esto sería una llamada a la API
    const fetchDatabases = async () => {
      // Simulamos una respuesta del backend
      const mockDatabases = [
        'base_ejemplo1', 
        'tienda_online', 
        'sistema_usuarios', 
        'inventario', 
        'finanzas'
      ];
      
      // Simulamos un pequeño retraso como en una llamada real a API
      setTimeout(() => {
        setDatabases(mockDatabases);
      }, 500);
    };
    
    fetchDatabases();
  }, []);
  
  // Simular la carga de tablas cuando se selecciona una base de datos
  useEffect(() => {
    if (selectedDatabase) {
      // En una aplicación real, esto sería una llamada a la API con el DB seleccionado
      const fetchTables = async () => {
        // Simulamos una respuesta del backend
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
      
      fetchTables();
    } else {
      setTables([]);
    }
  }, [selectedDatabase]);
  
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
            <span>Usuario</span>
            <FaUserCircle className="user-icon" />
          </div>
        </div>
        
        {/* Área de trabajo */}
        <div className="work-area">
          {/* Sección de consulta */}
          <div className="query-section">
            <div className="database-selector">
              <div className="select-container">
                <select 
                  className="database-select" 
                  value={selectedDatabase}
                  onChange={(e) => setSelectedDatabase(e.target.value)}
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
                  placeholder="Escribe tu consulta SQL aquí..."
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
              <button className="execute-button" onClick={handleExecute}>
                <span>Ejecutar</span>
                <FaPlay className="execute-icon" />
              </button>
            </div>
          </div>
          
          {/* Sección de resultados */}
          <div className="results-section">
            <h3>Resultado</h3>
            <div className="results-table">
              {results.length > 0 && (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslatorPage;