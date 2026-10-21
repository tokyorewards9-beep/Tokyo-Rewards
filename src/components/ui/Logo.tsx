import React from 'react';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  showWordmark = true,
  size = 'md' 
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-base' },
    md: { icon: 34, text: 'text-lg' },
    lg: { icon: 44, text: 'text-2xl' },
  };

  const { icon, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      {/* Tokyo Chart Original Geometric Mark */}
      <div 
        className="relative shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0066FF] to-[#00D2FF] p-2 shadow-sm text-white transition-transform hover:scale-105"
        style={{ width: icon, height: icon }}
        aria-hidden="true"
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-full h-full text-white"
        >
          {/* Constellation / chart node network */}
          <path d="M3 18 L8 12 L13 15 L21 6" />
          <circle cx="8" cy="12" r="2" fill="white" stroke="none" />
          <circle cx="13" cy="15" r="2" fill="white" stroke="none" />
          <circle cx="21" cy="6" r="2.5" fill="#00D2FF" stroke="white" strokeWidth="1.5" />
          <circle cx="3" cy="18" r="2" fill="white" stroke="none" />
        </svg>
      </div>

      {showWordmark && (
        <span className={`font-bold tracking-tight text-slate-900 dark:text-white ${text} flex items-center gap-1`}>
          <span>Tokyo</span>
          <span className="text-[#0066FF] dark:text-[#00D2FF]">Chart</span>
        </span>
      )}
    </div>
  );
};
