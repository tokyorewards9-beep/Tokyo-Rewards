import React, { useRef, useState } from 'react';
import { 
  Image as ImageIcon, 
  Video as VideoIcon, 
  X, 
  UploadCloud, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Play
} from 'lucide-react';
import { MediaAttachment } from '../../types';
import { 
  uploadMediaToCloudinary, 
  getCloudinaryCloudName, 
  DEFAULT_UPLOAD_PRESET 
} from '../../services/cloudinary';

export interface PendingMediaFile {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  uploadedAttachment?: MediaAttachment;
  errorMessage?: string;
}

interface MediaUploadZoneProps {
  onMediaUploaded: (attachments: MediaAttachment[]) => void;
  onClear?: () => void;
  folder?: string;
}

export const MediaUploadZone: React.FC<MediaUploadZoneProps> = ({
  onMediaUploaded,
  folder = 'tokyo_chart/posts',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PendingMediaFile[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setGlobalError(null);
    const newItems: PendingMediaFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isImage && !isVideo) {
        setGlobalError(`Unsupported file: ${file.name}. Only images and videos are supported.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        type: isVideo ? 'video' : 'image',
        status: 'idle',
        progress: 0,
      });
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      // Trigger upload immediately for newly added items
      newItems.forEach((item) => uploadItem(item));
    }

    // Reset input so same file can be re-selected if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadItem = async (item: PendingMediaFile) => {
    const cloudName = getCloudinaryCloudName();
    if (!cloudName) {
      const msg =
        'Cloudinary Cloud Name is not configured. Please enter your Cloud Name in Settings (or set VITE_CLOUDINARY_CLOUD_NAME).';
      setGlobalError(msg);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'error', errorMessage: msg } : it))
      );
      return;
    }

    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: 'uploading', progress: 0, errorMessage: undefined } : it))
    );

    try {
      const attachment = await uploadMediaToCloudinary(item.file, {
        folder,
        onProgress: (percent) => {
          setItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, progress: percent } : it))
          );
        },
      });

      setItems((prev) => {
        const updated = prev.map((it) =>
          it.id === item.id
            ? { ...it, status: 'success' as const, progress: 100, uploadedAttachment: attachment }
            : it
        );
        // Notify parent with all successful attachments
        const allCompleted = updated
          .map((it) => it.uploadedAttachment)
          .filter((att): att is MediaAttachment => Boolean(att));
        onMediaUploaded(allCompleted);
        return updated;
      });
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to upload file to Cloudinary';
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: 'error' as const, errorMessage: errorMsg } : it
        )
      );
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const filtered = prev.filter((it) => {
        if (it.id === id) {
          URL.revokeObjectURL(it.previewUrl);
          return false;
        }
        return true;
      });
      const allCompleted = filtered
        .map((it) => it.uploadedAttachment)
        .filter((att): att is MediaAttachment => Boolean(att));
      onMediaUploaded(allCompleted);
      return filtered;
    });
  };

  const triggerPicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
        aria-label="Upload post image or video to Cloudinary"
      />

      {/* Global Error Banner */}
      {globalError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Media Upload Error</p>
            <p className="text-[11px] leading-relaxed mt-0.5">{globalError}</p>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-rose-400 hover:text-rose-600"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Items Preview Grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden bg-slate-50 dark:bg-neutral-900 shadow-xs group"
            >
              {/* Media Preview */}
              <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                {item.type === 'video' ? (
                  <video
                    src={item.previewUrl}
                    controls
                    className="w-full h-full object-contain"
                    playsInline
                  />
                ) : (
                  <img
                    src={item.uploadedAttachment?.secureUrl || item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/70 hover:bg-black text-white transition-colors z-10"
                  aria-label="Remove media item"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Progress & Metadata Bar */}
              <div className="p-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[170px] text-[11px] font-medium" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>

                {/* Progress bar */}
                {item.status === 'uploading' && (
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#0066FF] to-[#00D2FF] h-full transition-all duration-150"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 text-[#0066FF] dark:text-[#00D2FF]">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        Uploading to Cloudinary...
                      </span>
                      <span className="font-mono">{item.progress}%</span>
                    </div>
                  </div>
                )}

                {/* Success state */}
                {item.status === 'success' && (
                  <div className="flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Uploaded to Cloudinary
                    </span>
                    <span className="font-mono text-slate-400">Secure URL</span>
                  </div>
                )}

                {/* Error state */}
                {item.status === 'error' && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 leading-tight">
                      {item.errorMessage || 'Upload failed'}
                    </p>
                    <button
                      type="button"
                      onClick={() => uploadItem(item)}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0066FF] hover:underline"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Retry upload
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Button to attach more if items already exist */}
      {items.length > 0 && (
        <button
          type="button"
          onClick={triggerPicker}
          className="inline-flex items-center gap-1.5 text-xs text-[#0066FF] dark:text-[#00D2FF] hover:underline font-medium"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Add more images or videos</span>
        </button>
      )}
    </div>
  );
};
