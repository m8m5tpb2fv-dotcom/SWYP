import { apiFetch } from "./api";

export interface UploadUrlResponse {
  videoId: string;
  uploadUrl: string;
}

export function requestUploadUrl(contentType: string) {
  return apiFetch<UploadUrlResponse>("/api/videos/upload-url", {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
}

// contentType must match exactly what requestUploadUrl() signed the URL with —
// the presigned URL's signature is bound to a specific Content-Type, and S3
// rejects the PUT with SignatureDoesNotMatch if the header differs (e.g. when
// file.type comes back empty for some formats and requestUploadUrl fell back
// to "video/mp4" while this used the empty string).
//
// Uses XMLHttpRequest rather than fetch() because fetch has no upload-progress
// event — for a multi-minute video over mobile data, an unmoving "Uploading…"
// label is indistinguishable from a hang, so onProgress lets the UI show %.
export function uploadFileToStorage(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (fraction: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Не удалось загрузить видео (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Не удалось загрузить видео (сетевая ошибка)"));
    xhr.send(file);
  });
}

export interface PublishPayload {
  title?: string;
  description?: string;
  category?: string;
  hashtags?: string[];
}

export function publishVideo(videoId: string, payload: PublishPayload) {
  return apiFetch<{ id: string; status: string }>(`/api/videos/${videoId}/publish`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface UpdateVideoResult {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  hashtags: string[];
}

// Editing an already-published video's info — separate from publishVideo,
// which also kicks off transcoding and only works on a draft.
export function updateVideo(videoId: string, payload: PublishPayload) {
  return apiFetch<UpdateVideoResult>(`/api/videos/${videoId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface VideoStatus {
  id: string;
  status: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
}

export function getVideoStatus(videoId: string) {
  return apiFetch<VideoStatus>(`/api/videos/${videoId}/status`);
}
