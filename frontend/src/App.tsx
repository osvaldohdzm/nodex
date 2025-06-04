import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import GraphPageWrapper from './pages/GraphPageWrapper';
import './styles/globals.css';

function App() {
  console.log("App component is rendering");
  const isAuthenticated = !!localStorage.getItem('access_token');

  return (
    <Router>
      <div className="App flex flex-col h-screen bg-bg-primary"> {/* Usar variable CSS */}
        <header
          className="App-header" // Puedes añadir clases de Tailwind aquí si quieres
          style={{
            backgroundColor: 'var(--bg-secondary)', // Usar variable CSS
            padding: '1rem', // Ajustar padding
            textAlign: 'center',
            color: 'var(--text-primary)', // Usar variable CSS
            flexShrink: 0, 
            borderBottom: '1px solid var(--input-border)' // Borde más sutil
          }}
        >
          <h1 className="text-2xl font-semibold text-accent-cyan">Nodex</h1> {/* Estilo al título */}
        </header>

        {/* Contenedor principal del contenido */}
        <main
          className="flex-grow overflow-hidden" // overflow-hidden para que el contenido interno maneje su scroll
          style={{
            position: 'relative' // Necesario para que ReactFlow se posicione bien
          }}
        >
          {/* Las Rutas van aquí, y el componente de ruta debe llenar este 'main' */}
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/graph"
              element={
                isAuthenticated ? <GraphPageWrapper /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/"
              element={<Navigate to={isAuthenticated ? "/graph" : "/login"} replace />}
            />
            <Route
              path="*" // Catch-all
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;