import React from 'react';
import { 
  Home, 
  Search, 
  Users, 
  MessageSquare, 
  Bell, 
  User, 
  Settings, 
  PlusCircle,
  Database,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  onOpenCompose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  onOpenCompose,
}) => {
  const { user, isFirebaseConfigured, signOut, previewShellMode, setPreviewShellMode } = useAuth();

  const navItems: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside 
      className="hidden md:flex flex-col justify-between w-64 lg:w-72 h-[100dvh] sticky top-0 px-4 py-6 border-r border-slate-200/90 dark:border-neutral-800/90 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md select-none z-30 shrink-0"
      aria-label="Main Navigation"
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-3 flex items-center justify-between">
          <button 
            onClick={() => onNavigate('home')} 
            className="text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded-xl"
            aria-label="Tokyo Chart Home"
          >
            <Logo size="md" />
          </button>
          <ThemeToggle />
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1" aria-label="Sidebar links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 group text-left ${
                  isActive
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 text-[#0066FF] dark:text-[#00D2FF] font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-neutral-800/60'
                } focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0066FF]`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon 
                  className={`w-5 h-5 transition-transform group-hover:scale-105 shrink-0 ${
                    isActive 
                      ? 'text-[#0066FF] dark:text-[#00D2FF] stroke-[2.2]' 
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 stroke-[1.8]'
                  }`} 
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* New Post Primary Action */}
        <div className="pt-2 px-1">
          <button
            onClick={onOpenCompose}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm text-white bg-[#0066FF] hover:bg-blue-700 active:bg-blue-800 shadow-sm transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>Create Post</span>
          </button>
        </div>
      </div>

      {/* Footer Profile & Stage Status Card */}
      <div className="space-y-3 pt-4 border-t border-slate-200/80 dark:border-neutral-800/80">
        {/* Stage & Connection Status Notice */}
        <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900/80 border border-slate-200/60 dark:border-neutral-800/60 text-xs">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
              <Database className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#00D2FF]" />
              <span>Firebase Auth</span>
            </div>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              isFirebaseConfigured
                ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/60'
                : 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/60'
            }`}>
              {isFirebaseConfigured ? 'Connected' : 'Pending Stage 2'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            {isFirebaseConfigured ? 'Real session verification active.' : 'UI Shell active. Awaiting project credentials.'}
          </p>
        </div>

        {/* User Card & Logout/Return */}
        <div className="space-y-1">
          <button
            onClick={() => onNavigate('profile')}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100/70 dark:hover:bg-neutral-800/70 transition-colors text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0066FF]"
            aria-label="View current user profile"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0066FF] to-[#00D2FF] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'TC'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {user?.displayName || (previewShellMode ? 'Preview Explorer' : 'Tokyo Member')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.email || (previewShellMode ? 'Unauthenticated Mode' : '@tokyouser')}
              </p>
            </div>
          </button>

          {previewShellMode && (
            <button
              onClick={() => setPreviewShellMode(false)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Welcome Screen</span>
            </button>
          )}

          {user && (
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
