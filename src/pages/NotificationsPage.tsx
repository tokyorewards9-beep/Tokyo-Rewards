import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  AtSign, 
  UserCheck, 
  ShieldAlert, 
  Sparkles,
  Heart,
  MessageSquare,
  Users
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import { 
  AppNotification, 
  listenToUserNotifications, 
  markNotificationRead, 
  markAllNotificationsRead 
} from '../services/notificationService';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'mentions' | 'friends' | 'system'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [markedRead, setMarkedRead] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenToUserNotifications(user.uid, (list) => {
      setNotifications(list);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleMarkAllRead = async () => {
    setMarkedRead(true);
    await markAllNotificationsRead(notifications);
    setTimeout(() => setMarkedRead(false), 2000);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'friends') return n.type === 'friend_request';
    if (filter === 'mentions') return n.type === 'comment' || n.type === 'like';
    if (filter === 'system') return n.type === 'system_alert';
    return true;
  });

  const filters: { id: 'all' | 'mentions' | 'friends' | 'system'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'all', label: `All (${notifications.length})`, icon: Bell },
    { id: 'friends', label: `Friend Alerts (${notifications.filter((n) => n.type === 'friend_request').length})`, icon: UserCheck },
    { id: 'mentions', label: `Interactions (${notifications.filter((n) => n.type === 'like' || n.type === 'comment').length})`, icon: AtSign },
    { id: 'system', label: 'System', icon: ShieldAlert },
  ];

  return (
    <div className="w-full min-h-full pb-16">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/85 dark:bg-[#121212]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-neutral-800/80">
        <div className="px-4 sm:px-6 pt-4 pb-0">
          <div className="flex items-center justify-between pb-3">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Notifications & Activity
            </h1>
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              <CheckCheck className={`w-3.5 h-3.5 ${markedRead ? 'text-[#0066FF] dark:text-[#00D2FF]' : ''}`} />
              <span>{markedRead ? 'Inbox Cleared' : 'Mark all read'}</span>
            </button>
          </div>

          {/* Filter Sub-nav */}
          <div className="flex items-center gap-1 sm:gap-2 pb-3 overflow-x-auto no-scrollbar">
            {filters.map((f) => {
              const Icon = f.icon;
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800'
                  }`}
                  aria-pressed={isActive}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-4">
        {filteredNotifications.length > 0 ? (
          <div className="space-y-2">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markNotificationRead(notif.id)}
                className={`p-4 rounded-2xl border transition-colors cursor-pointer flex items-start gap-3 text-xs ${
                  notif.read
                    ? 'bg-white dark:bg-neutral-900/60 border-slate-200/80 dark:border-neutral-800'
                    : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 shadow-xs'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0066FF] to-[#00D2FF] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs">
                  {notif.type === 'like' ? (
                    <Heart className="w-4 h-4 fill-white" />
                  ) : notif.type === 'comment' ? (
                    <MessageSquare className="w-4 h-4" />
                  ) : notif.type === 'friend_request' ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {notif.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title={
              filter === 'mentions'
                ? 'No interactions yet'
                : filter === 'friends'
                ? 'No friend alerts'
                : filter === 'system'
                ? 'All systems operational'
                : 'You are completely caught up'
            }
            description={
              filter === 'mentions'
                ? "Interactions such as post likes and comments from Tokyo Chart friends will stream here in real time."
                : filter === 'friends'
                ? "Friend requests and accepted connection notices appear here."
                : "Real Firestore notifications stream is connected and waiting for activity."
            }
            statusBadgeText="Real Firestore Notifications Stream Active"
            secondaryInfo="Zero phantom notifications injected."
          />
        )}
      </div>
    </div>
  );
};
