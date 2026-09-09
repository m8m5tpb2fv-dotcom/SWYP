import { apiFetch } from "./api";

export type ReportReason = "adult" | "violence" | "fraud" | "spam" | "copyright" | "abuse" | "other";

export function reportVideo(videoId: string, reason: ReportReason) {
  return apiFetch<{ reported: boolean }>("/api/reports", {
    method: "POST",
    body: JSON.stringify({ videoId, reason }),
  });
}
