// src/components/layouts/AdminLayout.tsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaArrowsAltH, FaKey, FaUserMinus, FaDatabase, FaCog, FaSignOutAlt, FaUserCircle, FaSearch } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/AdminLayout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  const menuItems = [
    { path: '/admin/translator', icon: <FaArrowsAltH />, text: 'Traductor' },
    { path: '/admin/generar-pin', icon: <FaKey />, text: 'Generar PIN' },
    { path: '/admin/eliminar-usuario', icon: <FaUserMinus />, text: 'Eliminar Usuario' },
    { path: '/admin/asignar-bases', icon: <FaDatabase />, text: 'Asignar Bases de Datos' },
    { path: '/admin/configurar-permisos', icon: <FaCog />, text: 'Configurar Permisos' },
  ];
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <div className="admin-container">
      {/* Sidebar izquierdo */}
      <div className="admin-sidebar">
        <div className="admin-logo">CASSQL</div>
        
        <div className="admin-menu">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`admin-menu-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="admin-menu-icon">{item.icon}</span>
              <span>{item.text}</span>
            </Link>
          ))}
        </div>
        
        <div className="admin-logout" onClick={handleLogout}>
          <span className="admin-menu-icon"><FaSignOutAlt /></span>
          <span>Salir</span>
        </div>
      </div>
      
      {/* Contenido principal */}
      <div className="admin-main">
        {/* Barra superior con usuario en la esquina derecha */}
        <div className="admin-topbar">
          <div className="admin-user">
            <span>{user?.nombre || 'Usuario'}</span>
            <FaUserCircle className="admin-user-icon" />
          </div>
        </div>
        
        {/* Contenido específico de la página */}
        <div className="admin-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;