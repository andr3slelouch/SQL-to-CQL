// src/components/Registro.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RegistroService from '../services/RegistroService';
import '../styles/Registro.css';

// Interfaces para tipado
interface RegistroFormData {
  nombre: string;
  cedula: string;
  contrasena: string;
  repetirContrasena: string;
}

interface ErrorState {
  message: string;
  type: 'validation-error' | 'server-error' | 'general-error';
}

const Registro: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegistroFormData>({
    nombre: '',
    cedula: '',
    contrasena: '',
    repetirContrasena: ''
  });
  const [error, setError] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [pin, setPin] = useState<string>('');

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
    if (!formData.nombre || !formData.cedula || !formData.contrasena || !formData.repetirContrasena) {
      setError({
        message: 'Todos los campos son obligatorios',
        type: 'validation-error'
      });
      return false;
    }

    if (formData.contrasena !== formData.repetirContrasena) {
      setError({
        message: 'Las contraseñas no coinciden',
        type: 'validation-error'
      });
      return false;
    }

    if (formData.contrasena.length < 6) {
      setError({
        message: 'La contraseña debe tener al menos 6 caracteres',
        type: 'validation-error'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);
  
    try {
      // Llamada real al API usando UserService
      const response = await RegistroService.createUser({
        cedula: formData.cedula,
        name: formData.nombre,
        password: formData.contrasena
      });
      
      // Establecer el PIN recibido del servidor
      setPin(response.pin);
      setShowSuccessModal(true);
      
    } catch (error) {
      if (error instanceof Error) {
        // Manejar errores específicos del servidor
        if (error.message.includes('cédula ya existe')) {
          setError({
            message: 'Ya existe un usuario con esta cédula',
            type: 'server-error'
          });
        } else if (error.message.includes('Error de conexión')) {
          setError({
            message: 'Error de conexión con el servidor. Por favor, intente más tarde.',
            type: 'server-error'
          });
        } else {
          setError({
            message: error.message,
            type: 'server-error'
          });
        }
      } else {
        setError({
          message: 'Ocurrió un error inesperado durante el registro.',
          type: 'general-error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptPin = () => {
    setShowSuccessModal(false);
    navigate('/');
  };

  return (
    <div className="registro-container">
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">PIN</h2>
            <p className="pin-display">{pin}</p>
            <p className="modal-message">Registro Exitoso</p>
            <p className="modal-instruction">Guarde este PIN, será usado para el cambio de contraseña</p>
            <button 
              className="modal-button"
              onClick={handleAcceptPin}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      <div className="registro-card">
        <h2 className="registro-title">Registro</h2>
        
        {error && (
          <div className={`error-message ${error.type}`}>
            {error.message}
          </div>
        )}
        
        <form className="registro-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nombre">Nombre de Usuario</label>
            <input
              type="text"
              id="nombre"
              className="form-control"
              value={formData.nombre}
              onChange={handleChange}
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
              value={formData.cedula}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              type="password"
              id="contrasena"
              className="form-control"
              value={formData.contrasena}
              onChange={handleChange}
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
              value={formData.repetirContrasena}
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
            {isLoading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
        
        <div className="login-link-container">
          <span>¿Ya tienes una cuenta? </span>
          <Link to="/" className="login-link">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
};

export default Registro;