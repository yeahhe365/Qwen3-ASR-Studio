import React from 'react';

export const SlidersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75h4.25M12.25 6.75H19.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h7.25M15.25 12h4.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 17.25h2.75M10.75 17.25h8.75" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.75 5.25v3M11.75 10.5v3M7.25 15.75v3" />
  </svg>
);
