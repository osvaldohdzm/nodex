import React from 'react';
import './App.css';
import GraphDisplay from './components/GraphDisplay';
import FileUploader from './components/FileUploader';
import NodeDetailPanel from './components/NodeDetailPanel';
import LoginForm from './components/LoginForm';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>nodex</h1>
      </header>
      <main>
        <LoginForm />
        <FileUploader />
        <GraphDisplay />
        <NodeDetailPanel />
      </main>
    </div>
  );
}

export default App;
