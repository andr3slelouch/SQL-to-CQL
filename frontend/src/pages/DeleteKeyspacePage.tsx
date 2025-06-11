// src/pages/DeleteKeyspacePage.tsx
import React, { useState } from 'react';
import AdminLayout from '../components/layouts/AdminLayout';
import DeleteKeyspaceService, { KeyspaceSearchResponse, DeleteKeyspaceResponse } from '../services/DeleteKeyspaceService';
import '../styles/DeleteKeyspacePage.css';

// Modal types
type ModalType = 'confirmation' | 'success' | 'error' | null;

interface KeyspaceData {
  keyspace: string;
  tables: string[];
  usersWithAccess: Array<{
    cedula: string;
    nombre: string;
    rol: boolean;
  }>;
}

const DeleteKeyspacePage: React.FC = () => {
  const [searchKeyspace, setSearchKeyspace] = useState('');
  const [keyspaceData, setKeyspaceData] = useState<KeyspaceData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalMessage, setModalMessage] = useState('');

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

  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir letras, números, guiones bajos y guiones
    if (value === '' || /^[a-zA-Z0-9_-]+$/.test(value)) {
      setSearchKeyspace(value);
    }
  };

  // Handle search button click
  const handleSearch = async () => {
    if (!searchKeyspace.trim()) {
      showModal('error', 'Por favor introduzca el nombre de la base de datos');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await DeleteKeyspaceService.searchKeyspace(searchKeyspace);
      
      if (response.exists && response.keyspace && response.tables && response.usersWithAccess) {
        setKeyspaceData({
          keyspace: response.keyspace,
          tables: response.tables,
          usersWithAccess: response.usersWithAccess
        });
      } else {
        showModal('error', 'No existe una base de datos con ese nombre');
        setKeyspaceData(null);
      }
    } catch (error: any) {
      console.error('Error buscando keyspace:', error);
      if (error.message && error.message.includes('no existe')) {
        showModal('error', 'No existe una base de datos con ese nombre');
      } else {
        showModal('error', 'Error al buscar la base de datos');
      }
      setKeyspaceData(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle delete button click - show confirmation modal
  const handleDeleteClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyspaceData) {
      showModal('error', 'Por favor busque una base de datos primero');
      return;
    }

    const usersCount = keyspaceData.usersWithAccess.length;
    const tablesCount = keyspaceData.tables.length;
    
    let confirmationMessage = `¿Está seguro que desea eliminar la base de datos "${keyspaceData.keyspace}"?\n\n`;
    confirmationMessage += `Esta acción eliminará:\n`;
    confirmationMessage += `• ${tablesCount} tabla${tablesCount !== 1 ? 's' : ''}\n`;
    confirmationMessage += `• Permisos de ${usersCount} usuario${usersCount !== 1 ? 's' : ''}\n\n`;
    confirmationMessage += `Esta operación es IRREVERSIBLE.`;

    showModal('confirmation', confirmationMessage);
  };

  // Handle actual keyspace deletion - called after confirmation
  const handleDelete = async () => {
    if (!keyspaceData) return;

    setIsDeleting(true);
    closeModal();

    try {
      const response = await DeleteKeyspaceService.deleteKeyspace(keyspaceData.keyspace, true);
      
      // Show success modal with details
      const successMessage = `Base de datos "${response.keyspace}" eliminada exitosamente.\n\n` +
        `Se removieron los permisos de ${response.affectedUsers.filter(u => u.removedKeyspace).length} usuarios.`;
      
      showModal('success', successMessage);
      
      // Clear the form
      setKeyspaceData(null);
      setSearchKeyspace('');
    } catch (error: any) {
      console.error('Error eliminando keyspace:', error);
      showModal('error', error.message || 'Error al eliminar la base de datos');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle confirmation modal response
  const handleConfirmation = (confirmed: boolean) => {
    closeModal();
    if (confirmed) {
      handleDelete();
    }
  };

  // Handle success modal accept
  const handleSuccessAccept = () => {
    closeModal();
  };

  // Handle keypress in search input
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
              <>
                <p className="modal-message" style={{ whiteSpace: 'pre-line' }}>
                  {modalMessage}
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
            {modalType === 'success' && (
              <>
                <p className="modal-message" style={{ whiteSpace: 'pre-line' }}>
                  {modalMessage}
                </p>
                <div className="modal-buttons">
                  <button
                    className="modal-button aceptar-button"
                    onClick={handleSuccessAccept}
                  >
                    Aceptar
                  </button>
                </div>
              </>
            )}
            {modalType === 'error' && (
              <>
                <p className="modal-message">{modalMessage}</p>
                <div className="modal-buttons">
                  <button
                    className="modal-button aceptar-button"
                    onClick={closeModal}
                  >
                    Aceptar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="admin-panel delete-keyspace-container">
        {/* Search section */}
        <div className="admin-form-group search-section">
          <label htmlFor="search" className="admin-label">Buscar Base de Datos</label>
          <div className="search-input-container">
            <input
              type="text"
              id="search"
              className="admin-input"
              placeholder="Ingrese el nombre de la base de datos..."
              value={searchKeyspace}
              onChange={handleSearchInputChange}
              onKeyPress={handleKeyPress}
              disabled={isSearching || isDeleting}
            />
            <button
              type="button"
              className="admin-button search-button"
              onClick={handleSearch}
              disabled={isSearching || isDeleting}
            >
              {isSearching ? (
                <span className="loading-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white"
                    viewBox="0 0 16 16" className="spin">
                    <path d="M8 0c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8h-2c0 3.314-2.686 6-6 6s-6-2.686-6-6 2.686-6 6-6v2l3-3-3-3v2z"/>
                  </svg>
                </span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                  fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        <form onSubmit={handleDeleteClick}>
          {/* Keyspace info section */}
          <div className="admin-form-row keyspace-info-section">
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label htmlFor="keyspace" className="admin-label">Nombre de la Base de Datos</label>
                <input
                  type="text"
                  id="keyspace"
                  className="admin-input"
                  value={keyspaceData?.keyspace || ''}
                  readOnly
                  placeholder="Nombre de la base de datos"
                />
              </div>
            </div>
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label htmlFor="tables" className="admin-label">Número de Tablas</label>
                <input
                  type="text"
                  id="tables"
                  className="admin-input"
                  value={keyspaceData ? `${keyspaceData.tables.length} tabla${keyspaceData.tables.length !== 1 ? 's' : ''}` : ''}
                  readOnly
                  placeholder="Número de tablas"
                />
              </div>
            </div>
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label htmlFor="users" className="admin-label">Usuarios con Acceso</label>
                <input
                  type="text"
                  id="users"
                  className="admin-input"
                  value={keyspaceData ? `${keyspaceData.usersWithAccess.length} usuario${keyspaceData.usersWithAccess.length !== 1 ? 's' : ''}` : ''}
                  readOnly
                  placeholder="Usuarios con acceso"
                />
              </div>
            </div>
          </div>

          {/* Users list section */}
          {keyspaceData && keyspaceData.usersWithAccess.length > 0 && (
            <div className="admin-form-group users-list-section">
              <label className="admin-label">Usuarios que perderán acceso:</label>
              <div className="users-list">
                {keyspaceData.usersWithAccess.map((user, index) => (
                  <div key={index} className="user-item">
                    <span className="user-name">{user.nombre}</span>
                    <span className="user-cedula">({user.cedula})</span>
                    <span className={`user-role ${user.rol ? 'admin' : 'regular'}`}>
                      {user.rol ? 'Admin' : 'Usuario'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete button */}
          <div className="button-container">
            <button
              type="submit"
              className="admin-button delete-button"
              disabled={!keyspaceData || isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar Base de Datos'}
            </button>
          </div>

          {!keyspaceData && searchKeyspace && !isSearching && (
            <div className="keyspace-instruction-message">
              Busque una base de datos para eliminar
            </div>
          )}
        </form>
      </div>
    </AdminLayout>
  );
};

export default DeleteKeyspacePage;