import React from 'react';

export const DocumentTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M7.5 3.75h6.25L18 8v12.25H7.5A1.5 1.5 0 0 1 6 18.75V5.25a1.5 1.5 0 0 1 1.5-1.5Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3.75V8.25H18" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 15h6M9 18h3.75" />
  </svg>
);
