import React, { useRef, useState } from 'react';
import { Camera, RefreshCw, AlertCircle, Check, UploadCloud } from 'lucide-react';
import { MediaAttachment } from '../../types';
import { 
  uploadMediaToCloudinary, 
  getCloudinaryCloudName, 
  DEFAULT_UPLOAD_PRESET 
} from '../../services/cloudinary';
import { saveProfileAvatarMetadataToFirestore } from '../../services/firebase';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  userId?: string;
  onAvatarUpdated: (newSecureUrl: string, attachment: MediaAttachment) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  userId = 'current_user',
  onAvatarUpdated,
  size = 'lg',
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24 sm:w-28 sm:h-28',
  }[size];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessNotice(null);

    const cloudName = getCloudinaryCloudName();
    if (!cloudName) {
      setErrorMessage(
        'Cloudinary Cloud Name is not configured. Please supply your Cloud Name in Settings or in VITE_CLOUDINARY_CLOUD_NAME.'
      );
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP) for your profile picture.');
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      // Real upload to Cloudinary using unsigned preset 'tokyo_chart_uploads'
      const attachment = await uploadMediaToCloudinary(file, {
        folder: 'tokyo_chart/profiles',
        tags: ['tokyo_chart', 'profile_picture'],
        onProgress: (percent) => setProgress(percent),
      });

      // Save secure URL and metadata to Firebase Firestore
      const firestoreResult = await saveProfileAvatarMetadataToFirestore(userId, attachment);

      onAvatarUpdated(attachment.secureUrl, attachment);

      if (firestoreResult.firestoreWritten) {
        setSuccessNotice('Profile picture uploaded to Cloudinary & synced to Firestore!');
      } else {
        setSuccessNotice('Profile picture uploaded to Cloudinary successfully!');
      }

      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload profile picture to Cloudinary');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload profile picture"
      />

      {/* Avatar Container */}
      <div className={`relative ${sizeClasses} rounded-2xl bg-white dark:bg-neutral-900 p-1.5 shadow-md group`}>
        <div className="w-full h-full rounded-xl overflow-hidden relative bg-gradient-to-tr from-[#0066FF] to-[#00D2FF] text-white flex items-center justify-center font-bold text-2xl sm:text-3xl select-none">
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt="Profile Avatar"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span>TC</span>
          )}

          {/* Upload Progress Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white text-xs p-2 z-20">
              <RefreshCw className="w-5 h-5 animate-spin text-[#00D2FF] mb-1" />
              <span className="font-mono font-bold text-[11px]">{progress}%</span>
              <span className="text-[9px] text-slate-300">Cloudinary</span>
            </div>
          )}

          {/* Hover / Action Overlay Button */}
          {!isUploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs gap-1 cursor-pointer focus:opacity-100 z-10"
              aria-label="Change profile photo"
              title="Upload new profile picture to Cloudinary"
            >
              <Camera className="w-5 h-5 stroke-[2]" />
              <span className="text-[10px] font-medium hidden sm:inline">Change</span>
            </button>
          )}
        </div>

        {/* Floating Quick Action Button on bottom-right of avatar */}
        {!isUploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white shadow-md transition-transform hover:scale-110 focus:outline-hidden focus:ring-2 focus:ring-[#0066FF]"
            aria-label="Upload new profile picture to Cloudinary"
            title="Upload photo to Cloudinary"
          >
            <Camera className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        )}
      </div>

      {/* Status Notifications */}
      {errorMessage && (
        <div className="mt-2.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-800 dark:text-rose-200 max-w-xs flex items-start gap-1.5 text-left">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Upload failed</p>
            <p className="mt-0.5 leading-tight">{errorMessage}</p>
          </div>
        </div>
      )}

      {successNotice && (
        <div className="mt-2.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-[11px] text-emerald-800 dark:text-emerald-200 max-w-xs flex items-center gap-1.5 text-left">
          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}
    </div>
  );
};
