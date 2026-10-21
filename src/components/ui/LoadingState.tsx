import React from 'react';

export const FeedSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 w-full" aria-label="Loading feed items" role="status">
      {[1, 2, 3].map((key) => (
        <div 
          key={key} 
          className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 animate-pulse space-y-3.5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-neutral-800 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-28 bg-slate-200 dark:bg-neutral-800 rounded-md" />
              <div className="h-3 w-16 bg-slate-100 dark:bg-neutral-800/60 rounded-md" />
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-3.5 w-full bg-slate-200 dark:bg-neutral-800 rounded-md" />
            <div className="h-3.5 w-4/5 bg-slate-200 dark:bg-neutral-800 rounded-md" />
            <div className="h-3.5 w-2/5 bg-slate-100 dark:bg-neutral-800/60 rounded-md" />
          </div>
          <div className="pt-2 flex items-center gap-8">
            <div className="h-4 w-12 bg-slate-100 dark:bg-neutral-800/60 rounded-md" />
            <div className="h-4 w-12 bg-slate-100 dark:bg-neutral-800/60 rounded-md" />
            <div className="h-4 w-12 bg-slate-100 dark:bg-neutral-800/60 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div 
      className={`inline-block animate-spin rounded-full border-slate-300 dark:border-neutral-700 border-t-[#0066FF] ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};
