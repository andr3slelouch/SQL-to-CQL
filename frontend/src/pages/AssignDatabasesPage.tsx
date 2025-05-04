// src/pages/AssignDatabasesPage.tsx
import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/layouts/AdminLayout';

interface Database {
  id: number;
  name: string;
  active: boolean;
}

const AssignDatabasesPage: React.FC = () => {
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [rol, setRol] = useState('');
  const [databases, setDatabases] = useState<Database[]>([]);
  
  // Simular carga de bases de datos
  useEffect(() => {
    // En una aplicación real, esto vendría del backend
    const mockDatabases = [
      { id: 1, name: 'Nombre Base de Datos 1', active: true },
      { id: 2, name: 'Nombre Base de Datos 2', active: false },
      { id: 3, name: 'Nombre Base de Datos N', active: false }
    ];
    
    setDatabases(mockDatabases);
  }, []);
  
  const handleSearch = () => {
    // En una aplicación real, aquí se buscaría al usuario por cédula en el backend
    // Para fines de demostración, solo simulamos encontrar un usuario
    setNombre('Usuario Ejemplo');
    setCedula('1234567890');
    setRol('Administrador');
  };
  
  const handleToggleDatabase = (id: number) => {
    setDatabases(prevDatabases => 
      prevDatabases.map(db => 
        db.id === id ? { ...db, active: !db.active } : db
      )
    );
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para guardar los cambios en el backend
    alert('Bases de datos asignadas correctamente');
  };
  
  return (
    <AdminLayout>
      <div className="admin-panel">
        <div className="admin-form-group" style={{ marginBottom: '2rem' }}>
          <label htmlFor="search" className="admin-label">Buscar por Cédula/Código</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              id="search" 
              className="admin-input" 
              placeholder="Ingrese la cédula a buscar..."
            />
            <button 
              type="button" 
              className="admin-button" 
              onClick={handleSearch}
              style={{ minWidth: 'auto', padding: '0.8rem' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="admin-form-row">
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label htmlFor="nombre" className="admin-label">Nombre</label>
                <input 
                  type="text" 
                  id="nombre" 
                  className="admin-input" 
                  value={nombre}
                  readOnly
                />
              </div>
            </div>
            
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label htmlFor="cedula" className="admin-label">Cédula/Código</label>
                <input 
                  type="text" 
                  id="cedula" 
                  className="admin-input" 
                  value={cedula}
                  readOnly
                />
              </div>
            </div>
            
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label htmlFor="rol" className="admin-label">Rol</label>
                <input 
                  type="text" 
                  id="rol" 
                  className="admin-input" 
                  value={rol}
                  readOnly
                />
              </div>
            </div>
          </div>
          
          {nombre && (
            <>
              <h3 className="admin-panel-title" style={{ fontSize: '1.4rem', marginTop: '2rem' }}>
                Bases de Datos Disponibles
              </h3>
              
              <div className="admin-databases">
                {databases.map(db => (
                  <div key={db.id} className="toggle-container">
                    <span className="toggle-label">{db.name}</span>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={db.active}
                        onChange={() => handleToggleDatabase(db.id)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                <button 
                  type="submit" 
                  className="admin-button"
                >
                  Finalizar
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </AdminLayout>
  );
};

export default AssignDatabasesPage;