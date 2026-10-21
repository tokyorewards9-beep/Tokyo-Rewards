/**
 * Real WebRTC Voice and Video Calling Service with Firestore Signaling
 *
 * Implements:
 * - Real browser getUserMedia camera & microphone streams
 * - Peer-to-peer RTCPeerConnection with STUN ICE servers
 * - Firestore signaling channel for SDP offers, answers, and ICE candidates
 * - Incoming/outgoing call states, ringing, accept, decline, cancel, hangup, track toggles
 * - Thorough track cleanup, listener detaching, and error handling (NotAllowedError, NotFoundError)
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import { FriendProfile } from './friendService';

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'declined' | 'cancelled' | 'ended' | 'missed';
  offer?: { type: RTCSdpType; sdp: string };
  answer?: { type: RTCSdpType; sdp: string };
  createdAt?: any;
  endedAt?: any;
}

export const RTC_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: ['stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302'] },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * Retrieves ICE configuration including standard STUN servers and any
 * custom TURN servers configured for restrictive NATs/firewalls.
 */
export const getIceConfiguration = (): RTCConfiguration => {
  if (typeof window !== 'undefined') {
    const customConfig = localStorage.getItem('tokyo_chart_rtc_ice_servers');
    if (customConfig) {
      try {
        const parsed = JSON.parse(customConfig);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {
            iceServers: [...(RTC_ICE_SERVERS.iceServers || []), ...parsed],
            iceCandidatePoolSize: 10,
          };
        }
      } catch (e) {
        console.warn('Could not parse custom TURN configuration:', e);
      }
    }
  }
  return RTC_ICE_SERVERS;
};

