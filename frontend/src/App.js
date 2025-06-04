import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Asegúrate de que estas importaciones de CSS estén comentadas o eliminadas si no las necesitas aquí directamente
// import './App.css'; // Comentado si los estilos principales están en globals.css o son de Tailwind
import LoginPage from './pages/LoginPage.tsx';
import GraphPage from './pages/GraphPage.tsx';
import PrivateRoute from './components/auth/PrivateRoute.tsx';
import './styles/globals.css'; // Importante: tus estilos globales y Tailwind

function App() {
  console.log("App component is rendering");
  // Esta variable isAuthenticated se usa para la redirección inicial en la ruta "/"
  // PrivateRoute maneja la autenticación para las rutas protegidas después de eso.
  const isAuthenticated = !!localStorage.getItem('access_token');

  return (
    <Router>
      {/* Contenedor principal de la aplicación */}
      <div className="App flex flex-col h-screen bg-gray-700"> {/* Fondo gris oscuro para ver el contenedor App */}
        <header
          className="App-header" // Puedes añadir clases de Tailwind aquí si quieres
          style={{
            backgroundColor: '#1e1e1e', // Un color de header distintivo
            padding: '20px',
            textAlign: 'center',
            color: 'white',
            flexShrink: 0, // Importante: Evita que el header se encoja si el contenido de main es grande
            borderBottom: '2px solid var(--accent-cyan)' // Un borde para distinguirlo
          }}
        >
          <h1>Nodex</h1>
        </header>

        {/* Contenedor principal del contenido */}
        <main
          className="flex-grow overflow-auto" // Tailwind classes para que ocupe el espacio y permita scroll
          style={{
            border: '5px solid limegreen', // Borde verde para depurar <main>
            backgroundColor: 'rgba(50, 50, 150, 0.3)', // Fondo azulado semi-transparente para <main>
            // minHeight: '0', // Asegura que flex-grow pueda funcionar correctamente.
            // display: 'flex', // Si quieres que el contenido interno use flex
            // flexDirection: 'column', // Si quieres que el contenido interno se apile verticalmente
          }}
        >
          {/* Div interno para probar el layout dentro de main */}
          <div style={{
              border: '3px dashed yellow',
              // flexGrow: 1, // Descomenta si main tiene display:flex y flexDirection:column y quieres que este div crezca
              minHeight: '100%', // Intenta que este div ocupe toda la altura de main
              backgroundColor: 'rgba(255, 255, 0, 0.1)',
              padding: '10px', // Añade padding para ver el contenido
              display: 'flex', // Para que GraphPage pueda usar flex si es necesario
              flexDirection: 'column' // Para que GraphPage pueda usar flex si es necesario
            }}
          >
            <p style={{color: 'yellow', textAlign: 'center', flexShrink: 0}}>CONTENIDO INTERNO DE MAIN - ¿VES ESTO EN AMARILLO?</p>
            
            {/* Las Rutas van aquí, dentro del div amarillo para ver si se renderizan */}
            <div style={{ flexGrow: 1, border: '2px solid orange', position: 'relative' /* Para ReactFlow */}}> {/* Contenedor para las rutas */}
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<PrivateRoute />}>
                  {/* GraphPage es el div rojo/azul de depuración */}
                  <Route path="/graph" element={<GraphPage />} />
                </Route>
                <Route
                  path="/"
                  element={
                    // Re-evaluar aquí para la redirección inicial
                    localStorage.getItem('access_token') ? <Navigate to="/graph" replace /> : <Navigate to="/login" replace />
                  }
                />
                {/* Ruta catch-all para redirigir si no se encuentra la ruta */}
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