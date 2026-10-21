import React from 'react';
import { Settings, Plus } from 'lucide-react';
import { NavigationTab } from '../../types';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';

interface MobileHeaderProps {
  onNavigate: (tab: NavigationTab) => void;
  onOpenCompose: () => void;
  currentTab: NavigationTab;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  onNavigate, 
  onOpenCompose,
  currentTab 
}) => {
  return (
    <header 
      className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-neutral-800/80 pt-safe"
      aria-label="Mobile Header"
    >
      <button 
        onClick={() => onNavigate('home')} 
        className="focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded-lg"
        aria-label="Tokyo Chart Home"
      >
        <Logo size="sm" />
      </button>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenCompose}
          className="p-2 rounded-xl text-white bg-[#0066FF] hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-hidden"
          aria-label="Create Post"
          title="Create Post"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        <ThemeToggle />

        <button
          onClick={() => onNavigate('settings')}
          className={`p-2 rounded-xl transition-colors focus:outline-hidden ${
            currentTab === 'settings'
              ? 'text-[#0066FF] dark:text-[#00D2FF] bg-blue-50 dark:bg-blue-950/40'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800'
          }`}
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="w-5 h-5 stroke-[1.8]" />
        </button>
      </div>
    </header>
  );
};
