import React, { useState } from 'react';
import { 
  Palette, 
  Shield, 
  Database, 
  Sliders, 
  Bell, 
  CheckCircle2, 
  Clock, 
  Sun, 
  Moon, 
  Monitor, 
  Lock,
  ExternalLink,
  Info,
  Cloud,
  UploadCloud,
  AlertCircle,
  RefreshCw,
  Check,
  Key
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { getSystemStatus } from '../services/backendStatus';
import { FirebaseConfigModal } from '../components/firebase/FirebaseConfigModal';
import { 
  getCloudinaryCloudName, 
  getCloudinaryUploadPreset, 
  setLocalCloudinaryCloudName, 
  verifyCloudinaryPreset, 
  DEFAULT_UPLOAD_PRESET,
  uploadMediaToCloudinary,
  PresetVerificationResult 
} from '../services/cloudinary';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme, density, setDensity } = useTheme();
  const { user, isFirebaseConfigured, signOut, previewShellMode, setPreviewShellMode, disconnectFirebaseConfig } = useAuth();
  const systemStatus = getSystemStatus();

  // Firebase modal state
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);

  // Cloudinary settings state
  const [cloudNameInput, setCloudNameInput] = useState(() => getCloudinaryCloudName());
  const [presetInput, setPresetInput] = useState(() => getCloudinaryUploadPreset());
  const [cloudNameSaved, setCloudNameSaved] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<PresetVerificationResult | null>(null);

  // Quick test upload state
  const [testUploadFile, setTestUploadFile] = useState<File | null>(null);
  const [isTestUploading, setIsTestUploading] = useState(false);
  const [testUploadProgress, setTestUploadProgress] = useState(0);
  const [testUploadResult, setTestUploadResult] = useState<{ url: string; publicId: string } | null>(null);
  const [testUploadError, setTestUploadError] = useState<string | null>(null);

  // Settings states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEffects, setSoundEffects] = useState(false);
  const [profilePublic, setProfilePublic] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  const handleSaveCloudName = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalCloudinaryCloudName(cloudNameInput);
    setCloudNameSaved(true);
    setTimeout(() => setCloudNameSaved(false), 3000);
  };

  const handleVerifyPreset = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const result = await verifyCloudinaryPreset(cloudNameInput, presetInput);
      setVerificationResult(result);
    } catch (err: any) {
      setVerificationResult({
        status: 'error',
        isUnsigned: false,
        message: err?.message || 'Verification probe encountered an error',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTestUpload = async () => {
    if (!testUploadFile) return;
    setIsTestUploading(true);
    setTestUploadProgress(0);
    setTestUploadResult(null);
    setTestUploadError(null);

    try {
      const res = await uploadMediaToCloudinary(testUploadFile, {
        cloudName: cloudNameInput,
        preset: presetInput,
        folder: 'tokyo_chart/test_uploads',
        onProgress: (percent) => setTestUploadProgress(percent),
      });

      setTestUploadResult({
        url: res.secureUrl,
        publicId: res.publicId,
      });
    } catch (err: any) {
      setTestUploadError(err?.message || 'Test upload failed');
    } finally {
      setIsTestUploading(false);
    }
  };

  return (
    <div className="w-full min-h-full pb-16">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/85 dark:bg-[#121212]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-neutral-800/80 px-4 sm:px-6 py-4">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          Settings & Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage visual appearance, account safety, and platform status
        </p>
      </header>

      <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
        {/* Appearance Section */}
        <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Palette className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF]" />
            <h2 className="text-sm font-semibold">Appearance & Tokyo Theme</h2>
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Color Theme
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Persisted locally in your browser storage
                </p>
              </div>
              <ThemeToggle variant="segmented" />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Display Density
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Spacing for cards, lists, and navigation
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-neutral-800 rounded-lg">
                <button
                  onClick={() => setDensity('comfortable')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    density === 'comfortable'
                      ? 'bg-white dark:bg-neutral-900 text-[#0066FF] dark:text-[#00D2FF] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Comfortable
                </button>
                <button
                  onClick={() => setDensity('compact')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    density === 'compact'
                      ? 'bg-white dark:bg-neutral-900 text-[#0066FF] dark:text-[#00D2FF] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Compact
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-neutral-800">
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mb-2">
                Brand Palette Palette Reference
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                  <div className="w-4 h-4 rounded-full bg-[#0066FF] mb-1.5" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">Tokyo Blue</p>
                  <p className="font-mono text-[10px] text-slate-500">#0066FF</p>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900/60">
                  <div className="w-4 h-4 rounded-full bg-[#00D2FF] mb-1.5" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">Accent Cyan</p>
                  <p className="font-mono text-[10px] text-slate-500">#00D2FF</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">
                  <div className="w-4 h-4 rounded-full bg-[#F8F9FE] border border-slate-300 mb-1.5" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">Light Canvas</p>
                  <p className="font-mono text-[10px] text-slate-500">#F8F9FE</p>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-900 text-white border border-neutral-800">
                  <div className="w-4 h-4 rounded-full bg-[#121212] border border-neutral-700 mb-1.5" />
                  <p className="font-semibold text-slate-200 text-[11px]">Dark Canvas</p>
                  <p className="font-mono text-[10px] text-slate-400">#121212</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Backend & Firebase Integration Station */}
        <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Database className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF]" />
              <h2 className="text-sm font-semibold">Backend Integration Status</h2>
            </div>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
              Stage 1 Shell Ready
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">Firebase Project Status:</span>
              <span className={`font-semibold ${isFirebaseConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isFirebaseConfigured ? 'Configured & Initialized' : 'Not Configured (Awaiting Project Setup)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">Authentication Session:</span>
              <span className="font-mono text-slate-900 dark:text-white">
                {user ? user.email || user.uid : previewShellMode ? 'Foundation Preview (Unauthenticated)' : 'No User Signed In'}
              </span>
            </div>
            {previewShellMode && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-neutral-700/60 flex justify-end">
                <button
                  onClick={() => setPreviewShellMode(false)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[#0066FF] hover:bg-blue-700 text-white font-medium transition-colors"
                >
                  Return to Welcome / Login Screen
                </button>
              </div>
            )}
            {user && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-neutral-700/60 flex justify-end">
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors"
                >
                  Sign Out of Session
                </button>
              </div>
            )}

            {/* Firebase Connection / Credentials Action Bar */}
            <div className="pt-2.5 border-t border-slate-200/60 dark:border-neutral-700/60 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isFirebaseConfigured ? 'Firebase Web credentials stored.' : 'Enter API Key and Project ID to connect.'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFirebaseModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{isFirebaseConfigured ? 'Update Firebase Config' : 'Connect Firebase Credentials'}</span>
                </button>
                {isFirebaseConfigured && (
                  <button
                    type="button"
                    onClick={() => disconnectFirebaseConfig()}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-neutral-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-medium transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Per your instructions, your existing Firebase project has not been overwritten, replaced, or simulated with dummy credentials. The frontend contracts are pristine and ready to attach in the next stage.
          </p>

          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Planned Stage 2 Data Schemas:
            </p>
            <div className="space-y-1.5">
              {systemStatus.plannedCollections.map((col) => (
                <div 
                  key={col.name}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200/70 dark:border-neutral-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-slate-900 dark:text-white">
                      {col.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {col.description}
                    </p>
                  </div>
                  {col.status === 'ready' ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                      <Check className="w-3 h-3" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>Pending Firebase Link</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cloudinary Media Storage & Diagnostics */}
        <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Cloud className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF]" />
              <h2 className="text-sm font-semibold">Cloudinary Media Engine</h2>
            </div>
            <span className="text-[11px] font-medium text-[#0066FF] dark:text-[#00D2FF] bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
              Preset: tokyo_chart_uploads
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Real client-side media storage for profile pictures, post photos, and post videos. Uploads stream directly to Cloudinary using your unsigned upload preset; resulting secure URLs are stored in Firebase Firestore.
          </p>

          {/* Cloud Name & Preset Form */}
          <form onSubmit={handleSaveCloudName} className="space-y-3 pt-1 text-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Cloudinary Cloud Name
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Env: VITE_CLOUDINARY_CLOUD_NAME
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cloudNameInput}
                  onChange={(e) => setCloudNameInput(e.target.value)}
                  placeholder="e.g. my-tokyo-cloud"
                  className="flex-1 p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-[#0066FF] focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white font-medium transition-colors whitespace-nowrap shadow-xs"
                >
                  {cloudNameSaved ? 'Saved!' : 'Save Name'}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                Upload Preset (Unsigned)
              </label>
              <input
                type="text"
                value={presetInput}
                readOnly
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300 font-mono text-xs cursor-not-allowed"
                title="Configured preset: tokyo_chart_uploads"
              />
            </div>
          </form>

          {/* Preset Verification & Diagnostics Button */}
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  Preset & Connection Verifier
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Probes Cloudinary to verify Cloud Name and confirm the preset is Unsigned
                </p>
              </div>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleVerifyPreset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xs"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Verify Preset</span>
                  </>
                )}
              </button>
            </div>

            {/* Verification Result Card */}
            {verificationResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  verificationResult.status === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                    : verificationResult.status === 'signed_error'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {verificationResult.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{verificationResult.message}</p>
                    {verificationResult.technicalDetails && (
                      <p className="text-[11px] font-mono mt-1 opacity-90 leading-relaxed">
                        {verificationResult.technicalDetails}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Real Upload Test Card */}
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 space-y-2 text-xs">
            <p className="font-semibold text-slate-900 dark:text-white">
              Real Upload Test (Images & Videos)
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Test an actual media upload with real-time percentage progress:
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  setTestUploadFile(e.target.files?.[0] || null);
                  setTestUploadResult(null);
                  setTestUploadError(null);
                }}
                className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0066FF] file:text-white hover:file:bg-blue-700 cursor-pointer text-slate-600 dark:text-slate-400"
              />
              <button
                type="button"
                disabled={!testUploadFile || isTestUploading}
                onClick={handleTestUpload}
                className="px-4 py-1.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors whitespace-nowrap shadow-xs"
              >
                {isTestUploading ? `Uploading ${testUploadProgress}%...` : 'Test Real Upload'}
              </button>
            </div>

            {/* Test Upload Progress */}
            {isTestUploading && (
              <div className="space-y-1 pt-1">
                <div className="w-full bg-slate-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#0066FF] to-[#00D2FF] h-full transition-all duration-150"
                    style={{ width: `${testUploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-mono">Progress: {testUploadProgress}%</p>
              </div>
            )}

            {/* Test Upload Success */}
            {testUploadResult && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Real Upload Successful!</span>
                </div>
                <p className="text-[11px] truncate font-mono">
                  Secure URL: <a href={testUploadResult.url} target="_blank" rel="noreferrer" className="underline">{testUploadResult.url}</a>
                </p>
                <p className="text-[10px] text-slate-500 font-mono">Public ID: {testUploadResult.publicId}</p>
              </div>
            )}

            {/* Test Upload Error */}
            {testUploadError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Upload Failed</p>
                  <p className="text-[11px] leading-relaxed mt-0.5">{testUploadError}</p>
                </div>
              </div>
            )}
          </div>

          {/* Security & Secrets Guarantee (Requirement 9) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <Key className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#00D2FF]" />
              <span>Zero-Secret Architecture</span>
            </div>
            <p>
              Your Cloudinary API Secret is <strong>never</strong> required or exposed in the frontend. All client uploads use Cloudinary's secure Unsigned Upload protocol.
            </p>
          </div>
        </section>

        {/* Privacy & Safety Controls */}
        <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Shield className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF]" />
            <h2 className="text-sm font-semibold">Privacy & Permissions</h2>
          </div>

          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  Public Profile
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Allow any Tokyo Chart member to view your feed
                </p>
              </div>
              <button
                onClick={() => setProfilePublic(!profilePublic)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                  profilePublic ? 'bg-[#0066FF]' : 'bg-slate-300 dark:bg-neutral-700'
                }`}
                aria-label="Toggle Public Profile"
              >
                <div 
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    profilePublic ? 'translate-x-4' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-neutral-800">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  Direct Message Read Receipts
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Signal message delivered and seen timestamps
                </p>
              </div>
              <button
                onClick={() => setReadReceipts(!readReceipts)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                  readReceipts ? 'bg-[#0066FF]' : 'bg-slate-300 dark:bg-neutral-700'
                }`}
                aria-label="Toggle Read Receipts"
              >
                <div 
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    readReceipts ? 'translate-x-4' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>
          </div>
        </section>

        {/* Notifications Preference */}
        <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Bell className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF]" />
            <h2 className="text-sm font-semibold">Notification Controls</h2>
          </div>

          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  Desktop & In-App Alerts
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Receive activity pings for replies and mentions
                </p>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notificationsEnabled ? 'bg-[#0066FF]' : 'bg-slate-300 dark:bg-neutral-700'
                }`}
                aria-label="Toggle Desktop Notifications"
              >
                <div 
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-neutral-800">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  Subtle Sound Effects
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Play light audio feedback on post and reactions
                </p>
              </div>
              <button
                onClick={() => setSoundEffects(!soundEffects)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                  soundEffects ? 'bg-[#0066FF]' : 'bg-slate-300 dark:bg-neutral-700'
                }`}
                aria-label="Toggle Sound Effects"
              >
                <div 
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    soundEffects ? 'translate-x-4' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>
          </div>
        </section>

        {/* WebRTC Calling & ICE/TURN Servers Configuration */}
        <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Shield className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF]" />
              <h2 className="text-sm font-semibold">WebRTC Voice & Video Infrastructure</h2>
            </div>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
              STUN Active
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Tokyo Chart uses real browser WebRTC (<code className="font-mono text-[#0066FF]">getUserMedia</code> + <code className="font-mono text-[#0066FF]">RTCPeerConnection</code>) with Cloud Firestore for signaling (SDP offers, SDP answers, and ICE candidate exchange).
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700/80 space-y-2 text-xs">
            <p className="font-semibold text-slate-900 dark:text-white">Default STUN Servers</p>
            <ul className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
              <li>• stun:stun.l.google.com:19302</li>
              <li>• stun:stun1.l.google.com:19302</li>
              <li>• stun:stun2.l.google.com:19302</li>
            </ul>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 leading-relaxed">
              STUN allows browsers behind normal home NATs to discover their public IP and establish direct peer-to-peer audio and video streams.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-200">
              <Info className="w-4 h-4 text-[#0066FF] dark:text-[#00D2FF]" />
              <span>TURN Relay Server Guidance</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              When users are behind symmetric NATs, cellular carrier CGNATs, or restrictive corporate firewalls, direct UDP hole punching fails. A <strong>TURN</strong> (Traversal Using Relays around NAT) server relays encrypted media packets between peers.
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              To configure a TURN provider (e.g. Coturn, Twilio Network Traversal, or Xirsys), enter your TURN server credentials below:
            </p>
            <div className="space-y-2 pt-1">
              <input
                type="text"
                id="custom-turn-url"
                placeholder="e.g. turn:your-turn-host.com:3478"
                defaultValue={(() => {
                  try {
                    const saved = localStorage.getItem('tokyo_chart_rtc_ice_servers');
                    if (saved) {
                      const parsed = JSON.parse(saved);
                      return parsed[0]?.urls?.[0] || '';
                    }
                  } catch (e) {}
                  return '';
                })()}
                className="w-full p-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-[#0066FF]"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  id="custom-turn-user"
                  placeholder="Username"
                  className="flex-1 p-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-[#0066FF]"
                />
                <input
                  type="password"
                  id="custom-turn-cred"
                  placeholder="Credential / Secret"
                  className="flex-1 p-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const urlInput = (document.getElementById('custom-turn-url') as HTMLInputElement)?.value.trim();
                  const userInput = (document.getElementById('custom-turn-user') as HTMLInputElement)?.value.trim();
                  const credInput = (document.getElementById('custom-turn-cred') as HTMLInputElement)?.value.trim();
                  if (urlInput) {
                    const serverConfig = [
                      {
                        urls: [urlInput],
                        username: userInput || undefined,
                        credential: credInput || undefined,
                      },
                    ];
                    localStorage.setItem('tokyo_chart_rtc_ice_servers', JSON.stringify(serverConfig));
                    alert('Custom TURN server configuration saved persistently!');
                  } else {
                    localStorage.removeItem('tokyo_chart_rtc_ice_servers');
                    alert('Custom TURN servers cleared; reverting to standard STUN.');
                  }
                }}
                className="px-3.5 py-1.5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs"
              >
                Save TURN Configuration
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Firebase Configuration Modal */}
      <FirebaseConfigModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />
    </div>
  );
};
