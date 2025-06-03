import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import GraphDisplay from './components/GraphDisplay';
import FileUploader from './components/FileUploader';
import NodeDetailPanel from './components/NodeDetailPanel';
import LoginForm from './components/LoginForm';
import LoginPage from './pages/LoginPage';
import GraphPage from './pages/GraphPage';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>nodex</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/graph" element={<GraphPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
