/**
 * Real Firestore Friendships & Social Graph Service
 *
 * Implements bidirectional friendships, pending friend requests, and user discovery.
 * Strictly guarantees that users can only initiate direct messages with accepted friends.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  increment,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';

export interface FriendProfile {
  uid: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  email: string;
  bio?: string;
}

export interface FriendRequestItem {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverUsername?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: any;
}

export interface FriendshipItem {
  id: string;
  user1Id: string;
  user2Id: string;
  memberIds: string[];
  user1: FriendProfile;
  user2: FriendProfile;
  createdAt?: any;
}

/**
 * Deterministic friendship document ID generator
 */
export const getFriendshipDocId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_');
};

/**
 * Listens to accepted friends of the current user in real-time
 */
export const listenToAcceptedFriends = (
  currentUserId: string,
  onUpdate: (friends: FriendProfile[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const db = getFirebaseFirestore();
  if (!db || !currentUserId) {
    onUpdate([]);
    return () => {};
  }

  const path = 'friendships';
  const q = query(collection(db, path), where('memberIds', 'array-contains', currentUserId));

  return onSnapshot(
    q,
    (snapshot) => {
      const friends: FriendProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as FriendshipItem;
        if (data.user1Id === currentUserId && data.user2) {
          friends.push(data.user2);
        } else if (data.user2Id === currentUserId && data.user1) {
          friends.push(data.user1);
        }
      });
      onUpdate(friends);
    },
    (err) => {
      if (onError) {
        onError(err);
      }
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
};

/**
 * Listens to incoming friend requests directed to current user
 */
export const listenToIncomingFriendRequests = (
  currentUserId: string,
  onUpdate: (requests: FriendRequestItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const db = getFirebaseFirestore();
  if (!db || !currentUserId) {
    onUpdate([]);
    return () => {};
  }

  const path = 'friend_requests';
  const q = query(
    collection(db, path),
    where('receiverId', '==', currentUserId),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: FriendRequestItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<FriendRequestItem, 'id'>) });
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
 * Listens to outgoing friend requests sent by current user
 */
export const listenToOutgoingFriendRequests = (
  currentUserId: string,
  onUpdate: (requests: FriendRequestItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const db = getFirebaseFirestore();
  if (!db || !currentUserId) {
    onUpdate([]);
    return () => {};
  }

  const path = 'friend_requests';
  const q = query(
    collection(db, path),
    where('senderId', '==', currentUserId),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: FriendRequestItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<FriendRequestItem, 'id'>) });
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
 * Send a friend request to another user
 */
export const sendFriendRequest = async (
  sender: FriendProfile,
  receiver: FriendProfile
): Promise<void> => {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not configured');

  if (sender.uid === receiver.uid) {
    throw new Error('You cannot send a friend request to yourself');
  }

  const friendshipId = getFriendshipDocId(sender.uid, receiver.uid);
  const friendshipSnap = await getDoc(doc(db, 'friendships', friendshipId));
  if (friendshipSnap.exists()) {
    throw new Error('You are already friends with this member');
  }

  const path = 'friend_requests';
  try {
    const requestId = `${sender.uid}_${receiver.uid}`;
    await setDoc(doc(db, path, requestId), {
      senderId: sender.uid,
      senderName: sender.displayName || 'Tokyo Member',
      senderUsername: sender.username || '@member',
      senderAvatar: sender.avatarUrl || null,
      receiverId: receiver.uid,
      receiverName: receiver.displayName || 'Tokyo Member',
      receiverUsername: receiver.username || '@member',
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

/**
 * Accept an incoming friend request and establish bidirectional friendship
 */
export const acceptFriendRequest = async (
  request: FriendRequestItem,
  currentReceiver: FriendProfile
): Promise<void> => {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not configured');

  const friendshipId = getFriendshipDocId(request.senderId, request.receiverId);
  const sortedIds = [request.senderId, request.receiverId].sort();

  const senderProfile: FriendProfile = {
    uid: request.senderId,
    displayName: request.senderName,
    username: request.senderUsername,
    avatarUrl: request.senderAvatar,
    email: '',
  };

  const isUser1Sender = sortedIds[0] === request.senderId;
  const user1 = isUser1Sender ? senderProfile : currentReceiver;
  const user2 = isUser1Sender ? currentReceiver : senderProfile;

  try {
    // 1. Write friendship document
    await setDoc(doc(db, 'friendships', friendshipId), {
      user1Id: sortedIds[0],
      user2Id: sortedIds[1],
      memberIds: sortedIds,
      user1,
      user2,
      createdAt: serverTimestamp(),
    });

    // 2. Mark friend request as accepted (or remove)
    await deleteDoc(doc(db, 'friend_requests', request.id));

    // 3. Increment friendsCount on both user documents
    try {
      await updateDoc(doc(db, 'users', request.senderId), {
        friendsCount: increment(1),
      });
      await updateDoc(doc(db, 'users', request.receiverId), {
        friendsCount: increment(1),
      });
    } catch (e) {
      console.warn('Could not increment user friendsCount counters:', e);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'friendships');
  }
};

/**
 * Decline/dismiss a friend request
 */
export const declineFriendRequest = async (requestId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not configured');

  try {
    await deleteDoc(doc(db, 'friend_requests', requestId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `friend_requests/${requestId}`);
  }
};

/**
 * Remove an existing friendship
 */
export const removeFriendship = async (userId: string, friendId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not configured');

  const friendshipId = getFriendshipDocId(userId, friendId);
  try {
    await deleteDoc(doc(db, 'friendships', friendshipId));
    try {
      await updateDoc(doc(db, 'users', userId), { friendsCount: increment(-1) });
      await updateDoc(doc(db, 'users', friendId), { friendsCount: increment(-1) });
    } catch (e) {
      console.warn('Could not decrement friendsCount counters:', e);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `friendships/${friendshipId}`);
  }
};

/**
 * Discover other Tokyo Chart registered members for networking
 */
export const searchTokyoMembers = async (
  currentUserId: string,
  searchQuery?: string
): Promise<FriendProfile[]> => {
  const db = getFirebaseFirestore();
  if (!db) return [];

  const path = 'users';
  try {
    const snapshot = await getDocs(collection(db, path));
    const members: FriendProfile[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (docSnap.id !== currentUserId) {
        members.push({
          uid: docSnap.id,
          displayName: data.displayName || 'Tokyo Member',
          username: data.username || `@${docSnap.id.slice(0, 6)}`,
          avatarUrl: data.avatarUrl || undefined,
          email: data.email || '',
          bio: data.bio || '',
        });
      }
    });

    if (!searchQuery || !searchQuery.trim()) {
      return members;
    }

    const q = searchQuery.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};
