import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Send, 
  Phone, 
  Video, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  X, 
  ArrowLeft,
  Users,
  AlertCircle,
  Check,
  CheckCheck,
  RefreshCw,
  Cloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { 
  ConversationItem, 
  ChatMessageItem, 
  listenToUserConversations, 
  listenToConversationMessages, 
  sendDirectTextMessage, 
  sendDirectMediaMessage, 
  getOrCreateConversation,
  markConversationAsRead
} from '../services/messageService';
import { 
  FriendProfile, 
  listenToAcceptedFriends 
} from '../services/friendService';
import { MediaUploadZone } from '../components/media/MediaUploadZone';
import { MediaAttachment } from '../types';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { startCall } = useCall();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [acceptedFriends, setAcceptedFriends] = useState<FriendProfile[]>([]);
  
  const [searchChat, setSearchChat] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Cloudinary media attachment state in chat composer
  const [isMediaZoneOpen, setIsMediaZoneOpen] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<MediaAttachment[]>([]);

  // Modal to initiate new chat with an accepted friend
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Listen to user's accepted friends
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenToAcceptedFriends(user.uid, (friends) => {
      setAcceptedFriends(friends);
    });
    return () => unsub();
  }, [user?.uid]);

  // 2. Listen to real-time conversations list
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenToUserConversations(
      user.uid,
      (convs) => {
        setConversations(convs);
      },
      (err) => {
        console.error('Error fetching conversations:', err);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // 3. Listen to real-time messages in active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    if (user?.uid) {
      markConversationAsRead(activeConversationId, user.uid);
    }

    const unsub = listenToConversationMessages(
      activeConversationId,
      (msgs) => {
        setMessages(msgs);
      },
      (err) => {
        console.error('Error listening to messages:', err);
      }
    );

    return () => unsub();
  }, [activeConversationId, user?.uid]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Find the other participant in active conversation
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const friendId = activeConversation?.participantIds?.find((id) => id !== user?.uid);
  const friendProfile: FriendProfile | undefined = friendId && activeConversation?.participantDetails
    ? activeConversation.participantDetails[friendId]
    : undefined;

  // Handle sending a text or media message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversationId || !user?.uid || !friendId) return;

    const trimmed = messageInput.trim();
    if (!trimmed && uploadedMedia.length === 0) return;

    setIsSending(true);
    setSendError(null);

    try {
      // 1. Send media message if media was uploaded via Cloudinary
      if (uploadedMedia.length > 0) {
        for (const item of uploadedMedia) {
          await sendDirectMediaMessage(
            activeConversationId,
            user.uid,
            friendId,
            trimmed,
            item
          );
        }
        setUploadedMedia([]);
        setIsMediaZoneOpen(false);
        setMessageInput('');
      } else {
        // 2. Send standard text message
        await sendDirectTextMessage(activeConversationId, user.uid, friendId, trimmed);
        setMessageInput('');
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setSendError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Start new conversation from modal
  const handleStartConversationWithFriend = async (friend: FriendProfile) => {
    if (!user) return;
    const currentMember: FriendProfile = {
      uid: user.uid,
      displayName: user.displayName || 'Tokyo Member',
      username: user.email ? `@${user.email.split('@')[0]}` : '@member',
      avatarUrl: user.photoURL || undefined,
      email: user.email || '',
    };

    try {
      const convId = await getOrCreateConversation(currentMember, friend);
      setActiveConversationId(convId);
      setShowNewChatModal(false);
    } catch (err: any) {
      console.error('Error starting conversation:', err);
      setSendError(err.message || 'Unable to open conversation');
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchChat.trim()) return true;
    const q = searchChat.toLowerCase();
    const otherId = c.participantIds.find((id) => id !== user?.uid);
    const other = otherId && c.participantDetails ? c.participantDetails[otherId] : null;
    return (
      other?.displayName?.toLowerCase().includes(q) ||
      other?.username?.toLowerCase().includes(q) ||
      c.lastMessage?.text?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full h-[calc(100dvh-3.5rem)] md:h-[100dvh] flex flex-col overflow-hidden bg-white dark:bg-[#121212]">
      {/* Top Header */}
      <header className="shrink-0 bg-white/85 dark:bg-[#121212]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-neutral-800/80 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Direct Messages</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0066FF] dark:text-[#00D2FF] border border-blue-200/60 dark:border-blue-900/60">
              Accepted Friends
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time chat & WebRTC voice/video calls
          </p>
        </div>

        <button
          onClick={() => setShowNewChatModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0066FF] hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors whitespace-nowrap shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
      </header>

      {/* Main Dual-Pane Chat Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Conversation List */}
        <section 
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200/80 dark:border-neutral-800/80 flex flex-col bg-slate-50/50 dark:bg-neutral-900/40 shrink-0 ${
            activeConversationId ? 'hidden md:flex' : 'flex'
          }`}
          aria-label="Conversation list"
        >
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-200/70 dark:border-neutral-800/70">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchChat}
                onChange={(e) => setSearchChat(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-800/60">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const otherUid = conv.participantIds.find((id) => id !== user?.uid);
                const other = otherUid && conv.participantDetails ? conv.participantDetails[otherUid] : null;
                const unreadCount = user?.uid && conv.unreadCounts ? conv.unreadCounts[user.uid] || 0 : 0;
                const isSelected = conv.id === activeConversationId;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full p-3.5 flex items-start gap-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-[#0066FF]'
                        : 'hover:bg-white dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#0066FF] to-[#00D2FF] text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden">
                        {other?.avatarUrl ? (
                          <img
                            src={other.avatarUrl}
                            alt={other.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          other?.displayName ? other.displayName.slice(0, 2).toUpperCase() : 'TC'
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-900" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {other?.displayName || 'Tokyo Member'}
                        </p>
                        {conv.updatedAt && (
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {conv.updatedAt?.toDate ? conv.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {other?.username || ''}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {conv.lastMessage?.text || 'No messages yet'}
                        </p>
                        {unreadCount > 0 && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-[#0066FF] text-white font-bold text-[10px]">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0066FF] flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    No active conversations
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Start a direct message with any accepted friend.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0066FF] hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
                >
                  Start New Chat
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Active Thread */}
        <section 
          className={`flex-1 flex flex-col bg-white dark:bg-[#121212] overflow-hidden ${
            !activeConversationId ? 'hidden md:flex' : 'flex'
          }`}
          aria-label="Active conversation thread"
        >
          {activeConversationId && friendProfile ? (
            <>
              {/* Thread Header with Video and Voice Call Buttons */}
              <div className="shrink-0 px-4 py-3 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-neutral-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveConversationId(null)}
                    className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0066FF] to-[#00D2FF] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs">
                    {friendProfile.avatarUrl ? (
                      <img
                        src={friendProfile.avatarUrl}
                        alt={friendProfile.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      friendProfile.displayName.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {friendProfile.displayName}
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {friendProfile.username} · Accepted Friend
                    </p>
                  </div>
                </div>

                {/* Call Trigger Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startCall(friendProfile, 'audio')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#0066FF] dark:text-[#00D2FF] hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-xs cursor-pointer"
                    title="Start Voice Call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Voice Call</span>
                  </button>

                  <button
                    onClick={() => startCall(friendProfile, 'video')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#0066FF] to-[#00D2FF] hover:opacity-90 text-white transition-opacity shadow-xs cursor-pointer"
                    title="Start Video Call"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Video Call</span>
                  </button>
                </div>
              </div>

              {/* Message History Stream */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-black/20">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#0066FF] flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Start of conversation with {friendProfile.displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                      Messages and calls are encrypted in transit and stored securely in Cloud Firestore.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.senderId === user?.uid;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-md rounded-2xl p-3 shadow-xs space-y-1.5 text-xs ${
                            isSelf
                              ? 'bg-gradient-to-br from-[#0066FF] to-[#0052CC] text-white rounded-br-xs'
                              : 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-neutral-700/80 rounded-bl-xs'
                          }`}
                        >
                          {/* Image Attachment */}
                          {msg.type === 'image' && msg.mediaUrl && (
                            <div className="rounded-xl overflow-hidden bg-black/10">
                              <img
                                src={msg.mediaUrl}
                                alt="Message attachment"
                                className="w-full max-h-72 object-cover rounded-xl"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          {/* Video Attachment */}
                          {msg.type === 'video' && msg.mediaUrl && (
                            <div className="rounded-xl overflow-hidden bg-black/90">
                              <video
                                src={msg.mediaUrl}
                                controls
                                playsInline
                                className="w-full max-h-72 object-contain rounded-xl"
                              />
                            </div>
                          )}

                          {/* Message Text */}
                          {msg.text && (
                            <p className="leading-relaxed whitespace-pre-wrap break-words">
                              {msg.text}
                            </p>
                          )}

                          {/* Footer with Timestamp and Read Receipt */}
                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] ${
                              isSelf ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {msg.createdAt?.toDate
                                ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Just now'}
                            </span>
                            {isSelf && (
                              <CheckCheck className="w-3 h-3 text-cyan-200" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Media Upload Drawer */}
              {isMediaZoneOpen && (
                <div className="p-3 bg-white dark:bg-neutral-900 border-t border-slate-200/80 dark:border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#00D2FF]" />
                      <span>Attach Photo or Video to Message (Cloudinary)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMediaZoneOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <MediaUploadZone
                    onMediaUploaded={(attachments) => setUploadedMedia(attachments)}
                    folder="tokyo_chart/chat_messages"
                  />
                </div>
              )}

              {/* Error Alert */}
              {sendError && (
                <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between border-t border-rose-200 dark:border-rose-900">
                  <p>{sendError}</p>
                  <button onClick={() => setSendError(null)} className="font-bold">×</button>
                </div>
              )}

              {/* Composer */}
              <form 
                onSubmit={handleSendMessage}
                className="shrink-0 p-3 bg-white dark:bg-[#121212] border-t border-slate-200/80 dark:border-neutral-800/80 flex items-center gap-2"
              >
                {/* Media Button */}
                <button
                  type="button"
                  onClick={() => setIsMediaZoneOpen(!isMediaZoneOpen)}
                  className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                    isMediaZoneOpen || uploadedMedia.length > 0
                      ? 'bg-blue-50 dark:bg-blue-950 text-[#0066FF] dark:text-[#00D2FF]'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'
                  }`}
                  title="Upload Image or Video"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* Input Textarea */}
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message to Tokyo friend..."
                  className="flex-1 px-4 py-2.5 text-xs bg-slate-100 dark:bg-neutral-800 border-0 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={isSending || (!messageInput.trim() && uploadedMedia.length === 0)}
                  className="p-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white transition-all shadow-xs cursor-pointer"
                  title="Send message"
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </>
          ) : (
            /* No conversation selected state */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0066FF] dark:text-[#00D2FF] flex items-center justify-center shadow-xs">
                <MessageSquare className="w-7 h-7 stroke-[1.8]" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Select a Conversation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                Choose an ongoing chat from the list or start a new conversation with one of your accepted friends.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-2 px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Compose New Message
              </button>
            </div>
          )}
        </section>
      </div>

      {/* New Chat Modal: Direct messaging with accepted friends */}
      <Modal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        title="Start Direct Message"
        description="Select an accepted friend to message"
      >
        <div className="space-y-4 text-xs">
          {acceptedFriends.length > 0 ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  placeholder="Filter friends..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-neutral-800 border-0 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden"
                />
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-800">
                {acceptedFriends
                  .filter((f) => 
                    !newChatSearch.trim() ||
                    f.displayName.toLowerCase().includes(newChatSearch.toLowerCase()) ||
                    f.username.toLowerCase().includes(newChatSearch.toLowerCase())
                  )
                  .map((friend) => (
                    <button
                      key={friend.uid}
                      onClick={() => handleStartConversationWithFriend(friend)}
                      className="w-full p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-neutral-800/60 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0066FF] to-[#00D2FF] text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                          {friend.avatarUrl ? (
                            <img src={friend.avatarUrl} alt={friend.displayName} className="w-full h-full object-cover" />
                          ) : (
                            friend.displayName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-900 dark:text-white">{friend.displayName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{friend.username}</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 text-[11px] font-semibold text-[#0066FF] dark:text-[#00D2FF] bg-blue-50 dark:bg-blue-950/60 rounded-lg">
                        Chat
                      </span>
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700 text-center space-y-3">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  No accepted friends found
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-relaxed">
                  Tokyo Chart enforces that users can only direct message accepted connections. Visit the Friends tab to send or accept friendship invitations.
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setShowNewChatModal(false)}
              className="px-4 py-2 bg-slate-200 dark:bg-neutral-800 text-slate-800 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
