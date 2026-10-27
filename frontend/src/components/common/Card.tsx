import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  orientation?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  badge,
  padding = 'lg',
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  };

  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-xl shadow-xs ${paddingStyles[padding]} ${className}`}
    >
      {(title || subtitle || action || badge) && (
        <div className="flex items-start justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-slate-900 leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {badge}
            {action}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};
