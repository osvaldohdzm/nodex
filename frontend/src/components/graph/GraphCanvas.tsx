import React from 'react';

const GraphCanvas: React.FC = () => {
  console.log("GraphCanvas component is rendering (ultra-simple version)");

  return (
    <div
      style={{
        width: '100%',
        height: '100%', // asegura que este div intente llenar a su padre
        backgroundColor: 'rgba(0, 255, 0, 0.3)', // verde brillante, semi-transparente
        border: '5px dashed hotpink', // borde rosa brillante y discontinuo
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white', // color de texto blanco para contraste
        fontSize: '2rem',
        padding: '20px',
      }}
      className="debug-border-canvas" // si tienes esta clase para depurar
    >
      GraphCanvas Test - ¿Puedes ver esto?
    </div>
  );
};

export default GraphCanvas;
