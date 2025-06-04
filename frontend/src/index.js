import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css'; // MANTENER ESTE (Tailwind y variables principales)
// import './assets/css/styles.css'; // COMENTAR TEMPORALMENTE para aislar problemas de CSS
// import './App.css'; // COMENTAR TEMPORALMENTE para aislar problemas de CSS
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);