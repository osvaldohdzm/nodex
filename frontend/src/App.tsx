import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import GraphPage from './pages/GraphPage';
import './styles/globals.css';

function App() {
  console.log("App component is rendering");
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

        {/* SIMPLIFIED MAIN SECTION FOR DEBUGGING */}
        <main
          className="flex-grow"
          style={{
            border: '5px solid limegreen',
            backgroundColor: 'rgba(50, 50, 150, 0.3)',
            position: 'relative'
          }}
        >
          <div style={{
              width: '100%',
              height: '100%',
              border: '3px dashed yellow',
              backgroundColor: 'rgba(255, 255, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ 
                flexGrow: 1, 
                border: '2px solid orange', 
                position: 'relative',
                width: '100%',
                height: '100%'
            }}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/graph"
                  element={
                    isAuthenticated ? <GraphPage /> : <Navigate to="/login" replace />
                  }
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
            </div>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;