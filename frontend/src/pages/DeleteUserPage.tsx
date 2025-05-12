// src/pages/DeleteUserPage.tsx
import React, { useState } from 'react';
import AdminLayout from '../components/layouts/AdminLayout';
import DeleteUserService from '../services/DeleteUserService';
import '../styles/DeleteUserPage.css';

// Modal types
type ModalType = 'confirmation' | 'success' | 'error' | null;

interface UserData {
  nombre: string;
  cedula: string;
  rol: string;
  estado: boolean;
}

const DeleteUserPage: React.FC = () => {
  const [searchCedula, setSearchCedula] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
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

  // Handle numeric input only for the search field
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setSearchCedula(value);
    }
  };

  // Handle search button click
  const handleSearch = async () => {
    if (!searchCedula.trim()) {
      showModal('error', 'Por favor introduzca una cédula/código');
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      const response = await DeleteUserService.searchUserByCedula(searchCedula);
      
      setUserData({
        nombre: response.nombre,
        cedula: response.cedula,
        rol: response.rol ? 'Administrador' : 'Usuario Común',
        estado: response.estado
      });
      
    } catch (error: any) {
      console.error('Error buscando usuario:', error);
      
      if (error.message && error.message.includes('No se encontró un usuario')) {
        showModal('error', 'No existe usuario con esa cédula/código');
      } else {
        showModal('error', 'Error al buscar el usuario');
      }
      
      setUserData(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle delete button click - show confirmation modal
  const handleDeleteClick = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData) {
      showModal('error', 'Por favor busque un usuario primero');
      return;
    }
    
    showModal('confirmation', `¿Está seguro que desea eliminar al usuario ${userData.nombre}?`);
  };

  // Handle actual user deletion - called after confirmation
  const handleDelete = async () => {
    if (!userData) return;
    
    setIsDeleting(true);
    closeModal();
    
    try {
      await DeleteUserService.deleteUser(userData.cedula);
      
      // Show success modal
      showModal('success', 'Usuario eliminado exitosamente');
      
      // Clear the form
      setUserData(null);
      setSearchCedula('');
      
    } catch (error: any) {
      console.error('Error eliminando usuario:', error);
      showModal('error', error.message || 'Error al eliminar el usuario');
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
              </>
            )}
            
            {modalType === 'success' && (
              <>
                <p className="modal-message">{modalMessage}</p>
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

      <div className="admin-panel delete-user-container">
        {/* Search section */}
        <div className="admin-form-group search-section">
          <label htmlFor="search" className="admin-label">Buscar por Cédula/Código</label>
          <div className="search-input-container">
            <input
              type="text"
              id="search"
              className="admin-input"
              placeholder="Ingrese la cédula a buscar..."
              value={searchCedula}
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16" className="spin">
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
          {/* User info section */}
          <div className="admin-form-row user-info-section">
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label htmlFor="nombre" className="admin-label">Nombre</label>
                <input
                  type="text"
                  id="nombre"
                  className="admin-input"
                  value={userData?.nombre || ''}
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
                  value={userData?.cedula || ''}
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
                  value={userData?.rol || ''}
                  readOnly
                  placeholder="Rol del usuario"
                />
              </div>
            </div>
          </div>
          
          {/* Delete button */}
          <div className="button-container">
            <button
              type="submit"
              className="admin-button delete-button"
              disabled={!userData || isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
          
          {!userData && searchCedula && !isSearching && (
            <div className="user-instruction-message">
              Busque un usuario para eliminar
            </div>
          )}
        </form>
      </div>
    </AdminLayout>
  );
};

export default DeleteUserPage;