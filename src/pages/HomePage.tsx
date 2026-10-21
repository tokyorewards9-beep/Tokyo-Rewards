import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Video as VideoIcon,
  BarChart2, 
  MapPin, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  Radio, 
  Database,
  Info,
  CheckCircle2,
  Cloud,
  X,
  Heart,
  MessageCircle,
  Share2,
  Trash2
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { FeedSkeleton } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import { MediaUploadZone } from '../components/media/MediaUploadZone';
import { MediaAttachment } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  CommunityPost, 
  PostComment,
  listenToCommunityPosts, 
  createCommunityPost, 
  toggleLikePost,
  listenToPostComments,
  addPostComment,
  deletePost
} from '../services/postService';
import { FriendProfile, listenToAcceptedFriends } from '../services/friendService';

interface HomePageProps {
  onOpenComposeModal?: () => void;
}

export const HomePage: React.FC<HomePageProps> = () => {
  const { user } = useAuth();
  const [feedTab, setFeedTab] = useState<'for_you' | 'following'>('for_you');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [acceptedFriends, setAcceptedFriends] = useState<FriendProfile[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [composerText, setComposerText] = useState('');
  const [showStageNotice, setShowStageNotice] = useState(false);

  // Cloudinary media attachments state
  const [isMediaZoneOpen, setIsMediaZoneOpen] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<MediaAttachment[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active comments thread modal
  const [activeCommentPost, setActiveCommentPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  // 1. Listen to community posts in real-time
  useEffect(() => {
    setIsLoadingPosts(true);
    const unsub = listenToCommunityPosts(
      (newPosts) => {
        setPosts(newPosts);
        setIsLoadingPosts(false);
      },
      (err) => {
        console.error('Error fetching posts:', err);
        setIsLoadingPosts(false);
      }
    );
    return () => unsub();
  }, []);

  // 2. Listen to accepted friends for "Following" tab filter
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenToAcceptedFriends(user.uid, (friends) => {
      setAcceptedFriends(friends);
    });
    return () => unsub();
  }, [user?.uid]);

  // 3. Listen to comments when a post's comment thread is open
  useEffect(() => {
    if (!activeCommentPost) {
      setComments([]);
      return;
    }
    const unsub = listenToPostComments(
      activeCommentPost.id,
      (newComments) => {
        setComments(newComments);
      },
      (err) => console.error('Error listening to comments:', err)
    );
    return () => unsub();
  }, [activeCommentPost?.id]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!composerText.trim() && uploadedMedia.length === 0) {
      setPublishFeedback({
        type: 'error',
        message: 'Please write a message or attach an image/video to publish.',
      });
      return;
    }

    if (!user) {
      setPublishFeedback({
        type: 'error',
        message: 'You must be signed in to publish a post.',
      });
      return;
    }

    setIsPublishing(true);
    setPublishFeedback(null);

    const authorProfile: FriendProfile = {
      uid: user.uid,
      displayName: user.displayName || 'Tokyo Member',
      username: user.email ? `@${user.email.split('@')[0]}` : '@tokyouser',
      avatarUrl: user.photoURL || undefined,
      email: user.email || '',
    };

    try {
      await createCommunityPost(authorProfile, composerText, uploadedMedia);

      setComposerText('');
      setUploadedMedia([]);
      setIsMediaZoneOpen(false);

      setPublishFeedback({
        type: 'success',
        message: 'Post published and synchronized across Tokyo Chart in real-time!',
      });

      setTimeout(() => setPublishFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to create post:', err);
      setPublishFeedback({
        type: 'error',
        message: err?.message || 'Failed to publish post',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleLike = async (post: CommunityPost) => {
    if (!user) return;
    const isLiked = Array.isArray(post.likedBy) && post.likedBy.includes(user.uid);

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === post.id) {
          const newLikedBy = isLiked
            ? (p.likedBy || []).filter((id) => id !== user.uid)
            : [...(p.likedBy || []), user.uid];
          return {
            ...p,
            likedBy: newLikedBy,
            likesCount: Math.max(0, p.likesCount + (isLiked ? -1 : 1)),
          };
        }
        return p;
      })
    );

    try {
      await toggleLikePost(post.id, user.uid, isLiked);
    } catch (e) {
      console.error('Error toggling like:', e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !activeCommentPost || !user) return;

    setIsSendingComment(true);
    const authorProfile: FriendProfile = {
      uid: user.uid,
      displayName: user.displayName || 'Tokyo Member',
      username: user.email ? `@${user.email.split('@')[0]}` : '@tokyouser',
      avatarUrl: user.photoURL || undefined,
      email: user.email || '',
    };

    try {
      await addPostComment(activeCommentPost.id, authorProfile, commentInput);
      setCommentInput('');
    } catch (err: any) {
      console.error('Error adding comment:', err);
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user || !confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePost(postId, user.uid);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: any) {
      console.error('Error deleting post:', err);
    }
  };

  // Filter posts based on active feed tab
  const displayedPosts = feedTab === 'for_you'
    ? posts
    : posts.filter((p) => {
        if (p.authorId === user?.uid) return true;
        return acceptedFriends.some((f) => f.uid === p.authorId);
      });

  return (
    <div className="w-full min-h-full pb-16">
      {/* Feed Top Header */}
      <header className="sticky top-0 md:top-0 z-20 bg-white/85 dark:bg-[#121212]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-neutral-800/80">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setFeedTab('for_you')}
              className={`text-sm font-semibold relative py-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                feedTab === 'for_you'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>For You</span>
              {feedTab === 'for_you' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF] dark:bg-[#00D2FF] rounded-full" />
              )}
            </button>

            <button
              onClick={() => setFeedTab('following')}
              className={`text-sm font-semibold relative py-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                feedTab === 'following'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Friends & Following ({acceptedFriends.length})</span>
              {feedTab === 'following' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF] dark:bg-[#00D2FF] rounded-full" />
              )}
            </button>
          </div>

          <button
            onClick={() => {
              setIsLoadingPosts(true);
              setTimeout(() => setIsLoadingPosts(false), 500);
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Refresh feed"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPosts ? 'animate-spin text-[#0066FF]' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Stream Container */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Post Creation Box with Cloudinary Media Uploader */}
        <section 
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3.5"
          aria-label="Create Post"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0066FF] to-[#00D2FF] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : user?.displayName ? (
                user.displayName.slice(0, 2).toUpperCase()
              ) : (
                'TC'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="feed-post-input" className="sr-only">Post thoughts or updates</label>
              <textarea
                id="feed-post-input"
                rows={3}
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                placeholder="What's happening across Tokyo? Share thoughts, upload photos, or post videos..."
                className="w-full bg-transparent border-0 resize-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden leading-relaxed"
              />
            </div>
          </div>

          {/* Media Upload Zone */}
          {isMediaZoneOpen && (
            <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#00D2FF]" />
                  <span>Cloudinary Media (tokyo_chart_uploads)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsMediaZoneOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Close media attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <MediaUploadZone
                onMediaUploaded={(attachments) => setUploadedMedia(attachments)}
                folder="tokyo_chart/posts"
              />
            </div>
          )}

          {/* Publishing Feedback Alert */}
          {publishFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                publishFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60'
              }`}
            >
              {publishFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <p className="flex-1 leading-relaxed">{publishFeedback.message}</p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={() => setIsMediaZoneOpen(!isMediaZoneOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isMediaZoneOpen || uploadedMedia.length > 0
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-[#0066FF] dark:text-[#00D2FF]'
                    : 'hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-[#0066FF]'
                }`}
                title="Upload Photo or Video to Cloudinary"
              >
                <ImageIcon className="w-4 h-4" />
                <VideoIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Photo/Video</span>
                {uploadedMedia.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#0066FF]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowStageNotice(true)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors hover:text-[#0066FF] cursor-pointer"
                title="Storage Architecture Info"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {composerText.length > 0 && (
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  {280 - composerText.length}
                </span>
              )}
              <button
                type="button"
                disabled={isPublishing || (!composerText.trim() && uploadedMedia.length === 0)}
                onClick={handlePostSubmit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white bg-[#0066FF] hover:bg-blue-700 active:bg-blue-800 shadow-xs transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Loading Skeleton */}
        {isLoadingPosts && <FeedSkeleton />}

        {/* Real Community Posts Stream */}
        {!isLoadingPosts && displayedPosts.length > 0 ? (
          <div className="space-y-4">
            {displayedPosts.map((post) => {
              const isLiked = Array.isArray(post.likedBy) && !!user && post.likedBy.includes(user.uid);
              const isAuthor = user?.uid === post.authorId;

              return (
                <article
                  key={post.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3"
                >
                  {/* Post Author Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0066FF] to-[#00D2FF] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs">
                        {post.authorAvatar ? (
                          <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                        ) : (
                          post.authorName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {post.authorName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {post.authorUsername} · {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : 'Recently'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAuthor && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                        <Cloud className="w-3 h-3 text-[#0066FF] dark:text-[#00D2FF]" />
                        <span>Real Cloudinary</span>
                      </span>
                    </div>
                  </div>

                  {/* Post Content */}
                  {post.content && (
                    <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>
                  )}

                  {/* Cloudinary Media Showcase */}
                  {post.mediaAttachments && post.mediaAttachments.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 pt-1 rounded-xl overflow-hidden">
                      {post.mediaAttachments.map((item, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden bg-black/90">
                          {item.resourceType === 'video' ? (
                            <video
                              src={item.secureUrl}
                              controls
                              className="w-full max-h-[450px] object-contain rounded-xl"
                              playsInline
                            />
                          ) : (
                            <img
                              src={item.secureUrl}
                              alt="Post attachment"
                              className="w-full max-h-[450px] object-cover rounded-xl"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Bar: Like, Comments, Share */}
                  <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-4">
                      {/* Like Button */}
                      <button
                        onClick={() => handleToggleLike(post)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                          isLiked
                            ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 font-semibold'
                            : 'hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500' : ''}`} />
                        <span>{post.likesCount || 0}</span>
                      </button>

                      {/* Comment Button */}
                      <button
                        onClick={() => setActiveCommentPost(post)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:text-[#0066FF] hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.repliesCount || 0}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.href);
                          alert('Link copied to clipboard!');
                        }
                      }}
                      className="p-1.5 rounded-lg hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Share Post"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : !isLoadingPosts && (
          <EmptyState
            icon={Sparkles}
            title={feedTab === 'for_you' ? 'The Tokyo Chart community feed is waiting for your first post' : 'No posts from friends yet'}
            description={
              feedTab === 'for_you'
                ? 'Create a post above with text, photo, or video. Real Firestore synchronizations and Cloudinary media uploads are fully active.'
                : 'Connect with other Tokyo Chart members in the Friends tab to see their posts in your stream.'
            }
            statusBadgeText="Real Cloudinary & Firestore Sync Active"
            actionText="How Media Works"
            onAction={() => setShowStageNotice(true)}
            secondaryInfo="100% real Firestore database; no fake dummy posts injected."
          />
        )}
      </div>

      {/* Comments Thread Modal */}
      <Modal
        isOpen={!!activeCommentPost}
        onClose={() => setActiveCommentPost(null)}
        title="Post Comments"
        description={activeCommentPost ? `Replies on ${activeCommentPost.authorName}'s post` : ''}
      >
        <div className="space-y-4 text-xs">
          {/* Comments List */}
          <div className="max-h-72 overflow-y-auto space-y-3 divide-y divide-slate-100 dark:divide-neutral-800 pr-1">
            {comments.length > 0 ? (
              comments.map((c) => (
                <div key={c.id} className="pt-3 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {c.authorName} ({c.authorUsername})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-slate-500 dark:text-slate-400">
                No comments on this post yet. Be the first to reply!
              </p>
            )}
          </div>

          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="pt-2 border-t border-slate-200 dark:border-neutral-800 flex items-center gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Write a thoughtful comment..."
              className="flex-1 px-3 py-2 bg-slate-100 dark:bg-neutral-800 border-0 rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:ring-1 focus:ring-[#0066FF]"
            />
            <button
              type="submit"
              disabled={isSendingComment || !commentInput.trim()}
              className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-xs transition-colors flex items-center gap-1"
            >
              {isSendingComment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Reply</span>
            </button>
          </form>
        </div>
      </Modal>

      {/* Media Architecture Notice Modal */}
      <Modal
        isOpen={showStageNotice}
        onClose={() => setShowStageNotice(false)}
        title="Tokyo Chart Real Data Architecture"
        description="Cloudinary Unsigned Uploads & Firestore Real-Time DB"
      >
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 flex items-start gap-3">
            <Cloud className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Real Cloudinary Media Engine</p>
              <p className="mt-1">
                Upload preset: <code className="font-mono font-bold text-[#0066FF] dark:text-[#00D2FF]">tokyo_chart_uploads</code>.
                Images and videos upload via unsigned direct protocol. Resulting secure URLs are saved into Firestore <code className="font-mono">posts</code> and <code className="font-mono">media_uploads</code>.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setShowStageNotice(false)}
              className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
