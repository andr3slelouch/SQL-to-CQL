// src/pages/AssignDatabasesPage.tsx
import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/layouts/AdminLayout';
import AssignDatabasesService from '../services/AssingDatabases';
import '../styles/AssignDatabasesPage.css'; // Import the specific CSS file

interface Database {
  id: string;
  name: string;
  active: boolean;
}

interface User {
  nombre: string;
  cedula: string;
  rol: boolean;
  keyspaces?: string[];
}

// Modal types
type ModalType = 'confirmation' | 'success' | 'error' | null;

const AssignDatabasesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalMessage, setModalMessage] = useState('');

  // Load all available keyspaces on component mount
  useEffect(() => {
    // Load all keyspaces from API
    const fetchDatabases = async () => {
      try {
        setLoading(true);
        
        // Call the service to get all keyspaces
        const response = await AssignDatabasesService.getAllKeyspaces();
        
        // Map the keyspaces to the format expected by the component
        const keyspacesData = response.allKeyspaces.map((keyspace: string) => ({
          id: keyspace,
          name: keyspace,
          active: false
        }));
        
        setDatabases(keyspacesData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching keyspaces:', error);
        showModal('error', 'Error al cargar las bases de datos');
        setLoading(false);
      }
    };

    fetchDatabases();
  }, []);

  // Show modal helper function
  const showModal = (type: ModalType, message: string) => {
    setModalType(type);
    setModalMessage(message);
    setModalOpen(true);
  };

  // Close modal helper function
  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setModalMessage('');
  };

  // Handle numeric input only for the search field
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setSearchQuery(value);
    }
  };

  // Handle search button click
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showModal('error', 'Por favor introduzca una cédula/código');
      return;
    }

    setLoading(true);
    
    try {
      // Call the service to get user keyspaces
      const response = await AssignDatabasesService.getUserKeyspaces(searchQuery);
      
      // Extract user data
      const userData = {
        nombre: response.nombre,
        cedula: response.cedula,
        rol: response.rol,
        keyspaces: response.keyspaces || []
      };
      
      setUser(userData);
      
      // Update the active state of databases
      // If the user is admin, activate all databases
      if (userData.rol === true) {
        setDatabases(prevDatabases => 
          prevDatabases.map(db => ({
            ...db,
            active: true // Set all databases to active for admin
          }))
        );
      } else {
        // For regular users, only activate those in their keyspaces
        setDatabases(prevDatabases => 
          prevDatabases.map(db => ({
            ...db,
            active: userData.keyspaces?.includes(db.id) || false
          }))
        );
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error searching for user:', error);
      
      // Handle specific error cases
      if (error.message && error.message.includes('No se encontró un usuario')) {
        showModal('error', 'No existe usuario');
      } else {
        showModal('error', 'Error al buscar el usuario');
      }
      
      setLoading(false);
    }
  };

  // Handle database toggle
  const handleToggleDatabase = (id: string) => {
    // Only allow toggling if user is not admin
    if (user && !user.rol) {
      setDatabases(prevDatabases =>
        prevDatabases.map(db =>
          db.id === id ? { ...db, active: !db.active } : db
        )
      );
    }
  };

  // Handle save button click - now shows confirmation modal
  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!user) {
      showModal('error', 'Por favor busque un usuario primero');
      return;
    }
    
    showModal('confirmation', '¿Seguro desea asignar las bases de datos a este usuario?');
  };

  // Handle actual form submission - called after confirmation
  const handleSubmit = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Get the IDs of active databases
      const activeKeyspaces = databases
        .filter(db => db.active)
        .map(db => db.id);
      
      // Send the data using the service
      await AssignDatabasesService.updateUserKeyspaces(user.cedula, activeKeyspaces);
      
      setSaving(false);
      
      // Show success modal
      showModal('success', 'Se han agregado las bases al usuario');
    } catch (error) {
      console.error('Error assigning databases:', error);
      setSaving(false);
      showModal('error', 'Error al asignar las bases de datos');
    }
  };

  // Handle confirmation modal response
  const handleConfirmation = (confirmed: boolean) => {
    closeModal();
    
    if (confirmed) {
      handleSubmit();
    }
  };

  // Handle success modal acceptance
  const handleSuccessAccept = () => {
    closeModal();
    // Here you can add any additional actions after success, like resetting the form
  };

  // Handle keypress in search input to submit on Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Format the role for display
  const formatRole = (rol: boolean | undefined) => {
    if (rol === undefined) return '';
    return rol === true ? 'Administrador' : 'Usuario Común';
  };

  return (
    <AdminLayout>
      {/* Modal component */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            {modalType === 'confirmation' && (
              <div className="modal-content">
                <p className="modal-message">{modalMessage}</p>
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
              </div>
            )}
            
            {modalType === 'success' && (
              <div className="modal-content">
                <p className="modal-message">{modalMessage}</p>
                <div className="modal-buttons">
                  <button 
                    className="modal-button aceptar-button"
                    onClick={handleSuccessAccept}
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            )}
            
            {modalType === 'error' && (
              <div className="modal-content">
                <p className="modal-message">{modalMessage}</p>
                <div className="modal-buttons">
                  <button 
                    className="modal-button aceptar-button"
                    onClick={closeModal}
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="admin-panel assign-databases-container">
        {/* Search section */}
        <div className="admin-form-group search-section">
          <label htmlFor="search" className="admin-label">Buscar por Cédula/Código</label>
          <div className="search-input-container">
            <input
              type="text"
              id="search"
              className="admin-input"
              placeholder="Ingrese la cédula a buscar..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <button
              type="button"
              className="admin-button search-button"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <span className="loading-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16" className="spin">
                    <path d="M8 0c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8h-2c0 3.314-2.686 6-6 6s-6-2.686-6-6 2.686-6 6-6v2l3-3-3-3v2z"/>
                  </svg>
                </span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                  fill="white" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        <form>
          {/* User info section - always visible */}
          <div className="admin-form-row user-info-section">
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label htmlFor="nombre" className="admin-label">Nombre</label>
                <input
                  type="text"
                  id="nombre"
                  className="admin-input"
                  value={user?.nombre || ''}
                  readOnly
                  placeholder="Nombre del usuario"
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
                  value={user?.cedula || ''}
                  readOnly
                  placeholder="Cédula/Código"
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
                  value={formatRole(user?.rol)}
                  readOnly
                  placeholder="Rol del usuario"
                />
              </div>
            </div>
          </div>
          
          {/* Databases section - always visible */}
          <div className="databases-section">
            <h3 className="databases-title">Bases de Datos Disponibles</h3>
            
            {loading && !databases.length ? (
              <div className="loading-message">Cargando bases de datos...</div>
            ) : (
              <div className="databases-list">
                {databases.map(db => (
                  <div key={db.id} className="database-item">
                    <span className="database-name">{db.name}</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={db.active}
                        onChange={() => handleToggleDatabase(db.id)}
                        disabled={loading || saving || !user || (user.rol === true)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))}
              </div>
            )}
            
            {/* Save button - enabled for all users, including admins */}
            <div className="button-container">
              <button
                type="button"
                className="save-button"
                onClick={handleSaveClick}
                disabled={loading || saving || !user}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
            
            {!user && databases.length > 0 && (
              <div className="user-instruction-message">
                Busque un usuario para asignar bases de datos
              </div>
            )}

            {user?.rol === true && (
              <div className="user-instruction-message">
                Este usuario es administrador y tiene acceso a todas las bases de datos.
                Puede guardar para actualizar las bases a las que tiene acceso.
              </div>
            )}
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AssignDatabasesPage;