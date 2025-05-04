// src/pages/GeneratePinPage.tsx
import React, { useState } from 'react';
import AdminLayout from '../components/layouts/AdminLayout';

const GeneratePinPage: React.FC = () => {
  const [cedula, setCedula] = useState('');
  const [temporaryPin, setTemporaryPin] = useState('');
  
  const generatePin = () => {
    // En una aplicación real, aquí se llamaría al backend para generar el PIN
    // Para fines de demostración, generamos un PIN aleatorio
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    setTemporaryPin(newPin);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generatePin();
  };
  
  return (
    <AdminLayout>
      <div className="admin-panel">
        <form onSubmit={handleSubmit}>
          <div className="admin-form-row">
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label htmlFor="cedula" className="admin-label">Buscar por Cédula/Código</label>
                <input 
                  type="text" 
                  id="cedula" 
                  className="admin-input" 
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="admin-form-column">
              <div className="admin-form-group">
                <label htmlFor="pin" className="admin-label">PIN Temporal</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    id="pin" 
                    className="admin-input" 
                    value={temporaryPin}
                    readOnly
                  />
                  <button 
                    type="button" 
                    className="admin-button" 
                    onClick={() => navigator.clipboard.writeText(temporaryPin)}
                    disabled={!temporaryPin}
                    style={{ minWidth: 'auto', padding: '0.8rem' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                      <path d="M9.5 1H8.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708L7.5 7.207 4.646 4.354a.5.5 0 0 1 .708-.708L6.5 4.793V1h-1A1.5 1.5 0 0 0 4 2.5v10A1.5 1.5 0 0 0 5.5 14h5a1.5 1.5 0 0 0 1.5-1.5V2.5A1.5 1.5 0 0 0 10.5 1h-1z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button type="submit" className="admin-button">
              Generar
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default GeneratePinPage;