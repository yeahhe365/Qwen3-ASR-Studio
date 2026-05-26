import React from 'react';

export const ScissorsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <circle cx="6" cy="8" r="3" />
    <circle cx="6" cy="16" r="3" />
    <line x1="8.5" y1="9.5" x2="14" y2="12" />
    <line x1="8.5" y1="14.5" x2="14" y2="12" />
    <line x1="21" y1="7" x2="14" y2="12" />
    <line x1="21" y1="17" x2="14" y2="12" />
  </svg>
);