// Global active WebRTC controller reference for active call
class CallManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callDocUnsub: Unsubscribe | null = null;
  private candidatesUnsub: Unsubscribe | null = null;
  private activeCallId: string | null = null;

  public getActiveCallId(): string | null {
    return this.activeCallId;
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public toggleMicrophone(enabled: boolean): boolean {
    if (!this.localStream) return false;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    return enabled;
  }

  public toggleCamera(enabled: boolean): boolean {
    if (!this.localStream) return false;
    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    return enabled;
  }

  public cleanup(): void {
    if (this.callDocUnsub) {
      this.callDocUnsub();
      this.callDocUnsub = null;
    }
    if (this.candidatesUnsub) {
      this.candidatesUnsub();
      this.candidatesUnsub = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {
          console.warn('Error stopping local track:', e);
        }
      });
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {
          console.warn('Error stopping remote track:', e);
        }
      });
      this.remoteStream = null;
    }
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {
        console.warn('Error closing peer connection:', e);
      }
      this.peerConnection = null;
    }
    this.activeCallId = null;
  }

  /**
   * Acquire user media with descriptive error messages
   */
  public async acquireMedia(type: 'audio' | 'video'): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Microphone and/or camera access was denied. Please allow permissions in your browser bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No audio or video input devices were found on this computer or phone.');
      } else if (err.name === 'NotReadableError') {
        throw new Error('Your camera or microphone is already in use by another application.');
      }
      throw new Error(`Media access error: ${err.message || String(err)}`);
    }
  }

  /**
   * Caller initiates an outgoing call
   */
  public async startOutgoingCall(
    caller: FriendProfile,
    callee: FriendProfile,
    type: 'audio' | 'video',
    onLocalStream: (s: MediaStream) => void,
    onRemoteStream: (s: MediaStream) => void,
    onStatusChange: (status: CallSession['status']) => void
  ): Promise<string> {
    this.cleanup();
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Firestore is not configured');

    const stream = await this.acquireMedia(type);
    onLocalStream(stream);

    const pc = new RTCPeerConnection(getIceConfiguration());
    this.peerConnection = pc;

    // Attach local stream tracks to WebRTC peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Remote stream receiver
    const remote = new MediaStream();
    this.remoteStream = remote;
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remote.addTrack(track);
      });
      onRemoteStream(remote);
    };

    // Create call document reference
    const callDocRef = doc(collection(db, 'calls'));
    const callId = callDocRef.id;
    this.activeCallId = callId;

    const callerCandidatesCol = collection(db, 'calls', callId, 'callerCandidates');
    const calleeCandidatesCol = collection(db, 'calls', callId, 'calleeCandidates');

    // Collect ICE candidates and store in Firestore
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(callerCandidatesCol, event.candidate.toJSON()).catch((e) => {
          console.warn('Failed to send caller ICE candidate:', e);
        });
      }
    };

    // Create SDP offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const callPayload = {
      id: callId,
      callerId: caller.uid,
      callerName: caller.displayName || 'Tokyo Member',
      callerAvatar: caller.avatarUrl || null,
      calleeId: callee.uid,
      calleeName: callee.displayName || 'Tokyo Member',
      calleeAvatar: callee.avatarUrl || null,
      type,
      status: 'ringing',
      offer: {
        type: offerDescription.type,
        sdp: offerDescription.sdp,
      },
      createdAt: serverTimestamp(),
    };

    await setDoc(callDocRef, callPayload);

    // Listen to call document for answer or status changes (e.g. accepted, declined)
    this.callDocUnsub = onSnapshot(callDocRef, async (snapshot) => {
      const data = snapshot.data() as CallSession | undefined;
      if (!data) return;

      if (data.status) {
        onStatusChange(data.status);
      }

      if (data.answer && !pc.currentRemoteDescription && pc.signalingState !== 'closed') {
        try {
          const answerDescription = new RTCSessionDescription(data.answer);
          await pc.setRemoteDescription(answerDescription);
        } catch (e) {
          console.error('Failed to set remote description on caller:', e);
        }
      }

      if (data.status === 'declined' || data.status === 'ended' || data.status === 'cancelled') {
        this.cleanup();
      }
    });

    // Listen for callee's ICE candidates
    this.candidatesUnsub = onSnapshot(calleeCandidatesCol, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data();
          try {
            if (pc.remoteDescription && pc.signalingState !== 'closed') {
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            }
          } catch (e) {
            console.warn('Error adding callee ICE candidate on caller:', e);
          }
        }
      });
    });

    return callId;
  }

  /**
   * Callee accepts an incoming call
   */
  public async answerIncomingCall(
    callId: string,
    onLocalStream: (s: MediaStream) => void,
    onRemoteStream: (s: MediaStream) => void,
    onStatusChange: (status: CallSession['status']) => void
  ): Promise<void> {
    this.cleanup();
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Firestore is not configured');

    const callDocRef = doc(db, 'calls', callId);
    const callSnap = await getDoc(callDocRef);
    if (!callSnap.exists()) throw new Error('Call session not found or expired');

    const callData = callSnap.data() as CallSession;
    if (callData.status !== 'ringing') {
      throw new Error(`Call is no longer active (status: ${callData.status})`);
    }

    this.activeCallId = callId;

    const stream = await this.acquireMedia(callData.type);
    onLocalStream(stream);

    const pc = new RTCPeerConnection(getIceConfiguration());
    this.peerConnection = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    const remote = new MediaStream();
    this.remoteStream = remote;
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remote.addTrack(track);
      });
      onRemoteStream(remote);
    };

    const callerCandidatesCol = collection(db, 'calls', callId, 'callerCandidates');
    const calleeCandidatesCol = collection(db, 'calls', callId, 'calleeCandidates');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(calleeCandidatesCol, event.candidate.toJSON()).catch((e) => {
          console.warn('Failed to send callee ICE candidate:', e);
        });
      }
    };

    // Set remote description from caller's offer
    if (callData.offer) {
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
    }

    // Create SDP answer
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    await updateDoc(callDocRef, {
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      },
      status: 'accepted',
    });

    onStatusChange('accepted');

    // Listen to call doc for remote termination
    this.callDocUnsub = onSnapshot(callDocRef, (snapshot) => {
      const data = snapshot.data() as CallSession | undefined;
      if (!data) return;

      if (data.status) {
        onStatusChange(data.status);
      }

      if (data.status === 'ended' || data.status === 'cancelled') {
        this.cleanup();
      }
    });

    // Listen to caller candidates
    this.candidatesUnsub = onSnapshot(callerCandidatesCol, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data();
          try {
            if (pc.remoteDescription && pc.signalingState !== 'closed') {
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            }
          } catch (e) {
            console.warn('Error adding caller ICE candidate on callee:', e);
          }
        }
      });
    });
  }

  /**
   * Decline an incoming call
   */
  public async declineCall(callId: string): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) return;
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'declined',
        endedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Error declining call in Firestore:', e);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Cancel an outgoing call before answer
   */
  public async cancelCall(callId: string): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) return;
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'cancelled',
        endedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Error cancelling call in Firestore:', e);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Hang up an active call
   */
  public async endCall(callId: string): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) return;
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'ended',
        endedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Error ending call in Firestore:', e);
    } finally {
      this.cleanup();
    }
  }
}

export const callManagerInstance = new CallManager();

/**
 * Listens for incoming calls to the signed-in user in real-time
 */
export const listenForIncomingCalls = (
  currentUserId: string,
  onIncomingCall: (call: CallSession | null) => void
): Unsubscribe => {
  const db = getFirebaseFirestore();
  if (!db || !currentUserId) return () => {};

  const path = 'calls';
  const q = query(
    collection(db, path),
    where('calleeId', '==', currentUserId),
    where('status', '==', 'ringing'),
    limit(1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data() as Omit<CallSession, 'id'>;
        onIncomingCall({ id: docSnap.id, ...data });
      } else {
        onIncomingCall(null);
      }
    },
    (err) => {
      console.warn('Error listening for incoming calls:', err);
    }
  );
};
