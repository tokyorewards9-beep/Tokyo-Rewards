/**
 * Global Real-Time Call Context & Provider for Tokyo Chart
 *
 * Listens for incoming calls across all pages.
 * Manages active voice/video call state, media streams, and controls.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  CallSession,
  callManagerInstance,
  listenForIncomingCalls,
} from '../services/callService';
import { FriendProfile } from '../services/friendService';

interface CallContextType {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  callStatus: CallSession['status'] | 'idle';
  callDuration: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callError: string | null;
  startCall: (callee: FriendProfile, type: 'audio' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  cancelCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  dismissCallError: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [callStatus, setCallStatus] = useState<CallSession['status'] | 'idle'>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState<string | null>(null);

  const timerRef = useRef<any>(null);

  // Duration timer when call is accepted/connected
  useEffect(() => {
    if (callStatus === 'accepted') {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (callStatus === 'idle') {
        setCallDuration(0);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callStatus]);

  // Real-time listener for incoming calls directed to signed-in user
  useEffect(() => {
    if (!user?.uid) {
      setIncomingCall(null);
      return;
    }

    const unsubscribe = listenForIncomingCalls(user.uid, (call) => {
      // Only set if we're not currently in an active ongoing call
      if (call && callManagerInstance.getActiveCallId() !== call.id) {
        setIncomingCall(call);
      } else if (!call) {
        setIncomingCall(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  const startCall = useCallback(
    async (callee: FriendProfile, type: 'audio' | 'video') => {
      if (!user) throw new Error('You must be signed in to make a call');
      setCallError(null);
      setIsMuted(false);
      setIsVideoEnabled(type === 'video');

      const callerProfile: FriendProfile = {
        uid: user.uid,
        displayName: user.displayName || 'Tokyo Member',
        username: user.email ? `@${user.email.split('@')[0]}` : '@member',
        avatarUrl: user.photoURL || undefined,
        email: user.email || '',
      };

      try {
        setCallStatus('ringing');
        const callId = await callManagerInstance.startOutgoingCall(
          callerProfile,
          callee,
          type,
          (s) => setLocalStream(s),
          (r) => setRemoteStream(r),
          (status) => {
            setCallStatus(status);
            if (status === 'declined') {
              setCallError(`${callee.displayName} declined the call.`);
              setTimeout(() => {
                setActiveCall(null);
                setCallStatus('idle');
              }, 2500);
            } else if (status === 'ended' || status === 'cancelled') {
              setActiveCall(null);
              setCallStatus('idle');
            }
          }
        );

        setActiveCall({
          id: callId,
          callerId: user.uid,
          callerName: callerProfile.displayName,
          callerAvatar: callerProfile.avatarUrl,
          calleeId: callee.uid,
          calleeName: callee.displayName,
          calleeAvatar: callee.avatarUrl,
          type,
          status: 'ringing',
        });
      } catch (err: any) {
        console.error('Failed to start call:', err);
        setCallError(err.message || 'Unable to start call');
        setCallStatus('idle');
        setActiveCall(null);
        callManagerInstance.cleanup();
      }
    },
    [user]
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    setCallError(null);
    setIsMuted(false);
    setIsVideoEnabled(incomingCall.type === 'video');

    const callToAnswer = incomingCall;
    setIncomingCall(null);
    setActiveCall(callToAnswer);
    setCallStatus('ringing');

    try {
      await callManagerInstance.answerIncomingCall(
        callToAnswer.id,
        (s) => setLocalStream(s),
        (r) => setRemoteStream(r),
        (status) => {
          setCallStatus(status);
          if (status === 'ended' || status === 'cancelled' || status === 'declined') {
            setActiveCall(null);
            setCallStatus('idle');
          }
        }
      );
    } catch (err: any) {
      console.error('Failed to answer call:', err);
      setCallError(err.message || 'Unable to connect call');
      setActiveCall(null);
      setCallStatus('idle');
      callManagerInstance.cleanup();
    }
  }, [incomingCall]);

  const declineCall = useCallback(async () => {
    if (!incomingCall) return;
    const callId = incomingCall.id;
    setIncomingCall(null);
    await callManagerInstance.declineCall(callId);
  }, [incomingCall]);

  const cancelCall = useCallback(async () => {
    if (!activeCall) return;
    const callId = activeCall.id;
    setActiveCall(null);
    setCallStatus('idle');
    await callManagerInstance.cancelCall(callId);
  }, [activeCall]);

  const endCall = useCallback(async () => {
    if (!activeCall) return;
    const callId = activeCall.id;
    setActiveCall(null);
    setCallStatus('idle');
    await callManagerInstance.endCall(callId);
  }, [activeCall]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      callManagerInstance.toggleMicrophone(!next);
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled((prev) => {
      const next = !prev;
      callManagerInstance.toggleCamera(next);
      return next;
    });
  }, []);

  const dismissCallError = useCallback(() => {
    setCallError(null);
  }, []);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        callStatus,
        callDuration,
        localStream,
        remoteStream,
        isMuted,
        isVideoEnabled,
        callError,
        startCall,
        acceptCall,
        declineCall,
        cancelCall,
        endCall,
        toggleMute,
        toggleVideo,
        dismissCallError,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = (): CallContextType => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
