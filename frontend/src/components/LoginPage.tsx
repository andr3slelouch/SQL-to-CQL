// src/components/LoginPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/LoginPage.css';

const LoginPage: React.FC = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica de autenticación
    // Para nuestra demo, simplemente redirigimos al usuario a la página del traductor
    window.location.href = '/translator';
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
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario</label>
            <input 
              type="text" 
              id="username" 
              className="form-control" 
              placeholder="" 
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="cedula">Cédula/Código</label>
            <input 
              type="text" 
              id="cedula" 
              className="form-control" 
              placeholder="" 
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input 
              type="password" 
              id="password" 
              className="form-control" 
              placeholder="" 
              required
            />
          </div>
          
          <button type="submit" className="login-button">Iniciar</button>
          
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