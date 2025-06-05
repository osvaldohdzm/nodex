import React from 'react';
import { getSmoothStepPath, ConnectionLineComponentProps } from 'reactflow';

const CustomConnectionLine: React.FC<ConnectionLineComponentProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  connectionLineStyle,
}) => {
  const [edgePath] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  });

  return (
    <g>
      <path
        style={{
          stroke: 'var(--accent-cyan)',
          strokeWidth: 2.5,
          ...connectionLineStyle,
        }}
        fill="none"
        d={edgePath}
      />
      <circle 
        cx={toX} 
        cy={toY} 
        r={4} 
        fill="var(--accent-cyan)" 
        stroke="var(--bg-secondary)" 
        strokeWidth={1.5} 
      />
    </g>
  );
};

export default CustomConnectionLine; 