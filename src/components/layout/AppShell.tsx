import React, { useState, useEffect } from 'react';
import { NavigationTab } from '../../types';
import { Sidebar } from './Sidebar';
import { RightPanel } from './RightPanel';
import { MobileNav } from './MobileNav';
import { MobileHeader } from './MobileHeader';
import { Modal } from '../ui/Modal';
import { Info, Send, Image as ImageIcon, MapPin } from 'lucide-react';

import { HomePage } from '../../pages/HomePage';
import { SearchPage } from '../../pages/SearchPage';
import { FriendsPage } from '../../pages/FriendsPage';
import { MessagesPage } from '../../pages/MessagesPage';
import { NotificationsPage } from '../../pages/NotificationsPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { SettingsPage } from '../../pages/SettingsPage';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ShieldAlert, Video as VideoIcon, CheckCircle2, Cloud } from 'lucide-react';
import { MediaUploadZone } from '../media/MediaUploadZone';
import { MediaAttachment } from '../../types';
import { createCommunityPost } from '../../services/postService';
import { IncomingCallModal } from '../calls/IncomingCallModal';
import { ActiveCallOverlay } from '../calls/ActiveCallOverlay';

const VALID_TABS: NavigationTab[] = [
  'home',
  'search',
  'friends',
  'messages',
  'notifications',
  'profile',
  'settings',
];

