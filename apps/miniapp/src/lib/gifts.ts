import { apiFetch } from "./api";

export interface Gift {
  id: string;
  starCount: number;
  stickerUrl: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function fetchGifts() {
  return apiFetch<{ items: Gift[] }>("/api/gifts").then((r) => r.items);
}

// Sticker images are served unauthenticated (see services/api/src/routes/gifts.ts)
// so a plain <img> can load them — need the full origin since stickerUrl is
// API-relative, not miniapp-relative.
export function giftStickerSrc(gift: Gift) {
  return `${API_URL}${gift.stickerUrl}`;
}

export function purchaseGift(giftId: string, recipientUserId: string, videoId?: string) {
  return apiFetch<{ transactionId: string; invoiceUrl: string }>("/api/gifts/purchase", {
    method: "POST",
    body: JSON.stringify({ giftId, recipientUserId, videoId }),
  });
}
