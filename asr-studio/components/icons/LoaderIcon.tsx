import React from 'react';

interface LoaderIconProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string;
}

export const LoaderIcon: React.FC<LoaderIconProps> = ({ className, color = 'currentColor', ...props }) => (
  <div className={`flex items-center justify-center ${className}`} style={{ gap: '0.5rem' }} {...props}>
    <div className="w-3 h-3 rounded-full animate-pulsing-dot" style={{ backgroundColor: color }}></div>
    <div
      className="w-3 h-3 rounded-full animate-pulsing-dot"
      style={{ backgroundColor: color, animationDelay: '0.2s' }}
    ></div>
    <div
      className="w-3 h-3 rounded-full animate-pulsing-dot"
      style={{ backgroundColor: color, animationDelay: '0.4s' }}
    ></div>
  </div>
);
