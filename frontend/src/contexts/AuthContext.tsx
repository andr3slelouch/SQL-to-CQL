import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import AuthService, { User, AuthState } from '../services/AuthService';

// Definir el tipo para el contexto
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  logout: () => void;
}

// Crear el contexto con un valor predeterminado
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  logout: () => {}
});

// Props para el proveedor del contexto
interface AuthProviderProps {
  children: ReactNode;
}

// Configuración para habilitar logs de depuración
// Cámbialo a true para ver logs detallados, false para producción
const DEBUG_LOGS = false;

/**
 * Utilidad para comparar objetos de forma profunda
 * Evita actualizaciones de estado innecesarias cuando los datos no han cambiado
 */
const areEqual = (obj1: any, obj2: any): boolean => {
  // Si son idénticos por referencia
  if (obj1 === obj2) return true;
  // Si alguno es null/undefined pero el otro no
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  // Si son tipos primitivos diferentes
  if (typeof obj1 !== typeof obj2) return false;
  // Comparar valores primitivos
  if (typeof obj1 !== 'object') return obj1 === obj2;
  // Si uno es array y el otro no
  const isArray1 = Array.isArray(obj1);
  const isArray2 = Array.isArray(obj2);
  if (isArray1 !== isArray2) return false;
  // Si ambos son arrays, comparar longitud y elementos
  if (isArray1) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item: any, index: number) => areEqual(item, obj2[index]));
  }
  // Para objetos, comparamos sus propiedades
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  return keys1.every(key =>
    Object.prototype.hasOwnProperty.call(obj2, key) && areEqual(obj1[key], obj2[key])
  );
};

// Función helper para logs condicionales
const logDebug = (message: string, data?: any) => {
  if (DEBUG_LOGS) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

// Componente proveedor del contexto
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Estado de autenticación
  const [authState, setAuthState] = useState<AuthState & { loading: boolean }>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    loading: true
  });

  // Referencia para mantener el último estado sin trigger re-renderizados
  const lastAuthStateRef = useRef<(AuthState & { loading: boolean }) | null>(null);

  // Contador de renderizados para debug
  const renderCount = useRef(0);
  renderCount.current++;

  // Log de renderizados
  logDebug(` AuthContext renderizado #${renderCount.current}`);

  /**
   * Verificar el estado de autenticación y actualizar solo si hay cambios
   */
  const checkAuthState = useCallback(() => {
    const currentState = AuthService.getAuthState();
    const newState = {
      ...currentState,
      loading: false
    };

    // Verificar si el estado ha cambiado realmente
    const hasChanged = !lastAuthStateRef.current || !areEqual(lastAuthStateRef.current, newState);
    
    if (hasChanged) {
      logDebug(' AuthContext: Estado de autenticación ha cambiado, actualizando...', {
        prevState: lastAuthStateRef.current,
        newState
      });
      
      // Actualizar la referencia
      lastAuthStateRef.current = newState;
      
      // Actualizar el estado solo si hay cambios reales
      setAuthState(newState);
    } else {
      logDebug('✓ AuthContext: Estado de autenticación sin cambios, evitando rerenderizado');
    }
    
    return hasChanged;
  }, []);

  // Efecto para verificar el estado de autenticación al cargar la aplicación
  useEffect(() => {
    logDebug(' AuthContext: Iniciando verificación de autenticación');
    
    // Verificación inicial
    checkAuthState();
    
    // Intervalo para verificaciones periódicas
    // Consideramos 60 segundos un buen balance entre seguridad y rendimiento
    const intervalId = setInterval(() => {
      logDebug(' AuthContext: Verificación periódica de autenticación');
      checkAuthState();
    }, 60000); // Cada minuto
    
    return () => {
      logDebug(' AuthContext: Limpiando intervalos');
      clearInterval(intervalId);
    };
  }, [checkAuthState]);

  /**
   * Función para cerrar sesión
   * Memoizada para evitar recrearla en cada renderizado
   */
  const logout = useCallback(() => {
    logDebug(' AuthContext: Cerrando sesión');
    AuthService.logout();
    const newState = {
      isAuthenticated: false,
      user: null,
      accessToken: null,
      loading: false
    };
    
    // Actualizar referencia y estado
    lastAuthStateRef.current = newState;
    setAuthState(newState);
  }, []);

  // Valor a proporcionar a los componentes consumidores
  // Memoizado para evitar crear un objeto nuevo en cada renderizado
  const contextValue = React.useMemo(() => ({
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    loading: authState.loading,
    logout
  }), [authState.isAuthenticated, authState.user, authState.loading, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useAuth = () => useContext(AuthContext);

export default AuthContext;