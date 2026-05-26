import React from 'react';

export const StorageIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M4.5 7.5A2.25 2.25 0 0 1 6.75 5.25h10.5A2.25 2.25 0 0 1 19.5 7.5v9a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 16.5v-9Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15.75h9M8.25 8.25h7.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75h.01" />
  </svg>
);
