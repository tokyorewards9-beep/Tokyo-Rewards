import React, { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  Hash, 
  Users, 
  Sparkles, 
  Filter, 
  AlertCircle,
  UserPlus,
  MessageSquare,
  Check,
  Clock,
  Heart,
  RefreshCw
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/LoadingState';
import { useAuth } from '../context/AuthContext';
import { 
  FriendProfile, 
  searchTokyoMembers, 
  sendFriendRequest,
  listenToAcceptedFriends,
  listenToOutgoingFriendRequests
} from '../services/friendService';
import { CommunityPost, listenToCommunityPosts } from '../services/postService';

export const SearchPage: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'people' | 'topics' | 'media'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Search Results
  const [matchedMembers, setMatchedMembers] = useState<FriendProfile[]>([]);
  const [matchedPosts, setMatchedPosts] = useState<CommunityPost[]>([]);
  const [allPosts, setAllPosts] = useState<CommunityPost[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<string[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Suggested tags
  const suggestedTags = [
    '#TokyoTech2026',
    '#ShibuyaLive',
    '#AkihabaraCreative',
    '#GinzaStyle',
    '#RoppongiArt',
    '#TokyoDesigners',
  ];

  // Listen to friends and outgoing requests
  useEffect(() => {
    if (!user?.uid) return;
    const unsubFriends = listenToAcceptedFriends(user.uid, (list) => {
      setFriends(list);
    });
    const unsubOutgoing = listenToOutgoingFriendRequests(user.uid, (list) => {
      setOutgoingRequests(list.map((r) => r.receiverId));
    });
    const unsubPosts = listenToCommunityPosts((posts) => {
      setAllPosts(posts);
    });

    return () => {
      unsubFriends();
      unsubOutgoing();
      unsubPosts();
    };
  }, [user?.uid]);

  const executeSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setActionNotice(null);

    try {
      const q = searchTerm.toLowerCase().trim();

      // 1. Search members in Firestore
      const memberResults = await searchTokyoMembers(user?.uid || '', q);
      setMatchedMembers(memberResults);

      // 2. Search posts matching term
      const postResults = allPosts.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          p.authorUsername.toLowerCase().includes(q)
      );
      setMatchedPosts(postResults);
    } catch (err) {
      console.error('Search query error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    setHasSearched(false);
    setMatchedMembers([]);
    setMatchedPosts([]);
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    executeSearch(tag);
  };

  const handleSendFriendRequest = async (target: FriendProfile) => {
    if (!user) return;
    const currentProfile: FriendProfile = {
      uid: user.uid,
      displayName: user.displayName || 'Tokyo Member',
      username: user.email ? `@${user.email.split('@')[0]}` : '@member',
      avatarUrl: user.photoURL || undefined,
      email: user.email || '',
    };

    try {
      await sendFriendRequest(currentProfile, target);
      setActionNotice(`Friend invitation sent to ${target.displayName}!`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      setActionNotice(err.message || 'Failed to send friend request');
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const filters: { id: 'all' | 'people' | 'topics' | 'media'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'people', label: `People (${matchedMembers.length})` },
    { id: 'topics', label: `Posts & Topics (${matchedPosts.length})` },
    { id: 'media', label: `Media (${matchedPosts.filter((p) => p.mediaAttachments.length > 0).length})` },
  ];

  return (
    <div className="w-full min-h-full pb-16">
      {/* Search Header */}
      <header className="sticky top-0 z-20 bg-white/85 dark:bg-[#121212]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-neutral-800/80 p-4 sm:px-6">
        <form onSubmit={handleSearchSubmit} className="relative">
          <label htmlFor="main-search-input" className="sr-only">Search Tokyo Chart</label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="main-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts, conversations, topics, or #tags across Tokyo..."
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-100/90 dark:bg-neutral-800/90 border border-slate-200/60 dark:border-neutral-700/60 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0066FF] dark:focus:border-[#00D2FF] transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar py-0.5">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'
                }`}
                aria-pressed={isActive}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Action Notification */}
      {actionNotice && (
        <div className="px-4 sm:px-6 pt-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 rounded-xl text-xs flex items-center justify-between">
            <p>{actionNotice}</p>
            <button onClick={() => setActionNotice(null)} className="font-bold">×</button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="p-4 sm:p-6 space-y-6">
        {isSearching && (
          <div className="py-16 text-center space-y-3">
            <Spinner size="lg" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Querying live Firestore user index and posts...
            </p>
          </div>
        )}

        {/* Results Stream */}
        {!isSearching && hasSearched && (
          <div className="space-y-6">
            {/* Matching Members */}
            {(activeFilter === 'all' || activeFilter === 'people') && matchedMembers.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#0066FF]" />
                  <span>Members Found ({matchedMembers.length})</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchedMembers.map((member) => {
                    const isFriend = friends.some((f) => f.uid === member.uid);
                    const isPending = outgoingRequests.includes(member.uid);

                    return (
                      <div
                        key={member.uid}
                        className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0066FF] to-[#00D2FF] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt={member.displayName} className="w-full h-full object-cover" />
                            ) : (
                              member.displayName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {member.displayName}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {member.username}
                            </p>
                          </div>
                        </div>

                        {isFriend ? (
                          <span className="px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                            Friend
                          </span>
                        ) : isPending ? (
                          <span className="px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendFriendRequest(member)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-xl transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Connect</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Matching Posts */}
            {(activeFilter === 'all' || activeFilter === 'topics' || activeFilter === 'media') && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-[#0066FF]" />
                  <span>Posts ({matchedPosts.length})</span>
                </h2>

                {matchedPosts.length > 0 ? (
                  <div className="space-y-3">
                    {matchedPosts
                      .filter((p) => activeFilter !== 'media' || p.mediaAttachments.length > 0)
                      .map((post) => (
                        <div
                          key={post.id}
                          className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {post.authorName}
                              </span>
                              <span className="text-slate-500">
                                {post.authorUsername}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Recent'}
                            </span>
                          </div>

                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {post.content}
                          </p>

                          {post.mediaAttachments.length > 0 && (
                            <div className="rounded-xl overflow-hidden max-h-56 bg-black/80">
                              {post.mediaAttachments[0].resourceType === 'video' ? (
                                <video src={post.mediaAttachments[0].secureUrl} controls className="w-full max-h-56 object-contain" />
                              ) : (
                                <img src={post.mediaAttachments[0].secureUrl} alt="Post attachment" className="w-full max-h-56 object-cover" />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  activeFilter !== 'all' && (
                    <p className="p-4 text-center text-xs text-slate-500">
                      No matching posts found.
                    </p>
                  )
                )}
              </section>
            )}

            {matchedMembers.length === 0 && matchedPosts.length === 0 && (
              <EmptyState
                icon={Search}
                title={`No results found for "${query}"`}
                description="Try searching with a different username, member name, or community topic tag."
                statusBadgeText="Real Firestore Query Complete"
                actionText="Clear Search"
                onAction={handleClear}
              />
            )}
          </div>
        )}

        {/* State: Initial Discover */}
        {!isSearching && !hasSearched && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Hash className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF]" />
                <h2 className="text-sm font-semibold">Explore Tokyo Channel Directory</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Click any topic tag below to search real community posts across the network:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-[#0066FF] dark:hover:text-[#00D2FF] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Users className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF]" />
                <h2 className="text-sm font-semibold">Live Member Discovery</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Type any member's handle (e.g. <code className="text-slate-800 dark:text-slate-200">@kenji</code>) or full name into the search bar above to query real accounts in Firestore and send friend invitations.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
