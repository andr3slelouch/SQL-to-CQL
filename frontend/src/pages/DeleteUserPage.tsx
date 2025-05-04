// src/pages/DeleteUserPage.tsx
import React, { useState } from 'react';
import AdminLayout from '../components/layouts/AdminLayout';

const DeleteUserPage: React.FC = () => {
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [rol, setRol] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para eliminar al usuario en el backend
    alert('Usuario eliminado');
    // Resetear formulario
    setNombre('');
    setCedula('');
    setRol('');
  };
  
  const handleSearch = () => {
    // En una aplicación real, aquí se buscaría al usuario por cédula en el backend
    // Para fines de demostración, solo simulamos encontrar un usuario
    setNombre('Usuario Ejemplo');
    setCedula('1234567890');
    setRol('Administrador');
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
                  onChange={(e) => setNombre(e.target.value)}
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
                  onChange={(e) => setCedula(e.target.value)}
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
                  onChange={(e) => setRol(e.target.value)}
                  readOnly
                />
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button 
              type="submit" 
              className="admin-button"
              disabled={!nombre || !cedula || !rol}
            >
              Eliminar
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default DeleteUserPage;