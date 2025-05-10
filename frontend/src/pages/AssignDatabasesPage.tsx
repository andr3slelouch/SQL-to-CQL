// src/pages/AssignDatabasesPage.tsx
import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/layouts/AdminLayout';
import '../styles/AssignDatabasesPage.css'; // Import the specific CSS file

interface Database {
  id: number;
  name: string;
  active: boolean;
}

interface User {
  nombre: string;
  cedula: string;
  rol: string;
  databases?: number[]; // IDs of databases the user has access to
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

  // Simulate loading databases from an API
  useEffect(() => {
    // In a real application, this would be an API call
    const fetchDatabases = async () => {
      try {
        setLoading(true);
        
        // Simulate API request delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock database data
        const mockDatabases = [
          { id: 1, name: 'Nombre Base de Datos 1', active: false },
          { id: 2, name: 'Nombre Base de Datos 2', active: false },
          { id: 3, name: 'Nombre Base de Datos N', active: false }
        ];
        
        setDatabases(mockDatabases);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching databases:', error);
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
      // Simulate API request
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock user data - in a real app, this would come from your API
      // For demonstration, let's simulate user not found when searchQuery is "9999"
      if (searchQuery === '9999') {
        setLoading(false);
        showModal('error', 'No existe usuario');
        return;
      }
      
      const mockUser: User = {
        nombre: 'Usuario Ejemplo',
        cedula: searchQuery,
        rol: 'Administrador',
        databases: [1, 3] // IDs of databases the user has access to
      };
      
      setUser(mockUser);
      
      // Update the active state of databases based on user permissions
      setDatabases(prevDatabases => 
        prevDatabases.map(db => ({
          ...db,
          active: mockUser.databases?.includes(db.id) || false
        }))
      );
      
      setLoading(false);
    } catch (error) {
      console.error('Error searching for user:', error);
      showModal('error', 'Error al buscar el usuario');
      setLoading(false);
    }
  };

  // Handle database toggle
  const handleToggleDatabase = (id: number) => {
    setDatabases(prevDatabases =>
      prevDatabases.map(db =>
        db.id === id ? { ...db, active: !db.active } : db
      )
    );
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
      const activeDatabaseIds = databases
        .filter(db => db.active)
        .map(db => db.id);
      
      // In a real app, you would send this data to your API
      console.log('User ID:', user.cedula);
      console.log('Assigned databases:', activeDatabaseIds);
      
      // Simulate API request
      await new Promise(resolve => setTimeout(resolve, 800));
      
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
                  value={user?.rol || ''}
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
                        disabled={loading || saving || !user}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))}
              </div>
            )}
            
            {/* Save button - only enabled when a user is selected and not in search/save mode */}
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
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AssignDatabasesPage;