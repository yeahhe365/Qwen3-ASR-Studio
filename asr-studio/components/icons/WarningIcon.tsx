import React from 'react';

export const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75 21 19.5H3L12 3.75Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4.5M12 16.5h.01" />
  </svg>
);
