import React from 'react';
import './AuroraText.css';

export function AuroraText({ 
  children, 
  className = '', 
  colors = ["#FF0080", "#7928CA", "#0070F3", "#38bdf8"], 
  speed = 1 
}) {
  // Create CSS variables for the colors
  const style = {
    '--aurora-color-1': colors[0],
    '--aurora-color-2': colors[1],
    '--aurora-color-3': colors[2],
    '--aurora-color-4': colors[3],
    '--aurora-speed': `${10 / speed}s`,
    backgroundImage: `linear-gradient(to right, 
      ${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[3]}, ${colors[0]})`
  };

  return (
    <span className={`aurora-text ${className}`} style={style}>
      {children}
    </span>
  );
}
