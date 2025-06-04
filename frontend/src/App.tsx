import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
// import GraphPageWrapper from './pages/GraphPageWrapper'; // Comenta o elimina 
import GraphPageWithProvider from './pages/GraphPage'; // Use default export which includes Provider
import './styles/globals.css';

function App() {
  console.log("App component is rendering");
  const isAuthenticated = !!localStorage.getItem('access_token');

  return (
    <Router>
      {/* .App ya tiene flex flex-col h-screen desde globals.css o Tailwind */}
      <div className="App"> 
        <header
          className="App-header"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '1rem',
            textAlign: 'center',
            color: 'var(--text-primary)',
            flexShrink: 0, 
            borderBottom: '1px solid var(--input-border)'
          }}
        >
          <h1 className="text-2xl font-semibold text-accent-cyan">Nodex</h1>
        </header>

        {/* Contenedor principal del contenido */}
        <main
          className="flex-grow flex flex-col overflow-hidden"
          style={{
            position: 'relative',
            border: '5px solid limegreen', // DEBUG STYLE
            backgroundColor: 'rgba(0, 255, 0, 0.1)' // DEBUG STYLE
          }}
        >
          <div 
            className="flex-grow flex flex-col" 
            style={{ border: '3px solid orange', minHeight: '100px' }} // DEBUG STYLE
          >
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/graph"
                element={ 
                  isAuthenticated ? <GraphPageWithProvider /> : <Navigate to="/login" replace />
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
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;