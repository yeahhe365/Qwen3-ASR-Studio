import React from 'react';

export const AppWindowIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25V6.75Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 8.25h15M7.5 6.5h.01M10 6.5h.01" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v4m0 0-1.75-1.75M12 16l1.75-1.75" />
  </svg>
);
