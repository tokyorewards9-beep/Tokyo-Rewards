import React from 'react';
import { Search, Flame, CheckCircle2, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { NavigationTab } from '../../types';

interface RightPanelProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectTopic?: (topic: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ onNavigate, onSelectTopic }) => {
  const exploreTopics = [
    { tag: '#ShibuyaLive', category: 'Culture', postsNote: 'Awaiting sync' },
    { tag: '#TokyoTech2026', category: 'Technology', postsNote: 'Awaiting sync' },
    { tag: '#AkihabaraCreative', category: 'Arts & Media', postsNote: 'Awaiting sync' },
    { tag: '#RoppongiDesign', category: 'Design', postsNote: 'Awaiting sync' },
    { tag: '#TokyoFoodie', category: 'Local Life', postsNote: 'Awaiting sync' },
  ];

  return (
    <aside 
      className="hidden lg:block w-80 xl:w-88 h-[100dvh] sticky top-0 px-4 py-6 overflow-y-auto border-l border-slate-200/90 dark:border-neutral-800/90 select-none shrink-0 space-y-6"
      aria-label="Sidebar Extras"
    >
      {/* Quick Search Bar */}
      <div className="relative">
        <label htmlFor="quick-search" className="sr-only">Quick search</label>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="quick-search"
            type="text"
            placeholder="Search Tokyo Chart..."
            onFocus={() => onNavigate('search')}
            readOnly
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-100/90 dark:bg-neutral-800/90 border border-transparent focus:border-[#0066FF] dark:focus:border-[#00D2FF] rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden transition-all cursor-pointer"
          />
        </div>
      </div>

      {/* Integration Status Roadmap Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
            Platform Status
          </h2>
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Live Connected
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Firebase Auth & Firestore</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Real-time messaging & friend network</p>
            </div>
          </div>

          <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">WebRTC Voice & Video</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">P2P media with Firestore signaling</p>
            </div>
          </div>

          <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Cloudinary Media Engine</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Unsigned uploads (tokyo_chart_uploads)</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigate('settings')}
          className="w-full mt-1 flex items-center justify-between text-xs font-medium text-[#0066FF] dark:text-[#00D2FF] hover:underline pt-2 border-t border-slate-100 dark:border-neutral-800"
        >
          <span>View integration details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Explore Tokyo Topics (Curated directory anchors) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-3 shadow-xs">
        <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
          <Flame className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF]" />
          <h2 className="text-sm font-semibold">Tokyo Channels</h2>
        </div>

        <div className="space-y-2.5">
          {exploreTopics.map((item) => (
            <button
              key={item.tag}
              onClick={() => {
                if (onSelectTopic) onSelectTopic(item.tag);
                onNavigate('search');
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800/60 transition-colors group"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{item.category}</span>
                <span className="text-[10px]">{item.postsNote}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#0066FF] dark:group-hover:text-[#00D2FF] transition-colors mt-0.5">
                {item.tag}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Discreet Platform Footer */}
      <footer className="px-2 text-[11px] text-slate-400 dark:text-slate-500 space-y-1">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <button onClick={() => onNavigate('settings')} className="hover:underline">Privacy</button>
          <span>·</span>
          <button onClick={() => onNavigate('settings')} className="hover:underline">Terms of Service</button>
          <span>·</span>
          <button onClick={() => onNavigate('settings')} className="hover:underline">Guidelines</button>
          <span>·</span>
          <button onClick={() => onNavigate('settings')} className="hover:underline">Security</button>
        </div>
        <p className="text-slate-400/80 dark:text-slate-500/80 pt-1">
          Tokyo Chart © 2026. Production Frontend Foundation.
        </p>
      </footer>
    </aside>
  );
};
