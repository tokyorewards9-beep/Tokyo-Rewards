import React from 'react';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptCall, declineCall } = useCall();

  if (!incomingCall) return null;

  const isVideo = incomingCall.type === 'video';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
    >
      <div className="w-full max-w-sm rounded-3xl bg-[#07152F] text-white p-6 shadow-2xl border border-blue-500/30 flex flex-col items-center text-center space-y-6">
        {/* Pulsing Avatar Frame */}
        <div className="relative">
          <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-[#0066FF] to-[#00D2FF] opacity-60 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-slate-800 border-2 border-[#00D2FF] overflow-hidden flex items-center justify-center shadow-xl">
            {incomingCall.callerAvatar ? (
              <img
                src={incomingCall.callerAvatar}
                alt={incomingCall.callerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white">
                {incomingCall.callerName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Caller Info */}
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-500/20 text-[#00D2FF] border border-blue-400/30">
            {isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            <span>Incoming {isVideo ? 'Video' : 'Voice'} Call</span>
          </span>
          <h2 id="incoming-call-title" className="text-xl font-bold tracking-tight pt-1">
            {incomingCall.callerName}
          </h2>
          <p className="text-xs text-slate-400">
            Tokyo Chart Network Call
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-6 pt-2 w-full">
          {/* Decline */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => declineCall()}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
              title="Decline Call"
              aria-label="Decline Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] text-slate-400 font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => acceptCall()}
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
              title="Accept Call"
              aria-label="Accept Call"
            >
              {isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </button>
            <span className="text-[11px] text-emerald-400 font-medium">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
