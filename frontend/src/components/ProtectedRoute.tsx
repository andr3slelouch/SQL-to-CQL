// src/components/ProtectedRoute.tsx
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PerformanceLogger from '../utils/PerformanceLogger';

interface ProtectedRouteProps {
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ redirectPath = '/' }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const [localAuthChecked, setLocalAuthChecked] = useState<boolean>(false);
  const [isLocallyAuthenticated, setIsLocallyAuthenticated] = useState<boolean>(false);
  const [redirecting, setRedirecting] = useState<boolean>(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  
  // Verificar autenticación local para mayor estabilidad
  useEffect(() => {
    // Verificar el token en localStorage directamente
    const token = localStorage.getItem('accessToken');
    const userDataStr = localStorage.getItem('userData');
    
    // Registrar información para depuración
    PerformanceLogger.logEvent('🔐 Verificación local de autenticación', {
      hasToken: !!token,
      hasUserData: !!userDataStr,
      pathname: location.pathname
    });
    
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
        
        PerformanceLogger.logEvent('🔐 Resultado de verificación local', {
          isTokenValid,
          isUserDataValid,
          finalAuthState,
          pathname: location.pathname
        });
      } catch (e) {
        PerformanceLogger.logEvent('❌ Error en verificación local de autenticación', {
          error: e,
          pathname: location.pathname
        });
        setIsLocallyAuthenticated(false);
      }
    } else {
      setIsLocallyAuthenticated(false);
    }
    
    setLocalAuthChecked(true);
  }, [location.pathname]);
  
  // Registrar cuando el componente se evalúa
  useEffect(() => {
    // Solo proceder si hemos verificado la autenticación local
    if (!localAuthChecked) {
      return;
    }
    
    PerformanceLogger.startTimer('protected-route-evaluation');
    PerformanceLogger.logEvent('🛡️ ProtectedRoute siendo evaluado', {
      pathname: location.pathname,
      isAuthenticated,
      isLocallyAuthenticated,
      loading,
      userRole: user?.rol,
      timestamp: new Date().toISOString()
    });
    
    // Verificar si ya estamos redirigiendo para evitar bucles
    if (redirecting) {
      PerformanceLogger.logEvent('🛡️ ProtectedRoute - Ya estamos redirigiendo, evitando evaluación');
      return;
    }
    
    // Si estamos cargando, no hacer nada más
    if (loading) {
      return;
    }
    
    // Usar la combinación de ambas verificaciones de autenticación para mayor estabilidad
    // Consideramos autenticado si cualquiera de las dos verificaciones es positiva
    const isEffectivelyAuthenticated = isAuthenticated || isLocallyAuthenticated;
    
    // Determinar si necesitamos redirigir basado en autenticación y roles
    let shouldRedirect = false;
    let targetPath = '';
    
    // Verificar autenticación
    if (!isEffectivelyAuthenticated) {
      shouldRedirect = true;
      targetPath = redirectPath;
      PerformanceLogger.logEvent('🛡️ ProtectedRoute - Necesita redirección por falta de autenticación', {
        from: location.pathname,
        to: targetPath,
        isAuthenticated,
        isLocallyAuthenticated
      });
    } else {
      // Determinar si el usuario es administrador
      // Usar tanto el contexto como la verificación local
      let isAdmin = false;
      
      if (user?.rol === true) {
        isAdmin = true;
      } else {
        const localUserDataStr = localStorage.getItem('userData');
        if (localUserDataStr) {
          try {
            const localUserData = JSON.parse(localUserDataStr);
            if (localUserData.rol === true) {
              isAdmin = true;
            }
          } catch (e) {
            // Ignorar errores al leer datos locales
          }
        }
      }
      
      // Verificar permisos basados en roles
      const isAdminRoute = location.pathname.startsWith('/admin');
      
      PerformanceLogger.logEvent('🛡️ ProtectedRoute - Verificando permisos', {
        pathname: location.pathname,
        isAdminRoute,
        isAdmin,
        userRole: user?.rol
      });
      
      // Usuario regular intentando acceder a rutas de admin
      if (isAdminRoute && !isAdmin) {
        shouldRedirect = true;
        
        // Ruta específica de admin/translator para usuario normal
        if (location.pathname === '/admin/translator') {
          targetPath = '/translator';
        } else {
          // Otras rutas de admin
          targetPath = '/translator';
        }
        
        PerformanceLogger.logEvent('🛡️ ProtectedRoute - Usuario regular intentando acceder a zona admin', {
          from: location.pathname,
          to: targetPath
        });
      } 
      // Admin intentando acceder a traductor regular
      else if (location.pathname === '/translator' && isAdmin) {
        shouldRedirect = true;
        targetPath = '/admin/translator';
        
        PerformanceLogger.logEvent('🛡️ ProtectedRoute - Admin intentando acceder a traductor regular', {
          from: location.pathname,
          to: targetPath
        });
      }
    }
    
    // Si necesitamos redirigir y la ruta de destino es diferente a la actual
    if (shouldRedirect && targetPath !== '' && targetPath !== location.pathname) {
      // Evitar bucles de redirección
      const lastRedirect = sessionStorage.getItem('lastRedirect');
      if (lastRedirect) {
        const { from, to, timestamp } = JSON.parse(lastRedirect);
        const now = new Date().getTime();
        const lastRedirectTime = new Date(timestamp).getTime();
        
        // Si estamos intentando redirigir a un lugar desde donde ya fuimos redirigidos en los últimos 2 segundos
        if (from === targetPath && to === location.pathname && (now - lastRedirectTime) < 2000) {
          PerformanceLogger.logEvent('🛡️ ProtectedRoute - Detectado posible bucle de redirección, cancelando', {
            wouldRedirectFrom: location.pathname,
            wouldRedirectTo: targetPath,
            previousRedirect: { from, to, timeSince: now - lastRedirectTime }
          });
          
          // Forzar renderizado del outlet para romper el bucle
          shouldRedirect = false;
        } else {
          // Registrar esta redirección para futuras comprobaciones
          sessionStorage.setItem('lastRedirect', JSON.stringify({
            from: location.pathname,
            to: targetPath,
            timestamp: new Date().toISOString()
          }));
          
          // Marcar que estamos redirigiendo
          setRedirecting(true);
          setRedirectTo(targetPath);
        }
      } else {
        // Primera redirección, registrarla
        sessionStorage.setItem('lastRedirect', JSON.stringify({
          from: location.pathname,
          to: targetPath,
          timestamp: new Date().toISOString()
        }));
        
        // Marcar que estamos redirigiendo
        setRedirecting(true);
        setRedirectTo(targetPath);
      }
    }
    
    return () => {
      PerformanceLogger.endTimer('protected-route-evaluation');
      PerformanceLogger.logEvent('🛡️ ProtectedRoute finalizado', {
        pathname: location.pathname
      });
    };
  }, [isAuthenticated, loading, user, location.pathname, redirectPath, redirecting, localAuthChecked, isLocallyAuthenticated]);
  
  // Si todavía estamos verificando la autenticación local, mostrar indicador de carga
  if (!localAuthChecked) {
    PerformanceLogger.logEvent('🛡️ ProtectedRoute - Verificando autenticación local', {
      pathname: location.pathname
    });
    
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verificando autenticación...</p>
      </div>
    );
  }
  
  // Registrar el estado de carga del contexto de autenticación
  if (loading) {
    PerformanceLogger.logEvent('🛡️ ProtectedRoute - En estado de carga', {
      pathname: location.pathname
    });
    
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verificando autenticación...</p>
      </div>
    );
  }
  
  // Si estamos redirigiendo, hacerlo
  if (redirecting && redirectTo) {
    PerformanceLogger.logEvent('🛡️ ProtectedRoute - Ejecutando redirección', {
      from: location.pathname,
      to: redirectTo
    });
    
    return <Navigate to={redirectTo} replace />;
  }
  
  // Determinar si tenemos acceso efectivo
  const hasEffectiveAccess = isAuthenticated || isLocallyAuthenticated;
  
  // Si no estamos autenticados en ninguna de las verificaciones, redirigir a login
  if (!hasEffectiveAccess) {
    PerformanceLogger.logEvent('🛡️ ProtectedRoute - Redirigiendo a login (no autenticado)', {
      redirectPath,
      from: location.pathname,
      isAuthenticated,
      isLocallyAuthenticated
    });
    
    return <Navigate to={redirectPath} replace />;
  }
  
  // Renderizar las rutas anidadas si está autenticado y tiene los permisos correctos
  PerformanceLogger.logEvent('🛡️ ProtectedRoute - Acceso permitido', {
    pathname: location.pathname,
    userRole: user?.rol,
    isAuthenticated,
    isLocallyAuthenticated
  });
  
  PerformanceLogger.startTimer('outlet-render');
  
  // Crear un wrapper para monitorear el renderizado del componente
  const OutletWithMonitoring = () => {
    useEffect(() => {
      PerformanceLogger.logEvent('🛡️ Outlet montado', {
        pathname: location.pathname
      });
      
      return () => {
        PerformanceLogger.endTimer('outlet-render');
        PerformanceLogger.logEvent('🛡️ Outlet desmontado', {
          pathname: location.pathname
        });
      };
    }, []);
    
    return <Outlet />;
  };
  
  return <OutletWithMonitoring />;
};

export default ProtectedRoute;