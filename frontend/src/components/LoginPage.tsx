import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthApiService from '../services/AuthApiService';
import '../styles/LoginPage.css';

// Interfaces para tipado
interface LoginFormData {
  nombre: string;
  cedula: string;
  contrasena: string;
}

interface ErrorState {
  message: string;
  type: 'credentials-error' | 'timeout-error' | 'general-error';
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    nombre: '',
    cedula: '',
    contrasena: ''
  });
  const [error, setError] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/translator');
    }
  }, [isAuthenticated, navigate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Enviar solicitud de inicio de sesión
      await AuthApiService.login(formData);
      
      // En este punto el usuario ha iniciado sesión correctamente
      // Navegar a la página principal
      navigate('/translator', { replace: true });
    } catch (error) {
      if (error instanceof Error) {
        // Determinar el tipo de error para aplicar estilo específico
        if (error.message.includes('intentos fallidos')) {
          setError({
            message: error.message,
            type: 'timeout-error'
          });
        } else if (error.message.includes('Credenciales inválidas')) {
          setError({
            message: 'Credenciales incorrectas. Por favor, verifica tu nombre, cédula y contraseña.',
            type: 'credentials-error'
          });
        } else {
          setError({
            message: error.message,
            type: 'general-error'
          });
        }
      } else {
        setError({
          message: 'Ocurrió un error inesperado durante el inicio de sesión.',
          type: 'general-error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <h1 className="logo">CASSQL</h1>
        <h2 className="login-title">Login</h2>
        <div className="register-prompt">
          <span>¿No tienes una cuenta? </span>
          <Link to="/registro" className="register-link">Regístrate</Link>
        </div>
        {error && (
          <div className={`error-message ${error.type}`}>
            {error.message}
          </div>
        )}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nombre">Nombre de Usuario</label>
            <input
              type="text"
              id="nombre"
              className="form-control"
              value={formData.nombre}
              onChange={handleChange}
              required
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
            />
          </div>
          
          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Iniciando...' : 'Iniciar'}
          </button>
          <div className="forgot-password">
            <Link to="/reset-password">¿Olvidaste tu contraseña?</Link>
          </div>
        </form>
      </div>
      <div className="login-right">
        <img src="/images/CASSQL.png" alt="SQL to CASSANDRA diagram" className="diagram-image" />
      </div>
    </div>
  );
};

export default LoginPage;