import React, { useState } from 'react';
import { Database, Key, CheckCircle2, AlertCircle, RefreshCw, X, Shield, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FirebaseClientConfig, getFirebaseConfigFromEnv } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const { connectFirebaseConfig, isFirebaseConfigured } = useAuth();

  const [rawConfigPaste, setRawConfigPaste] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [appId, setAppId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');

  const [parseError, setParseError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState(false);

  // Parse pasted Firebase SDK config snippet
  const handleParseSnippet = (text: string) => {
    setRawConfigPaste(text);
    setParseError(null);

    if (!text.trim()) return;

    try {
      // Handle JSON object or JS snippet like: const firebaseConfig = { apiKey: "...", ... };
      let jsonString = text;
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        // Replace unquoted keys or single quotes with valid JSON
        jsonString = match[0]
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
          .replace(/'/g, '"');
      }

      const parsed = JSON.parse(jsonString);

      if (parsed.apiKey) setApiKey(parsed.apiKey);
      if (parsed.projectId) setProjectId(parsed.projectId);
      if (parsed.authDomain) setAuthDomain(parsed.authDomain);
      if (parsed.appId) setAppId(parsed.appId);
      if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
      if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId);
    } catch (err) {
      // Regex extraction fallback
      const extract = (key: string) => {
        const regex = new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`);
        const m = text.match(regex);
        return m ? m[1] : '';
      };

      const extractedApiKey = extract('apiKey');
      const extractedProjectId = extract('projectId');

      if (extractedApiKey) setApiKey(extractedApiKey);
      if (extractedProjectId) setProjectId(extractedProjectId);
      if (extract('authDomain')) setAuthDomain(extract('authDomain'));
      if (extract('appId')) setAppId(extract('appId'));
      if (extract('storageBucket')) setStorageBucket(extract('storageBucket'));
      if (extract('messagingSenderId')) setMessagingSenderId(extract('messagingSenderId'));

      if (!extractedApiKey && !extractedProjectId) {
        setParseError('Could not auto-extract fields. Please fill in API Key and Project ID below.');
      }
    }
  };

  const handleSaveAndConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim()) {
      setParseError('API Key and Project ID are required to connect your Firebase project.');
      return;
    }

    const config: FirebaseClientConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      appId: appId.trim() || undefined,
      messagingSenderId: messagingSenderId.trim() || undefined,
    };

    try {
      connectFirebaseConfig(config);
      setConnectSuccess(true);
      setTimeout(() => {
        setConnectSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setParseError(err?.message || 'Failed to initialize Firebase with provided credentials');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Existing Firebase Project"
      description="Link your Firebase Authentication & Cloud Firestore database"
      maxWidth="lg"
    >
      <form onSubmit={handleSaveAndConnect} className="space-y-4 text-xs">
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-2 font-semibold">
            <Database className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF]" />
            <span>Connect Firebase Web Credentials</span>
          </div>
          <p>
            Paste your Firebase configuration from the{' '}
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noreferrer"
              className="underline font-medium inline-flex items-center gap-0.5"
            >
              Firebase Console <ExternalLink className="w-3 h-3" />
            </a>{' '}
            (Project settings &gt; General &gt; Your apps &gt; SDK setup and configuration).
          </p>
        </div>

        {/* Quick Paste Snippet Area */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Paste Firebase Config Object or Snippet (Optional Auto-Fill)
          </label>
          <textarea
            rows={3}
            value={rawConfigPaste}
            onChange={(e) => handleParseSnippet(e.target.value)}
            placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "your-project-id",\n  authDomain: "...",\n  appId: "..."\n};`}
            className="w-full p-2.5 font-mono text-[11px] bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-white focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden resize-none"
          />
        </div>

        {parseError && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Direct Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              API Key <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              required
              className="w-full p-2 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              Project ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="e.g. tokyo-chart-prod"
              required
              className="w-full p-2 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              Auth Domain
            </label>
            <input
              type="text"
              value={authDomain}
              onChange={(e) => setAuthDomain(e.target.value)}
              placeholder={`${projectId || 'project'}.firebaseapp.com`}
              className="w-full p-2 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              App ID
            </label>
            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="1:1234567890:web:abcdef..."
              className="w-full p-2 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Will activate Email/Password login and Firestore synchronization.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-xs"
            >
              {connectSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Connected!</span>
                </>
              ) : (
                <span>Save & Connect Firebase</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
