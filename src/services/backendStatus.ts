/**
 * Tokyo Chart Platform Service Layer & Integration Readiness Contracts
 *
 * This service models the connection status for Stage 1 (Frontend Foundation)
 * and defines the planned interfaces for Stage 2 (Existing Firebase Project Integration).
 *
 * NOTE: Strictly follows rule: No fake users, no fake posts, no fake connections.
 */

import { getFirebaseConfigFromEnv } from './firebase';

export interface SystemStatus {
  stage: 'stage_1_frontend' | 'stage_2_firebase_connected';
  stageName: string;
  isFirebaseConnected: boolean;
  frontendVersion: string;
  environment: 'development' | 'production';
  plannedCollections: {
    name: string;
    description: string;
    status: 'pending_stage_2' | 'ready';
  }[];
}

export const getSystemStatus = (): SystemStatus => {
  const config = getFirebaseConfigFromEnv();
  const isConnected = Boolean(config && config.apiKey && config.projectId);

  return {
    stage: isConnected ? 'stage_2_firebase_connected' : 'stage_1_frontend',
    stageName: isConnected 
      ? 'Stage 2: Firebase Authentication & Firestore Connected' 
      : 'Stage 1: Production Frontend Shell & Design System',
    isFirebaseConnected: isConnected,
    frontendVersion: '1.0.0',
    environment: 'development',
    plannedCollections: [
      {
        name: 'users',
        description: 'User profile metadata, display names, avatars, and timestamps',
        status: isConnected ? 'ready' : 'pending_stage_2',
      },
      {
        name: 'posts',
        description: 'User feeds, status updates, media attachments, and engagement metrics',
        status: isConnected ? 'ready' : 'pending_stage_2',
      },
      {
        name: 'media_uploads',
        description: 'Audit tracking of Cloudinary media secure URLs and metadata',
        status: isConnected ? 'ready' : 'pending_stage_2',
      },
      {
        name: 'friendships',
        description: 'Bi-directional friend associations and request queues',
        status: isConnected ? 'ready' : 'pending_stage_2',
      },
      {
        name: 'conversations',
        description: 'Direct message threads between accepted friends with Cloudinary attachments',
        status: isConnected ? 'ready' : 'pending_stage_2',
      },
      {
        name: 'calls',
        description: 'WebRTC voice & video peer connection signaling and ICE candidates',
        status: isConnected ? 'ready' : 'pending_stage_2',
      },
      {
        name: 'notifications',
        description: 'Targeted user activity notifications and alerts',
        status: isConnected ? 'ready' : 'pending_stage_2',
      },
    ],
  };
};
