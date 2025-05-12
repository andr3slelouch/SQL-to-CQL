// src/App.tsx
import React from 'react';
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
import AssignDatabasesPage from './pages/AssignDatabasesPage';
import ConfigurePermissionsPage from './pages/ConfigurePermissionsPage';

// Estilos
import './styles/LoginPage.css';
import './styles/Registro.css';
import './styles/CambioContrasena.css';
import './styles/AdminLayout.css';
import './styles/AdminTranslatorPage.css';

const App: React.FC = () => {
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