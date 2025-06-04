import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import PrivateRoute from './components/auth/PrivateRoute'; // Still missing, using manual check
import LoginPage from './pages/LoginPage';
import GraphPage from './pages/GraphPage';
import './styles/globals.css';

function App() {
  console.log("App component is rendering");
  // This check will run on every render of App. For a more robust solution,
  // this state would be managed by a context or global state manager.
  const isAuthenticated = !!localStorage.getItem('access_token');

  return (
    <Router>
      <div className="App flex flex-col h-screen bg-gray-700">
        <header
          className="App-header"
          style={{
            backgroundColor: '#1e1e1e',
            padding: '20px',
            textAlign: 'center',
            color: 'white',
            flexShrink: 0,
            borderBottom: '2px solid var(--accent-cyan)'
          }}
        >
          <h1>Nodex</h1>
        </header>

        <main
          className="flex-grow overflow-auto"
          style={{
            border: '5px solid limegreen', // Debug border
            backgroundColor: 'rgba(50, 50, 150, 0.3)', // Debug background
          }}
        >
          <div style={{
              border: '3px dashed yellow', // Debug border
              minHeight: '100%', // Ensure this div tries to fill main
              backgroundColor: 'rgba(255, 255, 0, 0.1)', // Debug background
              padding: '10px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <p style={{color: 'yellow', textAlign: 'center', flexShrink: 0}}>CONTENIDO INTERNO DE MAIN</p>
            
            <div style={{ flexGrow: 1, border: '2px solid orange', position: 'relative' /* For ReactFlow */}}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                
                {/* Protected Route for GraphPage */}
                <Route 
                  path="/graph" 
                  element={
                    isAuthenticated ? <GraphPage /> : <Navigate to="/login" replace />
                  } 
                />
                
                {/* Default route: redirect based on authentication status */}
                <Route 
                  path="/" 
                  element={
                    isAuthenticated ? <Navigate to="/graph" replace /> : <Navigate to="/login" replace />
                  } 
                />
                
                {/* Catch-all route */}
                <Route 
                  path="*" 
                  element={<Navigate to="/" replace />} 
                />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;