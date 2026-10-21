import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Compass, 
  Search, 
  Check, 
  X, 
  MessageSquare, 
  Phone, 
  Video, 
  UserCheck, 
  Clock, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { 
  FriendProfile, 
  FriendRequestItem,
  listenToAcceptedFriends, 
  listenToIncomingFriendRequests, 
  listenToOutgoingFriendRequests,
  sendFriendRequest, 
  acceptFriendRequest, 
  declineFriendRequest, 
  searchTokyoMembers,
  removeFriendship
} from '../services/friendService';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

export const FriendsPage: React.FC = () => {
  const { user } = useAuth();
  const { startCall } = useCall();

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'discover'>('friends');
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  
  // Discover members
  const [discoveredMembers, setDiscoveredMembers] = useState<FriendProfile[]>([]);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);

  // Add connection modal
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Real-time listeners for friends, incoming requests, and outgoing requests
  useEffect(() => {
    if (!user?.uid) return;

    const unsubFriends = listenToAcceptedFriends(user.uid, (list) => {
      setFriends(list);
    });

    const unsubIncoming = listenToIncomingFriendRequests(user.uid, (list) => {
      setIncomingRequests(list);
    });

    const unsubOutgoing = listenToOutgoingFriendRequests(user.uid, (list) => {
      setOutgoingRequests(list);
    });

    return () => {
      unsubFriends();
      unsubIncoming();
      unsubOutgoing();
    };
  }, [user?.uid]);

  // Load network discovery
  useEffect(() => {
    if (activeTab === 'discover' && user?.uid) {
      loadMembers();
    }
  }, [activeTab, user?.uid]);

  const loadMembers = async () => {
    if (!user?.uid) return;
    setIsSearchingMembers(true);
    try {
      const results = await searchTokyoMembers(user.uid, searchMemberQuery);
      setDiscoveredMembers(results);
    } catch (e: any) {
      console.error('Error discovering members:', e);
    } finally {
      setIsSearchingMembers(false);
    }
  };

  const handleSendRequest = async (target: FriendProfile) => {
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
      setActionFeedback({
        type: 'success',
        message: `Friend request sent to ${target.displayName}!`,
      });
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to send request',
      });
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  const handleAcceptRequest = async (req: FriendRequestItem) => {
    if (!user) return;
    const currentReceiver: FriendProfile = {
      uid: user.uid,
      displayName: user.displayName || 'Tokyo Member',
      username: user.email ? `@${user.email.split('@')[0]}` : '@member',
      avatarUrl: user.photoURL || undefined,
      email: user.email || '',
    };

    try {
      await acceptFriendRequest(req, currentReceiver);
      setActionFeedback({
        type: 'success',
        message: `Connected with ${req.senderName}! You can now message and call each other.`,
      });
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to accept friend request',
      });
    }
  };

  const handleDeclineRequest = async (reqId: string) => {
    try {
      await declineFriendRequest(reqId);
    } catch (err: any) {
      console.error('Failed to decline request:', err);
    }
  };

  const tabs: { id: 'friends' | 'requests' | 'discover'; label: string; count: number }[] = [
    { id: 'friends', label: 'All Friends', count: friends.length },
    { id: 'requests', label: 'Requests', count: incomingRequests.length },
    { id: 'discover', label: 'Discover Network', count: discoveredMembers.length },
  ];

  return (
    <div className="w-full min-h-full pb-16">
      {/* Header with Navigation Tabs */}
      <header className="sticky top-0 z-20 bg-white/85 dark:bg-[#121212]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-neutral-800/80">
        <div className="px-4 sm:px-6 pt-4 pb-0">
          <div className="flex items-center justify-between pb-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Friends & Tokyo Network
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bidirectional connections for messaging & calling
              </p>
            </div>

            <button
              onClick={() => {
                setShowConnectModal(true);
                loadMembers();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0066FF] hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors whitespace-nowrap shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Connection</span>
            </button>
          </div>

          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-sm font-semibold relative py-3 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span>{tab.label}</span>
                  <span className="text-xs font-mono text-slate-400 tabular-nums">
                    ({tab.count})
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF] dark:bg-[#00D2FF] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Global Action Feedback Alert */}
      {actionFeedback && (
        <div className="px-4 sm:px-6 pt-4">
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900'
            }`}
          >
            <p className="font-medium">{actionFeedback.message}</p>
            <button onClick={() => setActionFeedback(null)} className="font-bold">×</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* TAB 1: ALL FRIENDS */}
        {activeTab === 'friends' && (
          <div>
            {friends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {friends.map((friend) => (
                  <div
                    key={friend.uid}
                    className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0066FF] to-[#00D2FF] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-xs">
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} alt={friend.displayName} className="w-full h-full object-cover" />
                        ) : (
                          friend.displayName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {friend.displayName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {friend.username}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                          <UserCheck className="w-3 h-3" />
                          <span>Accepted Friend</span>
                        </span>
                      </div>
                    </div>

                    {/* Friend Actions: Message, Voice Call, Video Call */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href="#messages"
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-[#0066FF] transition-colors"
                        title="Direct Message"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => startCall(friend, 'audio')}
                        className="p-2 rounded-xl text-[#0066FF] dark:text-[#00D2FF] hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
                        title="Voice Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startCall(friend, 'video')}
                        className="p-2 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#00D2FF] text-white hover:opacity-90 transition-opacity shadow-xs"
                        title="Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No friends in your Tokyo network yet"
                description="Tokyo Chart messaging and calling require accepted connections. Click 'Add Connection' to find other members and send an invite."
                statusBadgeText="Real Firestore Social Graph Ready"
                actionText="Find Members to Connect"
                onAction={() => {
                  setActiveTab('discover');
                  loadMembers();
                }}
                secondaryInfo="Real Firestore friendships; no artificial dummy accounts."
              />
            )}
          </div>
        )}

        {/* TAB 2: REQUESTS (INCOMING & OUTGOING) */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Incoming Requests */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Incoming Requests ({incomingRequests.length})
              </h2>

              {incomingRequests.length > 0 ? (
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0066FF] to-[#00D2FF] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {req.senderAvatar ? (
                            <img src={req.senderAvatar} alt={req.senderName} className="w-full h-full object-cover" />
                          ) : (
                            req.senderName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {req.senderName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {req.senderUsername} wants to connect with you
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(req.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-neutral-900/40 border border-slate-200/60 dark:border-neutral-800/60 text-center text-xs text-slate-500 dark:text-slate-400">
                  No incoming friend requests waiting.
                </div>
              )}
            </div>

            {/* Outgoing Pending Requests */}
            {outgoingRequests.length > 0 && (
              <div className="space-y-3 pt-2">
                <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Outgoing Pending Requests ({outgoingRequests.length})
                </h2>
                <div className="space-y-2">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200/60 dark:border-neutral-800/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          Sent to {req.receiverName} ({req.receiverUsername})
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeclineRequest(req.id)}
                        className="text-[11px] text-slate-400 hover:text-rose-500 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DISCOVER NETWORK */}
        {activeTab === 'discover' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchMemberQuery}
                onChange={(e) => setSearchMemberQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadMembers()}
                placeholder="Search registered Tokyo Chart members..."
                className="w-full pl-10 pr-24 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden"
              />
              <button
                onClick={loadMembers}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#0066FF] text-white text-[11px] font-semibold rounded-lg hover:bg-blue-700"
              >
                Search
              </button>
            </div>

            {isSearchingMembers ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0066FF]" />
                <p>Loading members from Firestore...</p>
              </div>
            ) : discoveredMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {discoveredMembers.map((member) => {
                  const isAlreadyFriend = friends.some((f) => f.uid === member.uid);
                  const isRequestPending = outgoingRequests.some((r) => r.receiverId === member.uid);

                  return (
                    <div
                      key={member.uid}
                      className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0066FF] to-[#00D2FF] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
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

                      {isAlreadyFriend ? (
                        <span className="px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                          Friend
                        </span>
                      ) : isRequestPending ? (
                        <span className="px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(member)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Connect</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2 bg-slate-50 dark:bg-neutral-900/40 rounded-2xl border border-slate-200/60 dark:border-neutral-800/60">
                <Compass className="w-7 h-7 mx-auto text-slate-400" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  No other members registered in Firestore yet
                </p>
                <p className="text-[11px] max-w-sm mx-auto">
                  To test mutual messaging and calls, register a second account in another browser window or incognito session and send a connection invite.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Connection Modal */}
      <Modal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        title="Connect with Tokyo Chart Members"
        description="Search registered accounts to send friendship invitations"
      >
        <div className="space-y-4 text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchMemberQuery}
              onChange={(e) => setSearchMemberQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadMembers()}
              placeholder="Search member by name or handle..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-neutral-800 rounded-xl border-0 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:ring-1 focus:ring-[#0066FF]"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {discoveredMembers.map((member) => (
              <div
                key={member.uid}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800/60 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{member.displayName}</p>
                  <p className="text-[11px] text-slate-500">{member.username}</p>
                </div>
                <button
                  onClick={() => {
                    handleSendRequest(member);
                    setShowConnectModal(false);
                  }}
                  className="px-3 py-1 bg-[#0066FF] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                >
                  Send Invite
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setShowConnectModal(false)}
              className="px-4 py-2 bg-slate-200 dark:bg-neutral-800 text-slate-800 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-300 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
