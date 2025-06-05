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

  return (
    // .App class from globals.css applies: bg-bg-primary text-text-primary font-sans
    // Ensure .App itself is flex flex-col and takes full screen height
    <div className="App flex flex-col h-screen">
      <header
        className="flex-shrink-0" // Prevent header from shrinking
        style={{
          backgroundColor: 'var(--bg-secondary)',
          padding: '1rem',
          textAlign: 'center',
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--input-border)',
          zIndex: 20 // Ensure header is above other content
        }}
      >
        <h1 className="text-2xl font-semibold text-accent-cyan">Nodex</h1>
      </header>
      {/* main needs to be a flex container that grows and allows its children to grow */}
      <main
        className="flex-grow flex flex-col" // This makes main a flex container that grows
        style={{
          minHeight: '0', // CRUCIAL for flex children that also grow and might overflow
          overflow: 'hidden' // Prevent main from showing scrollbars if children manage their own
        }}
      >
        {/* Routes will render GraphPageWithProvider.
            GraphPageWithProvider's root div (.graph-page-container) needs to fill this space.
        */}
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