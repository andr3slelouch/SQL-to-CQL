// src/pages/GeneratePinPage.tsx
import React, { useState } from 'react';
import AdminLayout from '../components/layouts/AdminLayout';
import ChangePasswordService from '../services/ChangePasswordService';
import '../styles/GeneratePinPage.css';

// Modal types
type ModalType = 'confirmation' | 'success' | 'error' | 'emptyCedula' | null;

interface UserData {
  nombre: string;
  cedula: string;
  rol: string;
}



const GeneratePinPage: React.FC = () => {
  const [searchCedula, setSearchCedula] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [temporaryPin, setTemporaryPin] = useState('');
  const [pinExpiresAt, setPinExpiresAt] = useState<Date | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  
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

  // Handle numeric input only
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setSearchCedula(value);
      setTemporaryPin(''); // Clear PIN when searching new user
      setPinExpiresAt(null);
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchCedula.trim()) {
      showModal('emptyCedula', 'Por favor introduzca una cédula/código');
      return;
    }

    setIsSearching(true);
    setTemporaryPin('');
    setPinExpiresAt(null);
    
    try {
      // Buscar usuario por cédula usando el servicio
      const user = await ChangePasswordService.searchUserByCedula(searchCedula);
      
      if (user) {
        setUserData({
          nombre: user.nombre,
          cedula: user.cedula,
          rol: user.rol
        });
      }
      
    } catch (error: any) {
      console.error('Error buscando usuario:', error);
      
      if (error.message && error.message.includes('no encontrado')) {
        showModal('error', 'No existe usuario con esa cédula/código');
      } else {
        showModal('error', error.message || 'Error al buscar el usuario');
      }
      
      setUserData(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle generate PIN click
  const handleGenerateClick = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData) {
      showModal('error', 'Por favor busque un usuario primero');
      return;
    }
    
    showModal('confirmation', `¿Seguro quiere generar un PIN temporal para el usuario ${userData.nombre}?`);
  };

  // Generate PIN function
  const generatePin = async () => {
    closeModal();
    setIsGenerating(true);
    
    try {
      // Llamar al backend para generar el PIN temporal
      const response = await ChangePasswordService.generateTemporaryPin(userData!.cedula);
      
      setTemporaryPin(response.tempPin);
      setPinExpiresAt(new Date(response.expiresAt));
      
      // Calcular tiempo de expiración para mostrar
      const expiresIn = Math.round((new Date(response.expiresAt).getTime() - new Date().getTime()) / 1000 / 60);
      
      // Show success modal con información de expiración
      showModal('success', `PIN generado exitosamente. Expira en ${expiresIn} minutos.`);
      
    } catch (error: any) {
      console.error('Error generando PIN:', error);
      showModal('error', error.message || 'Error al generar el PIN');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle confirmation modal response
  const handleConfirmation = (confirmed: boolean) => {
    closeModal();
    
    if (confirmed) {
      generatePin();
    }
  };

  // Handle copy to clipboard
  const copyToClipboard = () => {
    if (temporaryPin) {
      navigator.clipboard.writeText(temporaryPin)
        .then(() => {
          setShowCopyTooltip(true);
          
          setTimeout(() => {
            setShowCopyTooltip(false);
          }, 2000);
        })
        .catch(err => {
          console.error('Error al copiar al portapapeles:', err);
          showModal('error', 'Error al copiar el PIN');
        });
    }
  };

  // Handle keypress in search input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Format expiration date
  const formatExpirationDate = (date: Date | null) => {
    if (!date) return '';
    
    const now = new Date();
    const expirationDate = new Date(date);
    
    if (expirationDate < now) {
      return 'Expirado';
    }
    
    const diffMs = expirationDate.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 1000 / 60);
    
    if (diffMins < 1) {
      return 'Expira en menos de 1 minuto';
    }
    
    return `Expira en ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
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
                    onClick={closeModal}
                  >
                    Aceptar
                  </button>
                </div>
              </>
            )}
            
            {(modalType === 'error' || modalType === 'emptyCedula') && (
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

      <div className="generate-pin-container">
        <form onSubmit={handleGenerateClick}>
          {/* Search section */}
          <div className="search-section">
            <label className="search-label">Buscar por Cédula/Código</label>
            <div className="search-input-container">
              <input
                type="text"
                className="search-input"
                placeholder="Ingrese la cédula..."
                value={searchCedula}
                onChange={handleSearchInputChange}
                onKeyPress={handleKeyPress}
                disabled={isSearching || isGenerating}
              />
              <button
                type="button"
                className="search-button"
                onClick={handleSearch}
                disabled={isSearching || isGenerating}
              >
                {isSearching ? (
                  <span className="spinner">⟳</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* User info section */}
          <div className="user-info-row">
            <div className="info-field">
              <label className="info-label">Nombre</label>
              <input
                type="text"
                className="info-input"
                value={userData?.nombre || ''}
                readOnly
                placeholder="Nombre del usuario"
              />
            </div>
            <div className="info-field">
              <label className="info-label">Cédula/Código</label>
              <input
                type="text"
                className="info-input"
                value={userData?.cedula || ''}
                readOnly
                placeholder="Cédula/Código"
              />
            </div>
          </div>

          {/* PIN section */}
          <div className="pin-section">
            <label className="pin-label">PIN Temporal</label>
            <div className="pin-input-container">
              <input
                type="text"
                className="pin-input"
                value={temporaryPin}
                readOnly
                placeholder="PIN generado aparecerá aquí"
              />
              <button
                type="button"
                className="copy-button"
                onClick={copyToClipboard}
                disabled={!temporaryPin}
                title="Copiar PIN"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                  <path d="M9.5 1H8.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708L7.5 7.207 4.646 4.354a.5.5 0 0 1 .708-.708L6.5 4.793V1h-1A1.5 1.5 0 0 0 4 2.5v10A1.5 1.5 0 0 0 5.5 14h5a1.5 1.5 0 0 0 1.5-1.5V2.5A1.5 1.5 0 0 0 10.5 1h-1z"/>
                </svg>
              </button>
              {showCopyTooltip && (
                <div className="copy-tooltip">
                  PIN copiado al portapapeles
                </div>
              )}
            </div>
            {pinExpiresAt && temporaryPin && (
              <div className="pin-expiration">
                {formatExpirationDate(pinExpiresAt)}
              </div>
            )}
          </div>

          {/* Generate button */}
          <div className="button-container">
            <button
              type="submit"
              className="generate-button"
              disabled={!userData || isGenerating}
            >
              {isGenerating ? 'Generando...' : 'Generar'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default GeneratePinPage;