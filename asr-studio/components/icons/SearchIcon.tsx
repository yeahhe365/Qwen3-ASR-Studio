import React from 'react';

export const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.75 18.25a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.25 16.25 4 4" />
  </svg>
);
