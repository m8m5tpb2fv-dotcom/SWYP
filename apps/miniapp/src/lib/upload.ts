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

export async function uploadFileToStorage(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
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
