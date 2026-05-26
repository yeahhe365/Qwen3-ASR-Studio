import React from 'react';

export const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M5.25 3.75h11.5L20.25 7.25v11.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75v5.5h8v-5.5M8.25 20.25V15h7.5v5.25" />
  </svg>
);
