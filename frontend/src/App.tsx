// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import Registro from './components/Registro';
import CambioContrasena from './components/CambioContrasena';
import TranslatorPage from './components/TranslatorPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

// Páginas de administrador
import AdminTranslatorPage from './pages/AdminTranslatorPage';
import GeneratePinPage from './pages/GeneratePinPage';
import DeleteUserPage from './pages/DeleteUserPage';
import DeleteKeyspacePage from './pages/DeleteKeyspacePage'; // Nueva página
import AssignDatabasesPage from './pages/AssignDatabasesPage';
import ConfigurePermissionsPage from './pages/ConfigurePermissionsPage';

// Estilos
import './styles/LoginPage.css';
import './styles/Registro.css';
import './styles/CambioContrasena.css';
import './styles/AdminLayout.css';
import './styles/AdminTranslatorPage.css';

const App: React.FC = () => {
  // Añadir estilos para animaciones suaves
  useEffect(() => {
    // Estilos CSS para la animación de transición
    const style = document.createElement('style');
    style.innerHTML = `
      /* Animación suave para todas las transiciones */
      .admin-container {
        animation: fadeIn 0.15s ease-in-out;
      }
      @keyframes fadeIn {
        from { opacity: 0.98; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // Limpiar al desmontar
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/reset-password" element={<CambioContrasena />} />

            {/* Rutas protegidas */}
            <Route element={<ProtectedRoute />}>
              {/* Rutas de usuario */}
              <Route path="/translator" element={<TranslatorPage />} />

              {/* Rutas de administrador */}
              <Route path="/admin/translator" element={<AdminTranslatorPage />} />
              <Route path="/admin/generar-pin" element={<GeneratePinPage />} />
              <Route path="/admin/eliminar-usuario" element={<DeleteUserPage />} />
              <Route path="/admin/eliminar-bases" element={<DeleteKeyspacePage />} />
              <Route path="/admin/asignar-bases" element={<AssignDatabasesPage />} />
              <Route path="/admin/configurar-permisos" element={<ConfigurePermissionsPage />} />
            </Route>

            {/* Redirección para rutas no encontradas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;