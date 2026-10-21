/**
 * Real Firestore Direct Messaging Service
 *
 * Implements real-time 1-on-1 conversations between accepted friends.
 * Handles text, image, and video messages with Cloudinary metadata persistence.
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
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  increment,
  limit,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import { FriendProfile } from './friendService';
import { MediaAttachment } from '../types';

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  type: 'text' | 'image' | 'video';
  mediaUrl?: string;
  mediaPublicId?: string;
  mediaResourceType?: 'image' | 'video';
  read: boolean;
  createdAt: any;
}

export interface ConversationItem {
  id: string;
  participantIds: string[];
  participantDetails: Record<string, FriendProfile>;
  lastMessage?: {
    text: string;
    senderId: string;
    type: 'text' | 'image' | 'video';
    createdAt: any;
  };
  unreadCounts?: Record<string, number>;
  updatedAt?: any;
  createdAt?: any;
}

/**
 * Generate a deterministic conversation ID for two participants
 */
export const getConversationId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_');
};

/**
 * Creates or reuses a conversation between two accepted friends
 */
export const getOrCreateConversation = async (
  currentUser: FriendProfile,
  friendUser: FriendProfile
): Promise<string> => {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not configured');

  const conversationId = getConversationId(currentUser.uid, friendUser.uid);
  const convRef = doc(db, 'conversations', conversationId);

  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      await setDoc(convRef, {
        id: conversationId,
        participantIds: [currentUser.uid, friendUser.uid].sort(),
        participantDetails: {
          [currentUser.uid]: currentUser,
          [friendUser.uid]: friendUser,
        },
        unreadCounts: {
          [currentUser.uid]: 0,
          [friendUser.uid]: 0,
        },
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    } else {
      // Refresh participant profiles if names or avatars changed
      await updateDoc(convRef, {
        [`participantDetails.${currentUser.uid}`]: currentUser,
        [`participantDetails.${friendUser.uid}`]: friendUser,
      });
    }

    return conversationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${conversationId}`);
  }
};

/**
 * Listens to active conversations for the current user
 */
export const listenToUserConversations = (
  currentUserId: string,
  onUpdate: (conversations: ConversationItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const db = getFirebaseFirestore();
  if (!db || !currentUserId) {
    onUpdate([]);
    return () => {};
  }

  const path = 'conversations';
  // Query all conversations where currentUserId is one of the participants
  const q = query(
    collection(db, path),
    where('participantIds', 'array-contains', currentUserId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ConversationItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<ConversationItem, 'id'>) });
      });
      onUpdate(list);
    },
    (err) => {
      // Fallback without orderBy in case index is building
      console.warn('Conversations query with orderBy failed, attempting fallback query:', err);
      const fallbackQuery = query(
        collection(db, path),
        where('participantIds', 'array-contains', currentUserId)
      );

      return onSnapshot(
        fallbackQuery,
        (snapshot) => {
          const list: ConversationItem[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<ConversationItem, 'id'>) });
          });
          // Sort client side by updatedAt
          list.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
            const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
            return timeB - timeA;
          });
          onUpdate(list);
        },
        (fallbackErr) => {
          if (onError) onError(fallbackErr);
          handleFirestoreError(fallbackErr, OperationType.GET, path);
        }
      );
    }
  );
};

/**
 * Listens to real-time messages in a specific conversation
 */
export const listenToConversationMessages = (
  conversationId: string,
  onUpdate: (messages: ChatMessageItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const db = getFirebaseFirestore();
  if (!db || !conversationId) {
    onUpdate([]);
    return () => {};
  }

  const path = `conversations/${conversationId}/messages`;
  const q = query(collection(db, path), orderBy('createdAt', 'asc'), limit(150));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ChatMessageItem[] = [];
      snapshot.forEach((docSnap) => {
        messages.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ChatMessageItem, 'id'>),
        });
      });
      onUpdate(messages);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
};

/**
 * Send a text message inside a conversation
 */
export const sendDirectTextMessage = async (
  conversationId: string,
  senderId: string,
  receiverId: string,
  text: string
): Promise<string> => {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not configured');

  if (!text.trim()) {
    throw new Error('Message text cannot be empty');
  }

  const messagesPath = `conversations/${conversationId}/messages`;
  try {
    // 1. Add message doc
    const msgRef = await addDoc(collection(db, messagesPath), {
      conversationId,
      senderId,
      receiverId,
      text: text.trim(),
      type: 'text',
      read: false,
      createdAt: serverTimestamp(),
    });

    // 2. Update conversation summary doc
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: {
        id: msgRef.id,
        text: text.trim(),
        senderId,
        type: 'text',
        createdAt: serverTimestamp(),
      },
      [`unreadCounts.${receiverId}`]: increment(1),
      updatedAt: serverTimestamp(),
    });

    return msgRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, messagesPath);
  }
};

/**
 * Send an image or video message using Cloudinary media
 */
export const sendDirectMediaMessage = async (
  conversationId: string,
  senderId: string,
  receiverId: string,
  text: string,
  mediaAttachment: MediaAttachment
): Promise<string> => {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not configured');

  const messagesPath = `conversations/${conversationId}/messages`;
  try {
    const isVideo = mediaAttachment.resourceType === 'video';
    const messageType: 'image' | 'video' = isVideo ? 'video' : 'image';
    const messagePreview = text.trim() || (isVideo ? '🎥 Video' : '📷 Photo');

    const msgRef = await addDoc(collection(db, messagesPath), {
      conversationId,
      senderId,
      receiverId,
      text: text.trim(),
      type: messageType,
      mediaUrl: mediaAttachment.secureUrl,
      mediaPublicId: mediaAttachment.publicId,
      mediaResourceType: mediaAttachment.resourceType,
      read: false,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: {
        id: msgRef.id,
        text: messagePreview,
        senderId,
        type: messageType,
        createdAt: serverTimestamp(),
      },
      [`unreadCounts.${receiverId}`]: increment(1),
      updatedAt: serverTimestamp(),
    });

    // Track in audit collection
    await addDoc(collection(db, 'media_uploads'), {
      userId: senderId,
      type: 'chat_media',
      secureUrl: mediaAttachment.secureUrl,
      publicId: mediaAttachment.publicId,
      resourceType: mediaAttachment.resourceType,
      conversationId,
      uploadedAt: serverTimestamp(),
    });

    return msgRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, messagesPath);
  }
};

/**
 * Mark all unread messages as read in conversation
 */
export const markConversationAsRead = async (
  conversationId: string,
  currentUserId: string
): Promise<void> => {
  const db = getFirebaseFirestore();
  if (!db || !conversationId || !currentUserId) return;

  try {
    await updateDoc(doc(db, 'conversations', conversationId), {
      [`unreadCounts.${currentUserId}`]: 0,
    });
  } catch (e) {
    console.warn('Could not reset conversation unread count:', e);
  }
};
