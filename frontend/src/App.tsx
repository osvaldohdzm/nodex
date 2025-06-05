// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import GraphPageWithProvider from './pages/GraphPage';
import './styles/globals.css';

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      setIsAuthenticated(!!token);
    };
    checkAuth();
    const handleLoginSuccess = () => {
      console.log("AppContent: loginSuccess event received, updating auth state.");
      checkAuth();
    };
    window.addEventListener('loginSuccess', handleLoginSuccess);
    return () => {
      window.removeEventListener('loginSuccess', handleLoginSuccess);
    };
  }, [location.key]);

  console.log("AppContent rendering, isAuthenticated:", isAuthenticated);

  return (
    // .App class from globals.css applies: bg-bg-primary text-text-primary font-sans flex flex-col min-h-screen
    <div className="App"> 
      <header
        className="App-header" // This class is defined in App.css, ensure it's flex-shrink-0
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
      {/* main needs to be a flex container that grows and allows its children to grow */}
      <main
        className="flex-grow flex flex-col" // Ensures main itself is a flex container and grows
        style={{
          position: 'relative', // For absolutely positioned children if needed
          minHeight: '0', // CRUCIAL for flex children that also grow
        }}
      >
        {/* Routes will render GraphPageWithProvider, which has .graph-page-container (flex-grow) */}
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/graph" replace />} 
          />
          <Route
            path="/graph"
            element={isAuthenticated ? <GraphPageWithProvider /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? "/graph" : "/login"} replace />}
          />
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;