export const AppShell: React.FC = () => {
  const { user, previewShellMode, setPreviewShellMode } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavigationTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as NavigationTab;
      if (VALID_TABS.includes(hash)) {
        return hash;
      }
    }
    return 'home';
  });

  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [modalMedia, setModalMedia] = useState<MediaAttachment[]>([]);
  const [isModalMediaOpen, setIsModalMediaOpen] = useState(false);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);
  const [modalFeedbackToast, setModalFeedbackToast] = useState<{ message: string; success: boolean } | null>(null);

  // Sync tab with browser URL hash for client-side navigation & back button support
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as NavigationTab;
      if (VALID_TABS.includes(hash)) {
        setCurrentTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (tab: NavigationTab) => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderActivePage = () => {
    switch (currentTab) {
      case 'home':
        return <HomePage onOpenComposeModal={() => setIsComposeModalOpen(true)} />;
      case 'search':
        return <SearchPage />;
      case 'friends':
        return <FriendsPage />;
      case 'messages':
        return <MessagesPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage onOpenComposeModal={() => setIsComposeModalOpen(true)} />;
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#F8F9FE] dark:bg-[#121212] text-slate-900 dark:text-slate-100 flex flex-col items-center overflow-x-hidden antialiased">
      {/* Top Banner when in Foundation Preview Mode */}
      {previewShellMode && (
        <div className="w-full bg-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between z-40 border-b border-slate-800">
          <div className="flex items-center gap-2 max-w-xl truncate">
            <ShieldAlert className="w-4 h-4 text-[#00D2FF] shrink-0" />
            <span className="truncate">
              Foundation Preview Mode: Viewing shell without an active Firebase session.
            </span>
          </div>
          <button
            onClick={() => setPreviewShellMode(false)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#00D2FF] font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Login Screen</span>
          </button>
        </div>
      )}

      {/* Maximum Container for High Resolution / Ultra-Wide Displays */}
      <div className="w-full max-w-[1440px] flex flex-1">
        {/* Left Sticky Sidebar (Desktop & Tablet) */}
        <Sidebar
          currentTab={currentTab}
          onNavigate={navigateTo}
          onOpenCompose={() => setIsComposeModalOpen(true)}
        />

        {/* Central Dynamic Content Region */}
        <div className="flex-1 min-w-0 flex flex-col min-h-[100dvh] border-r border-slate-200/90 dark:border-neutral-800/90 bg-white/40 dark:bg-black/20">
          {/* Mobile Top Header (Small Screens Only) */}
          <MobileHeader
            onNavigate={navigateTo}
            onOpenCompose={() => setIsComposeModalOpen(true)}
            currentTab={currentTab}
          />

          {/* Active Route Viewport */}
          <main className="flex-1 w-full pb-16 md:pb-0" id="main-content">
            {renderActivePage()}
          </main>
        </div>

        {/* Right Info Panel (Desktop screens $\ge$ 1024px) */}
        <RightPanel
          onNavigate={navigateTo}
          onSelectTopic={(topic) => {
            navigateTo('search');
          }}
        />
      </div>

      {/* Mobile Bottom Navigation (Small Screens Only) */}
      <MobileNav
        currentTab={currentTab}
        onNavigate={navigateTo}
      />

      {/* Global Compose Modal */}
      <Modal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        title="Create Tokyo Post"
        description="Share photos, videos, or thoughts with the Tokyo Chart network"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 flex items-start gap-3">
            <Cloud className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Cloudinary Media & Firestore Storage</p>
              <p className="mt-1 leading-relaxed">
                Photos and videos upload directly to Cloudinary (<code className="font-mono text-[#0066FF] dark:text-[#00D2FF]">tokyo_chart_uploads</code>) and secure URLs are recorded in Firebase Firestore.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="modal-post-textarea" className="font-medium text-slate-700 dark:text-slate-300">
              Post Content
            </label>
            <textarea
              id="modal-post-textarea"
              rows={3}
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              placeholder="What's happening across Tokyo? Share updates, insights, or local discoveries..."
              className="w-full p-3 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden resize-none leading-relaxed"
            />
          </div>

          {/* Media Upload Zone */}
          {isModalMediaOpen && (
            <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
              <MediaUploadZone
                onMediaUploaded={(attachments) => setModalMedia(attachments)}
                folder="tokyo_chart/posts"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsModalMediaOpen(!isModalMediaOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  isModalMediaOpen || modalMedia.length > 0
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-[#0066FF] dark:text-[#00D2FF]'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800'
                }`}
                title="Attach photo or video"
              >
                <ImageIcon className="w-4 h-4" />
                <VideoIcon className="w-4 h-4" />
                <span>Media ({modalMedia.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsComposeModalOpen(false);
                  setModalMedia([]);
                  setIsModalMediaOpen(false);
                }}
                className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isModalSubmitting || (!composeText.trim() && modalMedia.length === 0)}
                onClick={async () => {
                  setIsModalSubmitting(true);
                  try {
                    const authorProfile = {
                      uid: user?.uid || 'guest_user',
                      displayName: user?.displayName || 'Tokyo Member',
                      username: user?.email ? `@${user.email.split('@')[0]}` : '@tokyouser',
                      avatarUrl: user?.photoURL || undefined,
                      email: user?.email || '',
                    };

                    await createCommunityPost(
                      authorProfile,
                      composeText,
                      modalMedia
                    );

                    setIsComposeModalOpen(false);
                    setComposeText('');
                    setModalMedia([]);
                    setIsModalMediaOpen(false);

                    setModalFeedbackToast({
                      success: true,
                      message: 'Post published with Cloudinary media & synced to Tokyo Chart feed!',
                    });
                  } catch (err: any) {
                    setModalFeedbackToast({
                      success: false,
                      message: err?.message || 'Failed to submit post',
                    });
                  } finally {
                    setIsModalSubmitting(false);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isModalSubmitting ? 'Posting...' : 'Post'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Temporary Toast Alert */}
      {modalFeedbackToast && (
        <div 
          className="fixed bottom-20 md:bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 dark:bg-neutral-800 text-white border border-slate-700 shadow-2xl max-w-sm flex items-start gap-3 animate-in slide-in-from-bottom duration-200"
          role="status"
        >
          {modalFeedbackToast.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <p className="font-semibold text-sm">
              {modalFeedbackToast.success ? 'Upload & Post Complete' : 'Submission Note'}
            </p>
            <p className="text-slate-300 leading-relaxed">
              {modalFeedbackToast.message}
            </p>
            <button
              onClick={() => setModalFeedbackToast(null)}
              className="text-[11px] font-medium text-[#00D2FF] hover:underline pt-1 block"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Real-time Voice and Video WebRTC Call Overlays */}
      <IncomingCallModal />
      <ActiveCallOverlay />
    </div>
  );
};
