import React, { useEffect, useRef, useState } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  ShieldCheck, 
  Info,
  Maximize2,
  Minimize2,
  Radio,
  Wifi
} from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const ActiveCallOverlay: React.FC = () => {
  const {
    activeCall,
    callStatus,
    callDuration,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    callError,
    toggleMute,
    toggleVideo,
    endCall,
    cancelCall,
    dismissCallError,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);

  // Bind local media stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled]);

  // Bind remote media stream to remote video & audio elements
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch((e) => {
        console.warn('Audio auto-play blocked by browser:', e);
      });
    }
  }, [remoteStream, callStatus]);

  if (!activeCall) return null;

  const isVideo = activeCall.type === 'video';
  const otherPartyName = activeCall.callerName === activeCall.calleeName 
    ? 'Participant' 
    : (activeCall.status === 'ringing' && localStream ? activeCall.calleeName : activeCall.callerName);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`fixed z-50 transition-all duration-300 ${
        isExpanded 
          ? 'inset-0 bg-black/90 flex flex-col justify-between p-4 sm:p-6'
          : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[92vw] max-w-sm rounded-3xl bg-[#07152F] border border-blue-500/40 shadow-2xl overflow-hidden text-white'
      }`}
      role="dialog"
      aria-label="Active Call Session"
    >
      {/* Hidden remote audio element for voice audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Header bar */}
      <div className="flex items-center justify-between p-4 bg-slate-900/60 backdrop-blur-sm border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="min-w-0">
            <h3 className="text-xs font-bold truncate">
              {otherPartyName}
            </h3>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              {callStatus === 'accepted' ? (
                <>
                  <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Connected · {formatDuration(callDuration)}</span>
                </>
              ) : (
                <>
                  <Radio className="w-2.5 h-2.5 text-[#00D2FF] animate-spin" />
                  <span>Ringing peer...</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNetworkInfo(!showNetworkInfo)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="ICE / TURN Network Signaling Info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title={isExpanded ? 'Minimize call window' : 'Expand full screen'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Network / TURN Server Info Overlay */}
      {showNetworkInfo && (
        <div className="p-3 bg-blue-950/80 border-b border-blue-800/60 text-[11px] leading-relaxed text-blue-200 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00D2FF]" />
            <span>WebRTC P2P Signaling via Firestore</span>
          </div>
          <p>
            STUN servers (Google STUN) resolve NAT IPs for direct browser-to-browser audio/video streams.
          </p>
          <p className="text-[10px] text-blue-300">
            For symmetric corporate firewalls, a TURN relay server (e.g. Coturn or Twilio) can be configured in RTC settings.
          </p>
        </div>
      )}

      {/* Call Error Banner */}
      {callError && (
        <div className="p-3 bg-rose-950/90 border-b border-rose-800 text-[11px] text-rose-200 flex items-start justify-between gap-2">
          <p className="flex-1">{callError}</p>
          <button
            onClick={dismissCallError}
            className="text-rose-400 hover:text-white font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Video & Media Canvas Area */}
      <div className={`relative flex-1 bg-black flex items-center justify-center overflow-hidden ${isExpanded ? 'min-h-[50vh]' : 'h-48'}`}>
        {isVideo ? (
          <>
            {/* Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Waiting indicator when remote stream hasn't produced video track yet */}
            {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#07152F] to-[#040C1A] text-slate-300">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-[#00D2FF]/40 flex items-center justify-center text-xl font-bold text-[#00D2FF] animate-pulse">
                  {otherPartyName.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs text-slate-400">
                  {callStatus === 'accepted' ? 'Waiting for remote video track...' : 'Establishing peer connection...'}
                </span>
              </div>
            )}

            {/* Local Video PIP Preview */}
            <div className="absolute bottom-2 right-2 w-24 h-32 sm:w-28 sm:h-36 rounded-xl overflow-hidden border-2 border-white/20 bg-slate-900 shadow-xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-slate-950 flex items-center justify-center text-[10px] text-slate-400">
                  Camera Off
                </div>
              )}
            </div>
          </>
        ) : (
          /* Voice Call Visualizer Screen */
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#07152F] via-[#091D3E] to-[#040C1A] p-4 text-center space-y-3">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#0066FF] to-[#00D2FF] opacity-40 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-slate-800 border-2 border-[#00D2FF] overflow-hidden flex items-center justify-center shadow-xl">
                <span className="text-2xl font-bold text-white">
                  {otherPartyName.slice(0, 2).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-0.5">
              <p className="text-sm font-bold text-white">{otherPartyName}</p>
              <p className="text-xs text-[#00D2FF]">
                {callStatus === 'accepted' ? 'High-Definition Audio Active' : 'Connecting Audio Stream...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Call Action Bar Controls */}
      <div className="p-3.5 bg-slate-950/90 border-t border-white/10 flex items-center justify-center gap-4 shrink-0">
        {/* Toggle Microphone */}
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full transition-all cursor-pointer ${
            isMuted 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30' 
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Toggle Camera (if video call) */}
        {isVideo && (
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-all cursor-pointer ${
              !isVideoEnabled 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
            aria-label={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
          >
            {!isVideoEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
        )}

        {/* End / Cancel Call */}
        <button
          onClick={() => {
            if (callStatus === 'ringing') {
              cancelCall();
            } else {
              endCall();
            }
          }}
          className="p-3 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-lg shadow-rose-900/50 transition-all cursor-pointer"
          title="Hang Up"
          aria-label="Hang Up"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
