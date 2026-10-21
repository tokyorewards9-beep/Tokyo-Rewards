import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  statusBadgeText?: string;
  secondaryInfo?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  statusBadgeText,
  secondaryInfo,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-slate-200 dark:border-neutral-800 rounded-2xl bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xs my-4">
      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0066FF] dark:text-[#00D2FF] flex items-center justify-center mb-4 shadow-xs">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
        {title}
      </h3>

      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-4">
        {description}
      </p>

      {statusBadgeText && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
          <span>{statusBadgeText}</span>
        </div>
      )}

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-sm font-medium text-white bg-[#0066FF] hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
        >
          {actionText}
        </button>
      )}

      {secondaryInfo && (
        <span className="text-xs text-slate-400 dark:text-slate-500 mt-4 block">
          {secondaryInfo}
        </span>
      )}
    </div>
  );
};
