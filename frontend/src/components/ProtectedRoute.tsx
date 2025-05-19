// src/components/ProtectedRoute.tsx
import React, { useEffect, useState, memo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  redirectPath?: string;
}

// Componente que solo muestra un indicador de carga
const LoadingIndicator = memo(() => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>Verificando autenticación...</p>
  </div>
));

// Componente que maneja la redirección y fuerza recarga para rutas admin
const RedirectComponent = memo(({ to }: { to: string }) => {
  const isAdminRoute = to.startsWith('/admin/');
  
  useEffect(() => {
    // Si estamos redirigiendo a una ruta de admin, verificar si debemos recargar
    if (isAdminRoute) {
      // Guardar la URL de destino en sessionStorage
      sessionStorage.setItem('adminRedirectTo', to);
      
      // Forzar recarga después de la redirección
      const timeoutId = setTimeout(() => {
        if (window.location.pathname.startsWith('/admin/')) {
          // Si no hay un parámetro 'reloaded', recargar
          if (!window.location.search.includes('reloaded=true')) {
            window.location.href = window.location.pathname + '?reloaded=true';
          }
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [to, isAdminRoute]);
  
  return <Navigate to={to} replace />;
});

// Definimos OutletWithMonitoring como un componente memoizado
const OutletWithMonitoring = memo(() => {
  const location = useLocation();
  
  useEffect(() => {
    // Si estamos en una ruta de admin y tenemos un parámetro 'reloaded', limpiarlo
    if (location.pathname.startsWith('/admin/') && location.search.includes('reloaded=true')) {
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location]);
  
  return <Outlet />;
});

// Componente interno que maneja la lógica pero aisla los cambios de renderizado
const ProtectedRouteLogic = ({ redirectPath = '/' }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const [localAuthChecked, setLocalAuthChecked] = useState<boolean>(false);
  const [isLocallyAuthenticated, setIsLocallyAuthenticated] = useState<boolean>(false);
  const [redirecting, setRedirecting] = useState<boolean>(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  // Verificar si acabamos de redirigir a una ruta admin y necesitamos recargar
  useEffect(() => {
    if (location.pathname.startsWith('/admin/')) {
      const redirectTo = sessionStorage.getItem('adminRedirectTo');
      // Si esta URL coincide con la redirección guardada y no hay señal de recarga
      if (redirectTo === location.pathname && !location.search.includes('reloaded=true')) {
        // Verificar si ya recargamos esta sesión
        const hasReloaded = sessionStorage.getItem('admin-route-reloaded');
        if (!hasReloaded) {
          // Marcar que hemos recargado
          sessionStorage.setItem('admin-route-reloaded', 'true');
          
          // Forzar recarga
          console.log('Recargando después de redirección a ruta de admin...');
          window.location.reload();
        }
      }
    } else {
      // Limpiar el flag si salimos de una ruta de admin
      sessionStorage.removeItem('admin-route-reloaded');
    }
  }, [location]);
  
  // Resto del código...
  // [Mantén todo el código original a partir de aquí]
  
  // Verificar autenticación local UNA SOLA VEZ al montar el componente
  useEffect(() => {
    // Verificar el token en localStorage directamente
    const token = localStorage.getItem('accessToken');
    const userDataStr = localStorage.getItem('userData');
    
    if (token && userDataStr) {
      try {
        // Verificar si el token ha expirado
        const expiration = localStorage.getItem('tokenExpiration');
        let isTokenValid = false;
        
        if (expiration) {
          const expirationTime = parseInt(expiration);
          isTokenValid = new Date().getTime() <= expirationTime;
        }
        
        // Verificar si podemos parsear los datos del usuario
        const userData = JSON.parse(userDataStr);
        const isUserDataValid = !!userData && !!userData.nombre;
        
        // Actualizar estado local
        const finalAuthState = isTokenValid && isUserDataValid;
        setIsLocallyAuthenticated(finalAuthState);
        
        // Determinar si el usuario es administrador
        if (userData && userData.rol === true) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (e) {
        console.error('Error en verificación local:', e);
        setIsLocallyAuthenticated(false);
        setIsAdmin(false);
      }
    } else {
      setIsLocallyAuthenticated(false);
      setIsAdmin(false);
    }
    
    setLocalAuthChecked(true);
  }, []);
  
  // Actualizar isAdmin cuando cambia el usuario del contexto
  useEffect(() => {
    if (!user) return;
    
    const newIsAdmin = user.rol === true;
    if (newIsAdmin !== isAdmin) {
      setIsAdmin(newIsAdmin);
    }
  }, [user, isAdmin]);
  
  // Efecto de evaluación de ruta
  useEffect(() => {
    // Solo proceder si hemos verificado la autenticación local y no estamos cargando
    if (!localAuthChecked || loading || redirecting) {
      return;
    }
    
    // Considerar autenticado si cualquiera de las dos verificaciones es positiva
    const isEffectivelyAuthenticated = isAuthenticated || isLocallyAuthenticated;
    
    // Determinar si necesitamos redirigir basado en autenticación y roles
    let shouldRedirect = false;
    let targetPath = '';
    
    // Verificar autenticación
    if (!isEffectivelyAuthenticated) {
      shouldRedirect = true;
      targetPath = redirectPath;
    } else {
      // Verificar permisos basados en roles
      const isAdminRoute = location.pathname.startsWith('/admin');
      
      // Usuario regular intentando acceder a rutas de admin
      if (isAdminRoute && isAdmin === false) {
        shouldRedirect = true;
        
        // Ruta específica de admin/translator para usuario normal
        if (location.pathname === '/admin/translator') {
          targetPath = '/translator';
        } else {
          // Otras rutas de admin
          targetPath = '/translator';
        }
      } 
      // Admin intentando acceder a traductor regular
      else if (location.pathname === '/translator' && isAdmin === true) {
        shouldRedirect = true;
        targetPath = '/admin/translator';
      }
    }
    
    // Si necesitamos redirigir y la ruta de destino es diferente a la actual
    if (shouldRedirect && targetPath !== '' && targetPath !== location.pathname) {
      // Evitar bucles de redirección
      const lastRedirect = sessionStorage.getItem('lastRedirect');
      
      if (lastRedirect) {
        try {
          const { from, to, timestamp } = JSON.parse(lastRedirect);
          const now = new Date().getTime();
          const lastRedirectTime = new Date(timestamp).getTime();
          
          // Si estamos intentando redirigir a un lugar desde donde ya fuimos redirigidos en los últimos 2 segundos
          if (from === targetPath && to === location.pathname && (now - lastRedirectTime) < 2000) {
            shouldRedirect = false;
          } else {
            // Registrar esta redirección para futuras comprobaciones
            sessionStorage.setItem('lastRedirect', JSON.stringify({
              from: location.pathname,
              to: targetPath,
              timestamp: new Date().toISOString()
            }));
            
            // Guardar la URL de destino para que RedirectComponent sepa si debe recargar
            if (targetPath.startsWith('/admin/')) {
              sessionStorage.setItem('adminRedirectTo', targetPath);
            }
            
            setRedirecting(true);
            setRedirectTo(targetPath);
          }
        } catch (e) {
          console.error('Error al procesar lastRedirect:', e);
          shouldRedirect = false; // Prevenir redirección si hay error en el parsing
        }
      } else {
        // Primera redirección, registrarla
        sessionStorage.setItem('lastRedirect', JSON.stringify({
          from: location.pathname,
          to: targetPath,
          timestamp: new Date().toISOString()
        }));
        
        // Guardar la URL de destino para que RedirectComponent sepa si debe recargar
        if (targetPath.startsWith('/admin/')) {
          sessionStorage.setItem('adminRedirectTo', targetPath);
        }
        
        setRedirecting(true);
        setRedirectTo(targetPath);
      }
    }
  }, [
    isAuthenticated,
    loading, 
    localAuthChecked, 
    isLocallyAuthenticated, 
    location.pathname, 
    redirectPath, 
    redirecting,
    isAdmin
  ]);
  
  // Decidir qué renderizar basado en el estado
  if (!localAuthChecked || loading) {
    return <LoadingIndicator />;
  }
  
  if (redirecting && redirectTo) {
    return <RedirectComponent to={redirectTo} />;
  }
  
  // Determinar si tenemos acceso efectivo
  const hasEffectiveAccess = isAuthenticated || isLocallyAuthenticated;
  
  // Si no estamos autenticados, redirigir a login
  if (!hasEffectiveAccess) {
    return <RedirectComponent to={redirectPath} />;
  }
  
  // Renderizar el Outlet con monitoreo si todo está bien
  return <OutletWithMonitoring />;
};

// El componente principal es muy simple y usa la lógica aislada
const ProtectedRoute: React.FC<ProtectedRouteProps> = (props) => {
  return <ProtectedRouteLogic {...props} />;
};

// Aplicar memo al componente completo
export default memo(ProtectedRoute);