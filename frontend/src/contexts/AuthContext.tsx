// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

// Componente proveedor del contexto
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState & { loading: boolean }>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    loading: true
  });

  // Efecto para verificar el estado de autenticación al cargar la aplicación
  useEffect(() => {
    const checkAuthState = () => {
      const currentState = AuthService.getAuthState();
      setAuthState({
        ...currentState,
        loading: false
      });
    };

    checkAuthState();

    // Opcionalmente, podríamos configurar un intervalo para verificar
    // regularmente si el token ha expirado
    const intervalId = setInterval(checkAuthState, 60000); // Cada minuto

    return () => clearInterval(intervalId);
  }, []);

  // Función para cerrar sesión
  const logout = () => {
    AuthService.logout();
    setAuthState({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      loading: false
    });
  };

  // Valor a proporcionar a los componentes consumidores
  const contextValue: AuthContextType = {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    loading: authState.loading,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useAuth = () => useContext(AuthContext);

export default AuthContext;