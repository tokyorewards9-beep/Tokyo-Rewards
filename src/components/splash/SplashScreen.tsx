import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface SplashScreenProps {
  error?: string | null;
  onRetry?: () => void;
  isFadingOut?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  error,
  onRetry,
  isFadingOut = false,
}) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 select-none bg-[#07152F] text-white transition-opacity duration-300 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } min-h-[100dvh] w-full overflow-hidden`}
      role="status"
      aria-live="polite"
    >
      {/* Subtle background ambient glow matching Tokyo Blue & Cyan */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-[#0066FF]/20 to-[#00D2FF]/20 rounded-full blur-3xl pointer-events-none" 
        aria-hidden="true"
      />

      {/* Top spacer to balance layout */}
      <div className="w-full flex justify-end">
        <span className="text-[11px] font-mono tracking-wider text-slate-500 uppercase">
          Tokyo Chart v1.0
        </span>
      </div>

      {/* Center Brand Hero */}
      <div className="flex flex-col items-center text-center space-y-6 relative z-10 max-w-sm">
        {/* Original Tokyo Chart Logo Mark */}
        <div className="relative group">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0066FF] to-[#00D2FF] p-4 shadow-xl shadow-[#0066FF]/20 flex items-center justify-center transform transition-transform duration-300 motion-safe:hover:scale-105">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-full h-full text-white"
            >
              <path d="M3 18 L8 12 L13 15 L21 6" />
              <circle cx="8" cy="12" r="2" fill="white" stroke="none" />
              <circle cx="13" cy="15" r="2" fill="white" stroke="none" />
              <circle cx="21" cy="6" r="2.5" fill="#00D2FF" stroke="white" strokeWidth="1.5" />
              <circle cx="3" cy="18" r="2" fill="white" stroke="none" />
            </svg>
          </div>
          {/* Subtle radiating glow */}
          <div 
            className="absolute inset-0 rounded-3xl bg-[#00D2FF]/25 blur-lg -z-10 motion-safe:animate-pulse" 
            aria-hidden="true" 
          />
        </div>

        {/* Brand Title & Tagline */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-widest text-white uppercase font-sans">
            TOKYO CHART
          </h1>
          <p className="text-sm font-medium tracking-wide text-slate-300">
            Connect. Share. Belong.
          </p>
        </div>

        {/* State: Initialization Error or Normal Loading Indicator */}
        {error ? (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs text-center space-y-3 shadow-lg max-w-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-center gap-2 text-rose-300 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Initialization Failed</span>
            </div>
            <p className="text-[11px] text-rose-300/90 leading-relaxed">
              {error}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-medium rounded-xl transition-colors text-xs shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Initialization</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3 pt-2">
            {/* Subtle, restrained loader without fake percentage */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2 h-2 rounded-full bg-[#0066FF] motion-safe:animate-ping opacity-75" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#00D2FF] motion-safe:animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-[#0066FF] motion-safe:animate-ping opacity-75" />
            </div>
            <p className="text-xs font-medium text-slate-400 tracking-wide">
              Preparing your experience...
            </p>
          </div>
        )}
      </div>

      {/* Footer Safe Area / Platform Marker */}
      <div className="text-center">
        <p className="text-[11px] text-slate-500 font-medium tracking-wider">
          TOKYO · 2026
        </p>
      </div>
    </div>
  );
};
