import React from 'react';
import { Network } from 'vis-network';

function GraphDisplay() {
  React.useEffect(() => {
    const container = document.getElementById('graph');
    const data = {
      nodes: [
        { id: 1, label: 'Node 1' },
        { id: 2, label: 'Node 2' }
      ],
      edges: [
        { from: 1, to: 2 }
      ]
    };
    const options = {};
    new Network(container, data, options);
  }, []);

  return <div id="graph" style={{ height: '500px' }}></div>;
}

export default GraphDisplay;
