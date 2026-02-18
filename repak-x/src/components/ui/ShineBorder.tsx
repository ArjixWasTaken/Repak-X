import React from 'react';
import './ShineBorder.css';

type ShineBorderProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
  className?: string;
  duration?: number;
  shineColor?: string | string[];
  borderWidth?: number;
  borderRadius?: number;
  style?: React.CSSProperties;
};

export function ShineBorder({
  children,
  className = '',
  duration = 14,
  shineColor = '#ffffff',
  borderWidth = 1,
  borderRadius = 12,
  style = {},
  ...props
}: ShineBorderProps) {
  return (
    <div
      className={`shine-border ${className}`}
      style={{
        '--duration': `${duration}s`,
        '--shine-color': Array.isArray(shineColor) ? shineColor.join(',') : shineColor,
        '--border-width': `${borderWidth}px`,
        '--border-radius': `${borderRadius}px`,
        ...style
      } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}
