// src/components/ProtectedRoute.tsx
import React, { useEffect, useState, useRef, memo} from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  redirectPath?: string;
}

// Para identificar componentes en console logs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Componente que solo muestra un indicador de carga
const LoadingIndicator = memo(() => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>Verificando autenticación...</p>
  </div>
));

// Componente que solo maneja la redirección
const RedirectComponent = memo(({ to }: { to: string }) => {
  console.log(`🚀 Redirigiendo a: ${to}`);
  return <Navigate to={to} replace />;
});

// Definimos OutletWithMonitoring como un componente memoizado
const OutletWithMonitoring = memo(() => {
  const location = useLocation();
  const outletId = useRef(`outlet-${generateId()}`).current;
  const renderCount = useRef(0);
  
  renderCount.current++;
  
  useEffect(() => {
    console.log(`🟢 [${outletId}] Outlet MONTADO en ${location.pathname}`);
    
    return () => {
      console.log(`🔴 [${outletId}] Outlet DESMONTADO en ${location.pathname}`);
    };
  }, []); // Solo ejecutar al montar/desmontar
  
  console.log(`🔄 [${outletId}] Outlet renderizado #${renderCount.current}`);
  
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

  // ID único para este componente (estático)
  const componentId = useRef(`pr-logic-${generateId()}`).current;
  const renderCount = useRef(0);
  
  renderCount.current++;
  
  // Log de cada renderizado con contador para ver cuántos re-renders ocurren
  console.log(`📊 [${componentId}] LOGIC renderizado #${renderCount.current} en ${location.pathname}`);
  console.log(`   - Auth:`, { isAuthenticated, loading, localAuthChecked, isLocallyAuthenticated, redirecting });
  
  // Analizar parent renders
  useEffect(() => {
    console.log(`📌 [${componentId}] LOGIC inicializado, stack:`, new Error().stack);
  }, []);
  
  // Verificar autenticación local UNA SOLA VEZ al montar el componente
  useEffect(() => {
    console.log(`🔍 [${componentId}] Verificando autenticación local`);
    
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
        console.error(`❌ [${componentId}] Error en verificación local:`, e);
        setIsLocallyAuthenticated(false);
        setIsAdmin(false);
      }
    } else {
      setIsLocallyAuthenticated(false);
      setIsAdmin(false);
    }
    
    setLocalAuthChecked(true);
    console.log(`✅ [${componentId}] Verificación local completada`);
  }, []); // Solo se ejecuta al montar el componente
  
  // Actualizar isAdmin cuando cambia el usuario del contexto
  useEffect(() => {
    if (!user) return;
    
    const newIsAdmin = user.rol === true;
    
    if (newIsAdmin !== isAdmin) {
      console.log(`👑 [${componentId}] Usuario rol actualizado a: ${newIsAdmin ? 'admin' : 'no-admin'}`);
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
      console.log(`🛡️ [${componentId}] Redirección por falta de autenticación: ${location.pathname} -> ${targetPath}`);
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
        
        console.log(`🛡️ [${componentId}] Usuario regular en zona admin: redirección ${location.pathname} -> ${targetPath}`);
      } 
      // Admin intentando acceder a traductor regular
      else if (location.pathname === '/translator' && isAdmin === true) {
        shouldRedirect = true;
        targetPath = '/admin/translator';
        
        console.log(`🛡️ [${componentId}] Admin en traductor regular: redirección ${location.pathname} -> ${targetPath}`);
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
            console.warn(`⚠️ [${componentId}] ¡BUCLE DETECTADO! Cancelando redirección ${location.pathname} -> ${targetPath}`);
            console.warn(`⚠️ [${componentId}] Redirección previa: ${from} -> ${to} hace ${(now - lastRedirectTime)}ms`);
            shouldRedirect = false;
          } else {
            // Registrar esta redirección para futuras comprobaciones
            sessionStorage.setItem('lastRedirect', JSON.stringify({
              from: location.pathname,
              to: targetPath,
              timestamp: new Date().toISOString()
            }));
            
            console.log(`➡️ [${componentId}] Iniciando redirección ${location.pathname} -> ${targetPath}`);
            setRedirecting(true);
            setRedirectTo(targetPath);
          }
        } catch (e) {
          console.error(`❌ [${componentId}] Error al procesar lastRedirect:`, e);
          shouldRedirect = false; // Prevenir redirección si hay error en el parsing
        }
      } else {
        // Primera redirección, registrarla
        sessionStorage.setItem('lastRedirect', JSON.stringify({
          from: location.pathname,
          to: targetPath,
          timestamp: new Date().toISOString()
        }));
        
        console.log(`➡️ [${componentId}] Primera redirección ${location.pathname} -> ${targetPath}`);
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
  const componentId = useRef(`pr-main-${generateId()}`).current;
  const renderCount = useRef(0);
  
  renderCount.current++;
  
  // Log de montaje/desmontaje del componente
  useEffect(() => {
    console.log(`🟢 [${componentId}] ProtectedRoute PRINCIPAL MONTADO`);
    
    return () => {
      console.log(`🔴 [${componentId}] ProtectedRoute PRINCIPAL DESMONTADO`);
    };
  }, []);
  
  console.log(`🔄 [${componentId}] ProtectedRoute PRINCIPAL renderizado #${renderCount.current}`);
  
  return <ProtectedRouteLogic {...props} />;
};

// Aplicar memo al componente completo
export default memo(ProtectedRoute);