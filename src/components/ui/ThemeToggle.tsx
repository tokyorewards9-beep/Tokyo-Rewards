import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ThemeMode } from '../../types';

interface ThemeToggleProps {
  variant?: 'icon' | 'segmented';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'icon', className = '' }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (variant === 'segmented') {
    const modes: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
      { id: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
      { id: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
      { id: 'system', label: 'System', icon: <Monitor className="w-3.5 h-3.5" /> },
    ];

    return (
      <div 
        className={`flex items-center gap-1 p-1 bg-slate-100 dark:bg-neutral-800 rounded-lg border border-slate-200/80 dark:border-neutral-700/80 ${className}`}
        role="group"
        aria-label="Theme mode selection"
      >
        {modes.map((m) => {
          const isActive = theme === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setTheme(m.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white dark:bg-neutral-900 text-[#0066FF] dark:text-[#00D2FF] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              aria-pressed={isActive}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Quick toggle between light and dark
  const handleToggle = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0066FF] ${className}`}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode (currently ${theme})`}
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
};
