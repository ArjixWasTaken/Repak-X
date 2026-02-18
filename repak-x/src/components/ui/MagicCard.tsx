import React, { useRef, useState } from 'react';
import './MagicCard.css';

type MagicCardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
};

export function MagicCard({ 
  children, 
  className = '', 
  gradientSize = 200, 
  gradientColor = 'rgba(255, 255, 255, 0.1)',
  gradientOpacity = 0.8,
  ...props 
}: MagicCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      className={`magic-card ${className}`}
      onMouseMove={handleMouseMove}
      style={{
        '--mouse-x': `${position.x}px`,
        '--mouse-y': `${position.y}px`,
        '--gradient-size': `${gradientSize}px`,
        '--gradient-color': gradientColor,
        '--gradient-opacity': gradientOpacity,
      } as React.CSSProperties}
      {...props}
    >
      <div className="magic-card-content">{children}</div>
    </div>
  );
}
