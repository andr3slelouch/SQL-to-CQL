// src/components/Registro.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RegistroService from '../services/RegistroService';
import '../styles/Registro.css';

// Interfaces para tipado
interface RegistroFormData {
  cedula: string;
  name: string;
  password: string;
  confirmPassword: string;
}

interface ErrorState {
  message: string;
  type: 'validation-error' | 'server-error';
}

interface DuplicateModalProps {
  onClose: () => void;
}

// Componente Modal para cédula duplicada
const DuplicateModal: React.FC<DuplicateModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay duplicate-modal">
      <div className="modal-content">
        <h2 className="modal-title">Error</h2>
        <p className="modal-message">
          No se puede crear el usuario con la información ingresada
        </p>
        <div className="modal-instruction">
          La cédula/código ingresado ya existe en el sistema. Por favor, utilice otra cédula o contacte al administrador.
        </div>
        <button className="modal-button" onClick={onClose}>
          Entendido
        </button>
      </div>
    </div>
  );
};

// Componente Modal para PIN generado
const PinModal: React.FC<{ nombre: string; pin: string; onClose: () => void }> = ({ 
  nombre, 
  pin, 
  onClose 
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Registro Exitoso</h2>
        <p className="modal-message">
          ¡Bienvenido, {nombre}!
        </p>
        <p className="modal-message">
          Su PIN de acceso es:
        </p>
        <div className="pin-display">{pin}</div>
        <p className="modal-instruction">
          Guarde este PIN en un lugar seguro. Lo necesitará para recuperar su cuenta.
        </p>
        <button className="modal-button" onClick={onClose}>
          Ir a Iniciar Sesión
        </button>
      </div>
    </div>
  );
};

const Registro: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegistroFormData>({
    cedula: '',
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false);
  const [registroExitoso, setRegistroExitoso] = useState<{
    nombre: string;
    pin: string;
  } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [id]: value
    }));
    
    // Limpiar mensaje de error al modificar algún campo
    if (error) {
      setError(null);
    }
  };

  const validateForm = (): boolean => {
    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      setError({
        message: 'Las contraseñas no coinciden',
        type: 'validation-error'
      });
      return false;
    }

    // Validar longitud mínima de contraseña (6 caracteres según el DTO)
    if (formData.password.length < 6) {
      setError({
        message: 'La contraseña debe tener al menos 6 caracteres',
        type: 'validation-error'
      });
      return false;
    }

    // Validar que los campos no estén vacíos
    if (!formData.cedula.trim()) {
      setError({
        message: 'La cédula es requerida',
        type: 'validation-error'
      });
      return false;
    }

    if (!formData.name.trim()) {
      setError({
        message: 'El nombre es requerido',
        type: 'validation-error'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar el formulario antes de enviar
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
  
    try {
      // Preparar los datos para enviar al servicio
      const userData = {
        cedula: formData.cedula,
        name: formData.name,
        password: formData.password
      };
      
      // Llamar al servicio para crear el usuario
      const response = await RegistroService.createUser(userData);
      
      // Registro exitoso
      setRegistroExitoso({
        nombre: response.nombre,
        pin: response.pin
      });
      
      // Mostrar modal con el PIN
      setShowPinModal(true);
      
      // Limpiar el formulario
      setFormData({
        cedula: '',
        name: '',
        password: '',
        confirmPassword: ''
      });
      
    } catch (error) {
      if (error instanceof Error) {
        // Verificar si es un error de cédula duplicada
        if (error.message.includes('Ya existe un usuario') || 
            error.message.includes('No se puede crear el usuario')) {
          // Mostrar modal de cédula duplicada
          setShowDuplicateModal(true);
        } else {
          // Otro tipo de error
          setError({
            message: error.message,
            type: 'server-error'
          });
        }
      } else {
        setError({
          message: 'Ocurrió un error inesperado durante el registro.',
          type: 'server-error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Función para ir a la página de login después de cerrar el modal de PIN
  const goToLogin = () => {
    navigate('/login');
  };

  // Función para cerrar el modal de PIN
  const handlePinModalClose = () => {
    setShowPinModal(false);
    goToLogin();
  };

  // Función para cerrar el modal de cédula duplicada
  const handleDuplicateModalClose = () => {
    setShowDuplicateModal(false);
  };

  return (
    <div className="registro-container">
      <div className="registro-card">
        <h1 className="registro-title">Registro de Usuario</h1>
        
        {error && (
          <div className={`error-message ${error.type}`}>
            {error.message}
          </div>
        )}
        
        <form className="registro-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="cedula">Cédula/Código</label>
            <input
              type="text"
              id="cedula"
              className="form-control"
              value={formData.cedula}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="name">Nombre Completo</label>
            <input
              type="text"
              id="name"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              className="form-control"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            className="registro-button"
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : 'Registrarse'}
          </button>
        </form>
        
        <div className="login-link-container">
          ¿Ya tiene una cuenta? <Link to="/login" className="login-link">Iniciar Sesión</Link>
        </div>
      </div>
      
      {/* Modal para PIN generado */}
      {showPinModal && registroExitoso && (
        <PinModal
          nombre={registroExitoso.nombre}
          pin={registroExitoso.pin}
          onClose={handlePinModalClose}
        />
      )}
      
      {/* Modal para cédula duplicada */}
      {showDuplicateModal && (
        <DuplicateModal
          onClose={handleDuplicateModalClose}
        />
      )}
    </div>
  );
};

export default Registro;