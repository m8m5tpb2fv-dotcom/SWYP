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
export async function uploadFileToStorage(uploadUrl: string, file: File, contentType: string) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Не удалось загрузить видео (${res.status})`);
  }
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

export interface VideoStatus {
  id: string;
  status: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
}

export function getVideoStatus(videoId: string) {
  return apiFetch<VideoStatus>(`/api/videos/${videoId}/status`);
}
