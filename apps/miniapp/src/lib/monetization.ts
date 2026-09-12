import { apiFetch } from "./api";

// Both mint a Stars invoice server-side (services/api's monetization routes) —
// the caller opens it with WebApp.openInvoice and only updates local state
// once Telegram reports "paid"; the actual VideoUnlock/CreatorSubscription
// row is created by the bot's successful_payment handler.
export function unlockVideo(videoId: string) {
  return apiFetch<{ invoiceUrl: string }>(`/api/videos/${videoId}/unlock`, { method: "POST" });
}

export function subscribeToCreator(creatorId: string) {
  return apiFetch<{ invoiceUrl: string }>(`/api/users/${creatorId}/subscribe`, { method: "POST" });
}

// A permanent, one-time verified-account checkmark. isVerified flips only
// once the bot's successful_payment handler confirms payment.
export const VERIFIED_BADGE_PRICE_STARS = 1000;

export function purchaseVerification() {
  return apiFetch<{ invoiceUrl: string }>("/api/me/verify", { method: "POST" });
}
