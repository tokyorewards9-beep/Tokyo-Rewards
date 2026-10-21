import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Link as LinkIcon, 
  Edit3, 
  Sparkles, 
  FileText, 
  MessageSquare, 
  Image as ImageIcon, 
  Bookmark,
  Check,
  RefreshCw,
  Heart,
  Trash2
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { AvatarUpload } from '../components/media/AvatarUpload';
import { useAuth } from '../context/AuthContext';
import { MediaAttachment } from '../types';
import { getFirebaseFirestore, getFirebaseAuth } from '../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { CommunityPost, listenToUserPosts, deletePost } from '../services/postService';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'saved'>('posts');
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Real profile data
  const [displayName, setDisplayName] = useState(user?.displayName || 'Tokyo Member');
  const [username, setUsername] = useState('@tokyomember');
  const [bio, setBio] = useState('Tokyo Chart explorer. Real-time messaging, WebRTC calls, and Cloudinary media.');
  const [location, setLocation] = useState('Tokyo, Japan');
  const [website, setWebsite] = useState('https://tokyochart.network');
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.photoURL || '');
  const [postsCount, setPostsCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [joinedDate, setJoinedDate] = useState('Recently');

  // Real user posts
  const [userPosts, setUserPosts] = useState<CommunityPost[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch real profile from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirebaseFirestore();
    if (!db) return;

    const fetchProfile = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.displayName) setDisplayName(data.displayName);
          if (data.username) setUsername(data.username);
          if (data.bio) setBio(data.bio);
          if (data.location) setLocation(data.location);
          if (data.website) setWebsite(data.website);
          if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
          if (typeof data.postsCount === 'number') setPostsCount(data.postsCount);
          if (typeof data.friendsCount === 'number') setFriendsCount(data.friendsCount);
          if (data.createdAt?.toDate) {
            setJoinedDate(data.createdAt.toDate().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
          }
        }
      } catch (e) {
        console.warn('Could not load profile from Firestore:', e);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user?.uid]);

  // Listen to user's real posts
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenToUserPosts(user.uid, (posts) => {
      setUserPosts(posts);
      setPostsCount(posts.length);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleAvatarUpdated = async (newUrl: string, attachment: MediaAttachment) => {
    setAvatarUrl(newUrl);
    const auth = getFirebaseAuth();
    if (auth?.currentUser) {
      try {
        await updateProfile(auth.currentUser, { photoURL: newUrl });
      } catch (e) {
        console.warn('Auth photoURL update warning:', e);
      }
    }

    const db = getFirebaseFirestore();
    if (db && user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          avatarUrl: newUrl,
          avatarPublicId: attachment.publicId,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Firestore avatarUrl update warning:', e);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsSavingProfile(true);
    setSaveSuccess(false);

    try {
      const db = getFirebaseFirestore();
      if (db) {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: displayName.trim(),
          bio: bio.trim(),
          location: location.trim(),
          website: website.trim(),
          updatedAt: serverTimestamp(),
        });
      }

      const auth = getFirebaseAuth();
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowEditModal(false);
      }, 900);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user || !confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePost(postId, user.uid);
    } catch (e) {
      console.error('Error deleting post:', e);
    }
  };

  const tabs: { id: 'posts' | 'media' | 'saved'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'posts', label: `Posts (${userPosts.length})`, icon: FileText },
    { id: 'media', label: `Media (${userPosts.filter((p) => p.mediaAttachments.length > 0).length})`, icon: ImageIcon },
    { id: 'saved', label: 'Saved (0)', icon: Bookmark },
  ];

  return (
    <div className="w-full min-h-full pb-16">
      {/* Cover Banner with Tokyo Blue to Accent Cyan Gradient */}
      <div className="relative h-44 sm:h-56 w-full bg-gradient-to-r from-[#0066FF] via-[#0088FF] to-[#00D2FF] overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_25%_25%,_rgba(255,255,255,0.8)_2px,_transparent_2px)] [background-size:24px_24px]" />
      </div>

      {/* Profile Card & Info */}
      <div className="px-4 sm:px-6 relative">
        <div className="flex flex-wrap items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
          <div className="relative z-10">
            <AvatarUpload
              currentAvatarUrl={avatarUrl}
              userId={user?.uid || 'current_user'}
              onAvatarUpdated={handleAvatarUpdated}
              size="lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-900 dark:text-white transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* User Details */}
        <div className="space-y-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {displayName}
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {username}
            </p>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-300 max-w-xl leading-relaxed whitespace-pre-wrap">
            {bio}
          </p>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{location}</span>
              </span>
            )}
            {website && (
              <span className="flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5" />
                <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" className="text-[#0066FF] dark:text-[#00D2FF] hover:underline">
                  {website}
                </a>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined {joinedDate}</span>
            </span>
          </div>

          {/* Real Stats */}
          <div className="flex items-center gap-6 pt-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">{friendsCount}</span>
              <span className="text-slate-500 dark:text-slate-400">Friends</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">{userPosts.length}</span>
              <span className="text-slate-500 dark:text-slate-400">Posts</span>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-6 border-b border-slate-200/80 dark:border-neutral-800/80 mt-6 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-sm font-semibold relative py-3.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF] dark:bg-[#00D2FF] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content: Real Posts from Firestore */}
        <div className="py-6 space-y-4">
          {activeTab === 'posts' && (
            userPosts.length > 0 ? (
              <div className="space-y-4">
                {userPosts.map((post) => (
                  <article
                    key={post.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{displayName}</span>
                        <span className="text-[11px] text-slate-400">
                          {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Recently'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                        title="Delete Post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {post.mediaAttachments.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 pt-1 rounded-xl overflow-hidden">
                        {post.mediaAttachments.map((m, idx) => (
                          <div key={idx} className="relative rounded-xl overflow-hidden bg-black/90">
                            {m.resourceType === 'video' ? (
                              <video src={m.secureUrl} controls className="w-full max-h-[450px] object-contain rounded-xl" />
                            ) : (
                              <img src={m.secureUrl} alt="Post media" className="w-full max-h-[450px] object-cover rounded-xl" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        <span>{post.likesCount || 0}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{post.repliesCount || 0}</span>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No posts published yet"
                description="Share your first update, photo, or video on the Home feed to see it showcased on your profile."
                statusBadgeText="Real Firestore Profile Connected"
              />
            )
          )}

          {activeTab === 'media' && (
            userPosts.filter((p) => p.mediaAttachments.length > 0).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {userPosts
                  .flatMap((p) => p.mediaAttachments)
                  .map((item, idx) => (
                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden bg-black/80 relative">
                      {item.resourceType === 'video' ? (
                        <video src={item.secureUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img src={item.secureUrl} alt="Media" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <EmptyState
                icon={ImageIcon}
                title="No media uploaded yet"
                description="Photos and videos uploaded with your posts via Cloudinary will be collected here."
                statusBadgeText="Cloudinary Media Engine Active"
              />
            )
          )}

          {activeTab === 'saved' && (
            <EmptyState
              icon={Bookmark}
              title="No saved bookmarks"
              description="Posts and resources you bookmark will appear here."
              statusBadgeText="Bookmark Store Ready"
            />
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
        description="Update your Tokyo Chart profile in Cloud Firestore"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="flex flex-col items-center py-2">
            <AvatarUpload
              currentAvatarUrl={avatarUrl}
              userId={user?.uid || 'current_user'}
              onAvatarUpdated={handleAvatarUpdated}
              size="md"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Click photo to upload new profile avatar
            </span>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {isSavingProfile ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
