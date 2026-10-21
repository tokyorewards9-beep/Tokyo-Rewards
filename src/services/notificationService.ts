/**
 * Real Firestore Notifications Service
 *
 * Implements in-app notifications for friend requests, post likes, and comments.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  limit,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: 'like' | 'comment' | 'friend_request' | 'system_alert';
  title: string;
  body: string;
  targetId?: string; // postId or conversationId
  read: boolean;
  createdAt: any;
}

/**
 * Listen to notifications for the current signed-in user
 */
export const listenToUserNotifications = (
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const db = getFirebaseFirestore();
  if (!db || !userId) {
    onUpdate([]);
    return () => {};
  }

  const path = 'notifications';
  const q = query(
    collection(db, path),
    where('recipientId', '==', userId),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          recipientId: data.recipientId,
          senderId: data.senderId,
          senderName: data.senderName || 'Tokyo Member',
          senderAvatar: data.senderAvatar || undefined,
          type: data.type || 'system_alert',
          title: data.title || 'Notification',
          body: data.body || '',
          targetId: data.targetId || undefined,
          read: !!data.read,
          createdAt: data.createdAt,
        });
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      onUpdate(list);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
};

/**
 * Create a new notification
 */
export const createNotification = async (
  notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>
): Promise<string | undefined> => {
  const db = getFirebaseFirestore();
  if (!db) return;

  // Don't notify self
  if (notification.senderId === notification.recipientId) return;

  const path = 'notifications';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.warn('Failed to dispatch notification:', error);
  }
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (notificationId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  if (!db) return;

  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
    });
  } catch (e) {
    console.warn('Could not mark notification read:', e);
  }
};

/**
 * Mark all notifications as read for user
 */
export const markAllNotificationsRead = async (notifications: AppNotification[]): Promise<void> => {
  const db = getFirebaseFirestore();
  if (!db) return;

  for (const n of notifications) {
    if (!n.read) {
      try {
        await updateDoc(doc(db, 'notifications', n.id), { read: true });
      } catch (e) {
        console.warn('Could not mark notification read:', e);
      }
    }
  }
};
