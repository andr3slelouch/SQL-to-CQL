// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ redirectPath = '/' }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Mostrar un indicador de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verificando autenticación...</p>
      </div>
    );
  }
  
  // Redirigir si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }
  
  // Renderizar las rutas anidadas si está autenticado
  return <Outlet />;
};

export default ProtectedRoute;