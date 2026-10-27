import React from 'react';

interface MetricCardProps {
  label?: string;
  title?: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  title,
  value,
  subtext,
  subtitle,
  icon,
  badge,
  className = '',
}) => {
  const displayLabel = label || title || '';
  const displaySubtext = subtext || subtitle;

  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        <span>{displayLabel}</span>
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-slate-400">{icon}</span>}
          {badge}
        </div>
      </div>
      <div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
          {value}
        </div>
        {displaySubtext && (
          <div className="text-xs text-slate-500 mt-1">{displaySubtext}</div>
        )}
      </div>
    </div>
  );
};
