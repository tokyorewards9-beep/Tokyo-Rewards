/**
 * Cloudinary Media Service for Tokyo Chart
 *
 * Implements real client-side unsigned uploads using the user's upload preset:
 * "tokyo_chart_uploads".
 *
 * Security and architecture rules:
 * - NO API Secret in frontend code.
 * - Real XMLHttpRequest with live progress tracking (0% to 100%).
 * - Support for profile pictures, post images, and post videos.
 * - Accurate error parsing directly from Cloudinary's API.
 * - Diagnostic preset verification.
 */

import { CloudinaryUploadResponse, MediaAttachment } from '../types';

export const DEFAULT_UPLOAD_PRESET = 'tokyo_chart_uploads';
export const DEFAULT_CLOUD_NAME = 'dmkou4u6';
const LOCAL_STORAGE_CLOUD_NAME_KEY = 'tokyo_chart_cloudinary_cloud_name';
const LOCAL_STORAGE_PRESET_KEY = 'tokyo_chart_cloudinary_preset';

/**
 * Retrieves the configured Cloud Name from environment variable VITE_CLOUDINARY_CLOUD_NAME
 * or from browser local configuration, defaulting to user's dmkou4u6.
 */
export const getCloudinaryCloudName = (): string => {
  const envCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (envCloudName && typeof envCloudName === 'string' && envCloudName.trim().length > 0) {
    return envCloudName.trim();
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LOCAL_STORAGE_CLOUD_NAME_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  }

  return DEFAULT_CLOUD_NAME;
};

/**
 * Retrieves the configured Upload Preset (defaults to tokyo_chart_uploads).
 */
export const getCloudinaryUploadPreset = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LOCAL_STORAGE_PRESET_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  }

  const envPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (envPreset && typeof envPreset === 'string' && envPreset.trim().length > 0) {
    return envPreset.trim();
  }

  return DEFAULT_UPLOAD_PRESET;
};

/**
 * Saves Cloud Name locally for testing/runtime configuration if not in env.
 */
export const setLocalCloudinaryCloudName = (cloudName: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_CLOUD_NAME_KEY, cloudName.trim());
  }
};

/**
 * Saves Upload Preset locally if needed.
 */
export const setLocalCloudinaryUploadPreset = (preset: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_PRESET_KEY, preset.trim());
  }
};

export interface UploadMediaOptions {
  folder?: string;
  tags?: string[];
  cloudName?: string;
  preset?: string;
  onProgress?: (progressPercent: number, loadedBytes: number, totalBytes: number) => void;
}

/**
 * Uploads a real Image or Video file to Cloudinary with live progress tracking
 */
export const uploadMediaToCloudinary = (
  file: File,
  options: UploadMediaOptions = {}
): Promise<MediaAttachment> => {
  return new Promise((resolve, reject) => {
    const cloudName = options.cloudName || getCloudinaryCloudName();
    const preset = options.preset || getCloudinaryUploadPreset();

    if (!cloudName) {
      return reject(
        new Error(
          'Cloudinary Cloud Name is not configured. Please supply your Cloud Name in Settings or in VITE_CLOUDINARY_CLOUD_NAME.'
        )
      );
    }

    if (!preset) {
      return reject(
        new Error('Cloudinary Upload Preset is missing. Expected preset: tokyo_chart_uploads.')
      );
    }

    // Determine resource type: image vs video
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      return reject(
        new Error(`Unsupported file type: ${file.type}. Please select an image or video file.`)
      );
    }

    // Enforce reasonable client-side size limits
    const maxSizeBytes = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024; // 100MB for video, 15MB for image
    if (file.size > maxSizeBytes) {
      const maxMb = maxSizeBytes / (1024 * 1024);
      return reject(
        new Error(
          `File size exceeds limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed for ${
            isVideo ? 'video' : 'image'
          } is ${maxMb}MB.`
        )
      );
    }

    const resourceType = isVideo ? 'video' : 'image';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);

    if (options.folder) {
      formData.append('folder', options.folder);
    }

    if (options.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','));
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);

    // Track real upload progress
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && options.onProgress) {
        const percent = Math.min(Math.round((e.loaded / e.total) * 100), 99);
        options.onProgress(percent, e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      let responseBody: any;
      try {
        responseBody = JSON.parse(xhr.responseText);
      } catch (err) {
        responseBody = { error: { message: xhr.responseText || 'Non-JSON server response' } };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        const result = responseBody as CloudinaryUploadResponse;
        if (options.onProgress) {
          options.onProgress(100, file.size, file.size);
        }

        const attachment: MediaAttachment = {
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          resourceType: isVideo ? 'video' : 'image',
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          duration: result.duration,
          originalFilename: result.original_filename || file.name,
        };

        resolve(attachment);
      } else {
        const rawMessage = responseBody?.error?.message || `Upload failed with HTTP ${xhr.status}`;
        let helpfulMessage = rawMessage;

        // Requirement 3: Check whether preset is configured as unsigned
        if (rawMessage.toLowerCase().includes('must be unsigned') || rawMessage.toLowerCase().includes('unsigned uploads')) {
          helpfulMessage = `Preset signing error: Upload preset '${preset}' is configured as Signed in Cloudinary. Please edit '${preset}' in your Cloudinary Console (Settings > Upload > Upload presets) and change the Signing Mode to "Unsigned".`;
        } else if (rawMessage.toLowerCase().includes('unknown cloud_name')) {
          helpfulMessage = `Unknown Cloud Name '${cloudName}'. Please verify your Cloudinary Cloud Name in Settings.`;
        } else if (rawMessage.toLowerCase().includes('preset not found')) {
          helpfulMessage = `Upload preset '${preset}' was not found in Cloudinary account '${cloudName}'. Please create the preset in your Cloudinary console.`;
        }

        reject(new Error(helpfulMessage));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during Cloudinary upload. Please check your internet connection.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Cloudinary upload timed out. The file might be too large or the network is congested.'));
    };

    xhr.send(formData);
  });
};

