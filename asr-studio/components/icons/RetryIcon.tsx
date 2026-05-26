import React from 'react';

export const RetryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M23 4v6h-6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M1 20v-6h6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.49 9A9 9 0 0 0 7.54 5.49" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.51 15A9 9 0 0 0 16.46 18.51" />
  </svg>
);
