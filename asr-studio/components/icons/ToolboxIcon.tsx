import React from 'react';

export const ToolboxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M8.25 7.5V6A2.25 2.25 0 0 1 10.5 3.75h3A2.25 2.25 0 0 1 15.75 6v1.5"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 8.25h15a1.5 1.5 0 0 1 1.5 1.5v8.25a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18V9.75a1.5 1.5 0 0 1 1.5-1.5Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12.75h18M10.5 12.75v1.5h3v-1.5" />
  </svg>
);
