import React from 'react';
import GraphCanvas from '../components/graph/GraphCanvas';

const GraphPage: React.FC = () => {
  return (
    <div className="h-screen w-screen bg-bg-primary">
      <GraphCanvas />
    </div>
  );
};

export default GraphPage;
