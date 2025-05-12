// src/components/CambioContrasena.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CambioContrasena.css';

// Interfaces para tipado
interface PasswordResetFormData {
  nombre: string;
  cedula: string;
  pin: string;
}

interface PasswordChangeFormData {
  nuevaContrasena: string;
  repetirContrasena: string;
}

interface ErrorState {
  message: string;
  type: 'validation-error' | 'credentials-error' | 'general-error';
}

type ModalType = 'pin' | 'success' | null;

const CambioContrasena: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [formDataStep1, setFormDataStep1] = useState<PasswordResetFormData>({
    nombre: '',
    cedula: '',
    pin: ''
  });
  const [formDataStep2, setFormDataStep2] = useState<PasswordChangeFormData>({
    nuevaContrasena: '',
    repetirContrasena: ''
  });
  const [error, setError] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [temporaryPin, setTemporaryPin] = useState<string>('');

  const handleStep1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormDataStep1(prevState => ({
      ...prevState,
      [id]: value
    }));
    
    if (error) {
      setError(null);
    }
  };

  const handleStep2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormDataStep2(prevState => ({
      ...prevState,
      [id]: value
    }));
    
    if (error) {
      setError(null);
    }
  };

  const validateStep1 = (): boolean => {
    if (!formDataStep1.nombre || !formDataStep1.cedula || !formDataStep1.pin) {
      setError({
        message: 'Todos los campos son obligatorios',
        type: 'validation-error'
      });
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formDataStep2.nuevaContrasena || !formDataStep2.repetirContrasena) {
      setError({
        message: 'Todos los campos son obligatorios',
        type: 'validation-error'
      });
      return false;
    }

    if (formDataStep2.nuevaContrasena !== formDataStep2.repetirContrasena) {
      setError({
        message: 'Las contraseñas no coinciden',
        type: 'validation-error'
      });
      return false;
    }

    if (formDataStep2.nuevaContrasena.length < 6) {
      setError({
        message: 'La contraseña debe tener al menos 6 caracteres',
        type: 'validation-error'
      });
      return false;
    }

    return true;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep1()) {
      return;
    }

    setIsLoading(true);
    setError(null);
  
    try {
      // TODO: Aquí irá la verificación del PIN con la API
      // Simulación de llamada al API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulación: verificar si es un PIN temporal del admin o PIN del usuario
      const isTemporaryPin = formDataStep1.pin.startsWith('TEMP'); // Lógica de ejemplo
      
      if (isTemporaryPin) {
        // Si es temporal, mostrar el modal con el PIN y luego continuar
        const newPin = Math.random().toString(36).substr(2, 7).toUpperCase();
        setTemporaryPin(newPin);
        setModalType('pin');
      } else {
        // Si es PIN del usuario, ir directamente al paso 2
        setStep(2);
      }
      
    } catch (error) {
      setError({
        message: 'Credenciales incorrectas. Verifique sus datos.',
        type: 'credentials-error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep2()) {
      return;
    }

    setIsLoading(true);
    setError(null);
  
    try {
      // TODO: Aquí irá la actualización de la contraseña con la API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mostrar modal de éxito
      setModalType('success');
      
    } catch (error) {
      setError({
        message: 'Error al cambiar la contraseña. Intente nuevamente.',
        type: 'general-error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinModalAccept = () => {
    setModalType(null);
    setStep(2);
  };

  const handleSuccessModalAccept = () => {
    setModalType(null);
    navigate('/');
  };

  const renderModal = () => {
    if (!modalType) return null;

    if (modalType === 'pin') {
      return (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">PIN</h2>
            <p className="pin-display">{temporaryPin}</p>
            <p className="modal-instruction">Guarde este PIN, será usado para el cambio de contraseña</p>
            <button 
              className="modal-button"
              onClick={handlePinModalAccept}
            >
              Aceptar
            </button>
          </div>
        </div>
      );
    }

    if (modalType === 'success') {
      return (
        <div className="modal-overlay">
          <div className="modal-content">
            <p className="modal-message">Cambio de contraseña exitoso</p>
            <button 
              className="modal-button"
              onClick={handleSuccessModalAccept}
            >
              Aceptar
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="cambio-contrasena-container">
      {renderModal()}

      <div className="cambio-contrasena-card">
        <h2 className="cambio-contrasena-title">Cambio de Contraseña</h2>
        
        {error && (
          <div className={`error-message ${error.type}`}>
            {error.message}
          </div>
        )}
        
        {step === 1 ? (
          <form className="cambio-contrasena-form" onSubmit={handleStep1Submit}>
            <div className="form-group">
              <label htmlFor="nombre">Nombre de Usuario</label>
              <input
                type="text"
                id="nombre"
                className="form-control"
                value={formDataStep1.nombre}
                onChange={handleStep1Change}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="cedula">Cédula/Código</label>
              <input
                type="text"
                id="cedula"
                className="form-control"
                value={formDataStep1.cedula}
                onChange={handleStep1Change}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="pin">PIN</label>
              <input
                type="password"
                id="pin"
                className="form-control"
                value={formDataStep1.pin}
                onChange={handleStep1Change}
                required
                disabled={isLoading}
              />
            </div>
            
            <button 
              type="submit" 
              className="cambio-contrasena-button"
              disabled={isLoading}
            >
              {isLoading ? 'Verificando...' : 'Continuar'}
            </button>
          </form>
        ) : (
          <form className="cambio-contrasena-form" onSubmit={handleStep2Submit}>
            <div className="form-group">
              <label htmlFor="nuevaContrasena">Nueva Contraseña</label>
              <input
                type="password"
                id="nuevaContrasena"
                className="form-control"
                value={formDataStep2.nuevaContrasena}
                onChange={handleStep2Change}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="repetirContrasena">Repita la Contraseña</label>
              <input
                type="password"
                id="repetirContrasena"
                className="form-control"
                value={formDataStep2.repetirContrasena}
                onChange={handleStep2Change}
                required
                disabled={isLoading}
              />
            </div>
            
            <button 
              type="submit" 
              className="cambio-contrasena-button"
              disabled={isLoading}
            >
              {isLoading ? 'Cambiando...' : 'Cambiar'}
            </button>
          </form>
        )}
        
        {step === 1 && (
          <div className="info-text">
            Si olvidó su PIN contáctese con un Administrador
          </div>
        )}
      </div>
    </div>
  );
};

export default CambioContrasena;