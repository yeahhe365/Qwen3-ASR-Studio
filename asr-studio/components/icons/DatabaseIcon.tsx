import React from 'react';

export const DatabaseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 6.75c0-1.66 3.36-3 7.5-3s7.5 1.34 7.5 3-3.36 3-7.5 3-7.5-1.34-7.5-3Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75v5.25c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6.75" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12v5.25c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V12" />
  </svg>
);
