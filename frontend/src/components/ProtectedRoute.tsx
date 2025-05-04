// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ redirectPath = '/' }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  
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
  
  // Control de acceso basado en rol
  // Verificar si es una ruta de administrador
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Determinar si el usuario es administrador basado en el valor booleano de user.rol
  const isAdmin = user?.rol === true;
  
  // Si es una ruta de admin y el usuario no es admin, redirigir a su página correspondiente
  if (isAdminRoute && !isAdmin) {
    // Redirigir a la versión no-admin si existe, o al traductor por defecto
    if (location.pathname === '/admin/translator') {
      return <Navigate to="/translator" replace />;
    }
    
    // Para cualquier otra ruta de admin, redirigir al traductor normal
    return <Navigate to="/translator" replace />;
  }
  
  // Si es un usuario normal intentando acceder al traductor regular, está bien
  // Pero si es un admin intentando acceder al traductor regular, redirigirlo al traductor de admin
  if (location.pathname === '/translator' && isAdmin) {
    return <Navigate to="/admin/translator" replace />;
  }
  
  // Renderizar las rutas anidadas si está autenticado y tiene los permisos correctos
  return <Outlet />;
};

export default ProtectedRoute;