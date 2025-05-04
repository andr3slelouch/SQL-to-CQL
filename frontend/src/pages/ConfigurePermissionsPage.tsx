// src/pages/ConfigurePermissionsPage.tsx
import React, { useState } from 'react';
import AdminLayout from '../components/layouts/AdminLayout';
import '../styles/ConfigurePermissions.css';

interface Permission {
  id: number;
  name: string;
  active: boolean;
}

const ConfigurePermissionsPage: React.FC = () => {
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [rol, setRol] = useState('Usuario Común');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  
  // Lista de permisos para la matriz
  const [permissions, setPermissions] = useState<Permission[]>([
    { id: 1, name: 'Alter Keyspace', active: true },
    { id: 2, name: 'Create Table', active: true },
    { id: 3, name: 'Drop Table', active: true },
    { id: 4, name: 'Alter Table Add', active: true },
    { id: 5, name: 'Delete', active: false },
    { id: 6, name: 'Insert', active: false },
    { id: 7, name: 'Alter Table Drop', active: true },
    { id: 8, name: 'Describe Table', active: true },
    { id: 9, name: 'Select', active: false },
    { id: 10, name: 'Alter Table Rename', active: false },
    { id: 11, name: 'Describe Tables', active: true },
    { id: 12, name: 'Truncate Table', active: false },
    { id: 13, name: 'Create Index', active: false },
    { id: 14, name: 'Drop Index', active: true },
    { id: 15, name: 'Update', active: false },
    { id: 16, name: 'Create Keyspace', active: false },
    { id: 17, name: 'Drop Keyspace', active: true },
    { id: 18, name: 'Use', active: false }
  ]);
  
  const handleSearch = () => {
    // Simulación de búsqueda de usuario
    setNombre('Juan Pérez');
    setCedula('1234567890');
    setRol('Usuario Común');
  };
  
  const handleTogglePermission = (id: number) => {
    setPermissions(prevPermissions => 
      prevPermissions.map(perm => 
        perm.id === id ? { ...perm, active: !perm.active } : perm
      )
    );
  };
  
  const handleSave = () => {
    setConfirmDialog(true);
  };
  
  const handleConfirmYes = () => {
    // Aquí iría la lógica para guardar cambios en el backend
    setConfirmDialog(false);
    setSuccessDialog(true);
  };
  
  const handleConfirmNo = () => {
    setConfirmDialog(false);
  };
  
  const handleAcceptSuccess = () => {
    setSuccessDialog(false);
  };
  
  // Dividir los permisos en 3 columnas
  const leftPermissions = permissions.slice(0, 6);
  const middlePermissions = permissions.slice(6, 12);
  const rightPermissions = permissions.slice(12, 18);
  
  return (
    <AdminLayout>
      <div className="admin-panel permissions-panel">
        <div className="search-container">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Buscar por Cédula/Código"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button 
              className="search-button"
              onClick={handleSearch}
            >
              <span className="search-icon">⌕</span>
            </button>
          </div>
        </div>
        
        <div className="user-info-row">
          <div className="user-field">
            <label>Nombre</label>
            <input 
              type="text" 
              value={nombre}
              readOnly 
              className="user-input"
            />
          </div>
          
          <div className="user-field">
            <label>Cédula/Código</label>
            <input 
              type="text" 
              value={cedula}
              readOnly 
              className="user-input"
            />
          </div>
          
          <div className="user-field">
            <label>Rol</label>
            <select 
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="user-input role-select"
            >
              <option value="Administrador">Administrador</option>
              <option value="Usuario Común">Usuario Común</option>
            </select>
          </div>
        </div>
        
        <div className="permissions-grid">
          <div className="permissions-column">
            {leftPermissions.map(permission => (
              <div key={permission.id} className="permission-row">
                <span className="permission-name">{permission.name}</span>
                <label className={`toggle-switch ${permission.active ? 'active' : 'inactive'}`}>
                  <input 
                    type="checkbox" 
                    checked={permission.active}
                    onChange={() => handleTogglePermission(permission.id)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
          
          <div className="permissions-column">
            {middlePermissions.map(permission => (
              <div key={permission.id} className="permission-row">
                <span className="permission-name">{permission.name}</span>
                <label className={`toggle-switch ${permission.active ? 'active' : 'inactive'}`}>
                  <input 
                    type="checkbox" 
                    checked={permission.active}
                    onChange={() => handleTogglePermission(permission.id)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
          
          <div className="permissions-column">
            {rightPermissions.map(permission => (
              <div key={permission.id} className="permission-row">
                <span className="permission-name">{permission.name}</span>
                <label className={`toggle-switch ${permission.active ? 'active' : 'inactive'}`}>
                  <input 
                    type="checkbox" 
                    checked={permission.active}
                    onChange={() => handleTogglePermission(permission.id)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="save-container">
          <button 
            className="save-button"
            onClick={handleSave}
          >
            Guardar
          </button>
        </div>
      </div>
      
      {/* Dialog de confirmación */}
      {confirmDialog && (
        <div className="dialog-overlay">
          <div className="dialog-container">
            <div className="dialog-content">
              <p className="dialog-message">¿Seguro desea cambiar el rol y/o permisos para este usuario?</p>
              <div className="dialog-buttons">
                <button 
                  className="dialog-button confirm-button"
                  onClick={handleConfirmYes}
                >
                  SI
                </button>
                <button 
                  className="dialog-button cancel-button"
                  onClick={handleConfirmNo}
                >
                  NO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Dialog de éxito */}
      {successDialog && (
        <div className="dialog-overlay">
          <div className="dialog-container">
            <div className="dialog-content">
              <p className="dialog-message">Se ha cambiado el rol y/o permisos del usuario</p>
              <div className="dialog-buttons">
                <button 
                  className="dialog-button accept-button"
                  onClick={handleAcceptSuccess}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ConfigurePermissionsPage;