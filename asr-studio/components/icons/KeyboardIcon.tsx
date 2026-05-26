import React from 'react';

export const KeyboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 10h.01" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 10h.01" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h.01" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 10h.01" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 14h.01" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 14h.01" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14h4" />
  </svg>
);
