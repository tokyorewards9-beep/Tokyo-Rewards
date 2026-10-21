/**
 * Real Firestore Community Posts & Comments Service
 *
 * Implements real-time feed synchronization, post creation with Cloudinary media,
 * like toggling, and comment threads in Firestore.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  increment,
  arrayUnion,
  arrayRemove,
  limit,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import { MediaAttachment } from '../types';
import { FriendProfile } from './friendService';

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  content: string;
  mediaAttachments: MediaAttachment[];
  likesCount: number;
  likedBy?: string[];
  repliesCount: number;
  sharesCount: number;
  createdAt: any;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  content: string;
  createdAt: any;
}

/**
 * Real-time listener for community posts feed
 */
export const listenToCommunityPosts = (
  onUpdate: (posts: CommunityPost[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const db = getFirebaseFirestore();
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  const path = 'posts';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const posts: CommunityPost[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        posts.push({
          id: docSnap.id,
          authorId: data.authorId || '',
          authorName: data.authorName || 'Tokyo Member',
          authorUsername: data.authorUsername || '@tokyomember',
          authorAvatar: data.authorAvatar || undefined,
          content: data.content || '',
          mediaAttachments: Array.isArray(data.mediaAttachments) ? data.mediaAttachments : [],
          likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
          likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
          repliesCount: typeof data.repliesCount === 'number' ? data.repliesCount : 0,
          sharesCount: typeof data.sharesCount === 'number' ? data.sharesCount : 0,
          createdAt: data.createdAt,
        });
      });
      onUpdate(posts);
    },
    (err) => {
      console.warn('Posts listener with orderBy failed, attempting fallback query:', err);
      // Fallback query without orderBy in case composite index is deploying
      const fallbackQuery = query(collection(db, path), limit(50));
      return onSnapshot(
        fallbackQuery,
        (fallbackSnap) => {
          const posts: CommunityPost[] = [];
          fallbackSnap.forEach((docSnap) => {
            const data = docSnap.data();
            posts.push({
              id: docSnap.id,
              authorId: data.authorId || '',
              authorName: data.authorName || 'Tokyo Member',
              authorUsername: data.authorUsername || '@tokyomember',
              authorAvatar: data.authorAvatar || undefined,
              content: data.content || '',
              mediaAttachments: Array.isArray(data.mediaAttachments) ? data.mediaAttachments : [],
              likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
              likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
              repliesCount: typeof data.repliesCount === 'number' ? data.repliesCount : 0,
              sharesCount: typeof data.sharesCount === 'number' ? data.sharesCount : 0,
              createdAt: data.createdAt,
            });
          });
          posts.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
          });
          onUpdate(posts);
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
 * Real-time listener for posts created by a specific user
 */
export const listenToUserPosts = (
  userId: string,
  onUpdate: (posts: CommunityPost[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const db = getFirebaseFirestore();
  if (!db || !userId) {
    onUpdate([]);
    return () => {};
  }

  const path = 'posts';
  const q = query(
    collection(db, path),
    where('authorId', '==', userId),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const posts: CommunityPost[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        posts.push({
          id: docSnap.id,
          authorId: data.authorId || '',
          authorName: data.authorName || 'Tokyo Member',
          authorUsername: data.authorUsername || '@tokyomember',
          authorAvatar: data.authorAvatar || undefined,
          content: data.content || '',
          mediaAttachments: Array.isArray(data.mediaAttachments) ? data.mediaAttachments : [],
          likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
          likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
          repliesCount: typeof data.repliesCount === 'number' ? data.repliesCount : 0,
          sharesCount: typeof data.sharesCount === 'number' ? data.sharesCount : 0,
          createdAt: data.createdAt,
        });
      });
      posts.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      onUpdate(posts);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
};

/**
 * Creates a new community post with optional Cloudinary images/videos
 */
export const createCommunityPost = async (
  author: FriendProfile,
  content: string,
  media: MediaAttachment[]
): Promise<string> => {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not configured');

  if (!content.trim() && media.length === 0) {
    throw new Error('Post must have content or media attachments');
  }

  const path = 'posts';
  try {
    const postDocRef = await addDoc(collection(db, path), {
      authorId: author.uid,
      authorName: author.displayName || 'Tokyo Member',
      authorUsername: author.username || '@member',
      authorAvatar: author.avatarUrl || null,
      content: content.trim(),
      mediaAttachments: media.map((m) => ({
        url: m.url,
        secureUrl: m.secureUrl,
        publicId: m.publicId,
        resourceType: m.resourceType,
        format: m.format || null,
        bytes: m.bytes || null,
        width: m.width || null,
        height: m.height || null,
        duration: m.duration || null,
      })),
      likesCount: 0,
      likedBy: [],
      repliesCount: 0,
      sharesCount: 0,
      createdAt: serverTimestamp(),
    });

    // Increment user's postsCount
    try {
      await updateDoc(doc(db, 'users', author.uid), {
        postsCount: increment(1),
      });
    } catch (e) {
      console.warn('Could not increment user postsCount:', e);
    }

    // Write audit records to media_uploads tracking collection
    for (const m of media) {
      await addDoc(collection(db, 'media_uploads'), {
        userId: author.uid,
        postId: postDocRef.id,
        type: 'post_media',
        secureUrl: m.secureUrl,
        publicId: m.publicId,
        resourceType: m.resourceType,
        format: m.format || null,
        bytes: m.bytes || null,
        duration: m.duration || null,
        uploadedAt: serverTimestamp(),
      });
    }

    return postDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

/**
 * Like or unlike a community post
 */
export const toggleLikePost = async (
  postId: string,
  userId: string,
  isCurrentlyLiked: boolean
): Promise<void> => {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not configured');

  const postRef = doc(db, 'posts', postId);
  try {
    if (isCurrentlyLiked) {
      await updateDoc(postRef, {
        likedBy: arrayRemove(userId),
        likesCount: increment(-1),
      });
    } else {
      await updateDoc(postRef, {
        likedBy: arrayUnion(userId),
        likesCount: increment(1),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
  }
};

/**
 * Listen to real-time comments on a specific post
 */
export const listenToPostComments = (
  postId: string,
  onUpdate: (comments: PostComment[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const db = getFirebaseFirestore();
  if (!db || !postId) {
    onUpdate([]);
    return () => {};
  }

  const path = `posts/${postId}/comments`;
  const q = query(collection(db, path), orderBy('createdAt', 'asc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const comments: PostComment[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        comments.push({
          id: docSnap.id,
          postId,
          authorId: data.authorId || '',
          authorName: data.authorName || 'Tokyo Member',
          authorUsername: data.authorUsername || '@member',
          authorAvatar: data.authorAvatar || undefined,
          content: data.content || '',
          createdAt: data.createdAt,
        });
      });
      onUpdate(comments);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
};

/**
 * Add a comment to a post
 */
export const addPostComment = async (
  postId: string,
  author: FriendProfile,
  content: string
): Promise<string> => {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not configured');

  if (!content.trim()) throw new Error('Comment cannot be empty');

  const path = `posts/${postId}/comments`;
  try {
    const commentRef = await addDoc(collection(db, path), {
      postId,
      authorId: author.uid,
      authorName: author.displayName || 'Tokyo Member',
      authorUsername: author.username || '@member',
      authorAvatar: author.avatarUrl || null,
      content: content.trim(),
      createdAt: serverTimestamp(),
    });

    // Increment repliesCount on the parent post
    await updateDoc(doc(db, 'posts', postId), {
      repliesCount: increment(1),
    });

    return commentRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

/**
 * Delete a post authored by the user
 */
export const deletePost = async (postId: string, userId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not configured');

  try {
    await deleteDoc(doc(db, 'posts', postId));
    try {
      await updateDoc(doc(db, 'users', userId), {
        postsCount: increment(-1),
      });
    } catch (e) {
      console.warn('Could not decrement user postsCount:', e);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
  }
};
