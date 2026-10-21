/**
 * Core type definitions for Tokyo Chart social platform foundation
 */

export type NavigationTab = 
  | 'home'
  | 'search'
  | 'friends'
  | 'messages'
  | 'notifications'
  | 'profile'
  | 'settings';

export type ThemeMode = 'light' | 'dark' | 'system';

export type DisplayDensity = 'comfortable' | 'compact';

export interface UserProfileContract {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  coverUrl?: string;
  joinedDate: string;
  location?: string;
  website?: string;
  postsCount: number;
  friendsCount: number;
  followingCount: number;
}

export interface PostContract {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  content: string;
  mediaUrls?: string[];
  createdAt: string;
  likesCount: number;
  repliesCount: number;
  sharesCount: number;
}

export interface MessageContract {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationContract {
  id: string;
  recipientId: string;
  senderId?: string;
  type: 'like' | 'comment' | 'friend_request' | 'system_alert';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface CloudinaryUploadResponse {
  asset_id?: string;
  public_id: string;
  version?: number;
  width?: number;
  height?: number;
  format?: string;
  resource_type: 'image' | 'video' | string;
  created_at: string;
  bytes: number;
  type?: string;
  url: string;
  secure_url: string;
  duration?: number;
  original_filename?: string;
}

export interface MediaAttachment {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: 'image' | 'video';
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  originalFilename?: string;
}