export interface PresetVerificationResult {
  status: 'success' | 'signed_error' | 'not_found' | 'invalid_cloud' | 'missing_config' | 'error';
  isUnsigned: boolean;
  message: string;
  technicalDetails?: string;
}

/**
 * Requirement 3: Test and verify whether the preset is configured as Unsigned in Cloudinary.
 * Sends a minimal probe to test the unsigned upload endpoint without hardcoding or requiring secrets.
 */
export const verifyCloudinaryPreset = async (
  cloudNameInput?: string,
  presetInput?: string
): Promise<PresetVerificationResult> => {
  const cloudName = (cloudNameInput || getCloudinaryCloudName()).trim();
  const preset = (presetInput || getCloudinaryUploadPreset()).trim();

  if (!cloudName) {
    return {
      status: 'missing_config',
      isUnsigned: false,
      message: 'Cloud Name is missing. Please provide your Cloudinary Cloud Name.',
    };
  }

  if (!preset) {
    return {
      status: 'missing_config',
      isUnsigned: false,
      message: 'Upload preset is missing. Preset must be "tokyo_chart_uploads".',
    };
  }

  // Probe with a tiny 1x1 transparent PNG data URI
  const tinyPngDataUri =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const formData = new FormData();
  formData.append('file', tinyPngDataUri);
  formData.append('upload_preset', preset);
  formData.append('folder', 'tokyo_chart/verification_probe');
  formData.append('tags', 'tokyo_chart,verification_probe');

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.secure_url) {
      return {
        status: 'success',
        isUnsigned: true,
        message: `Success! Cloudinary account '${cloudName}' is connected and upload preset '${preset}' is verified as Unsigned.`,
        technicalDetails: `Asset ID: ${data.asset_id || data.public_id}, Secure URL: ${data.secure_url}`,
      };
    }

    const rawError = data?.error?.message || `HTTP ${response.status}`;
    const lower = rawError.toLowerCase();

    if (lower.includes('must be unsigned') || lower.includes('unsigned uploads')) {
      return {
        status: 'signed_error',
        isUnsigned: false,
        message: `Upload preset '${preset}' is configured as SIGNED. It must be UNSIGNED for client uploads.`,
        technicalDetails: `Cloudinary response: "${rawError}". Go to Cloudinary Console > Settings > Upload > Upload Presets > Edit '${preset}' > Signing Mode: Change to "Unsigned".`,
      };
    }

    if (lower.includes('unknown cloud_name')) {
      return {
        status: 'invalid_cloud',
        isUnsigned: false,
        message: `Unknown Cloud Name: '${cloudName}' does not exist on Cloudinary.`,
        technicalDetails: rawError,
      };
    }

    if (lower.includes('preset not found')) {
      return {
        status: 'not_found',
        isUnsigned: false,
        message: `Upload preset '${preset}' not found in Cloudinary account '${cloudName}'.`,
        technicalDetails: rawError,
      };
    }

    return {
      status: 'error',
      isUnsigned: false,
      message: `Verification returned: ${rawError}`,
      technicalDetails: JSON.stringify(data),
    };
  } catch (err) {
    return {
      status: 'error',
      isUnsigned: false,
      message: `Network failure connecting to Cloudinary: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
};
