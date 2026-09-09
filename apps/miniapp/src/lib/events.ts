import { apiFetch } from "./api";

// Fire-and-forget — analytics must never block or break the viewing experience.
export function sendImpression(videoId: string) {
  apiFetch("/api/events", {
    method: "POST",
    body: JSON.stringify({ type: "video_impression", videoId }),
  }).catch(() => {});
}

export function sendWatch(videoId: string, watchSeconds: number, completed: boolean) {
  apiFetch("/api/events", {
    method: "POST",
    body: JSON.stringify({ type: "video_watch", videoId, watchSeconds, completed }),
  }).catch(() => {});
}
