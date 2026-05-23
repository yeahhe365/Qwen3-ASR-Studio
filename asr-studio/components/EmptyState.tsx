import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, className = '' }) => (
  <div className={`flex h-full min-h-[140px] flex-col items-center justify-center px-4 py-8 text-center ${className}`}>
    {icon && (
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-base-300 bg-base-200 text-content-200 shadow-sm">
        {icon}
      </div>
    )}
    <p className="text-sm font-semibold text-content-100">{title}</p>
    {description && <p className="mt-1 max-w-xs text-xs leading-5 text-content-200">{description}</p>}
  </div>
);
