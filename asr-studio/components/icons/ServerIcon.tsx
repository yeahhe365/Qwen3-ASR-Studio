import React from 'react';

export const ServerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M5.25 5.25h13.5A1.5 1.5 0 0 1 20.25 6.75v3A1.5 1.5 0 0 1 18.75 11.25H5.25a1.5 1.5 0 0 1-1.5-1.5v-3A1.5 1.5 0 0 1 5.25 5.25ZM5.25 12.75h13.5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-3a1.5 1.5 0 0 1 1.5-1.5Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h.01M7.5 15.75h.01" />
  </svg>
);
