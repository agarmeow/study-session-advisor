import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'coral'
    | 'amber'
    | 'emerald'
    | 'blue'
    | 'slate'
    | 'outline'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'neutral';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  className = '',
  size = 'md',
}) => {
  // Normalize alias variants
  const resolvedVariant =
    variant === 'success'
      ? 'emerald'
      : variant === 'warning'
      ? 'amber'
      : variant === 'danger'
      ? 'coral'
      : variant === 'info'
      ? 'blue'
      : variant === 'neutral'
      ? 'slate'
      : variant;

  const variantStyles = {
    coral: 'bg-rose-50 text-rose-700 border-rose-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    outline: 'bg-white text-slate-600 border-slate-300',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors ${variantStyles[resolvedVariant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
