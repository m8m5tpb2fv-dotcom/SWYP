import { apiFetch } from "./api";

export interface FeedAuthor {
  id: string;
  username: string | null;
  nickname: string | null;
  firstName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface FeedItem {
  id: string;
  author: FeedAuthor;
  title: string | null;
  description: string | null;
  category: string | null;
  hashtags: string[];
  videoUrl: string | null;
  thumbnailUrl: string | null;
  // isPremium videos withhold videoUrl (null, even though thumbnailUrl still
  // signs as a teaser) until isUnlocked — either a VideoUnlock purchase, an
  // active CreatorSubscription to the author, or the viewer being the author.
  isPremium: boolean;
  priceStars: number | null;
  isAdult: boolean;
  isUnlocked: boolean;
  duration: number | null;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  createdAt: string;
  publishedAt: string | null;
  isLiked: boolean;
}

interface FeedPage {
  items: FeedItem[];
  next_cursor: string | null;
}

export function fetchFeed(params: { cursor?: string; category?: string; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.category) query.set("category", params.category);
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiFetch<FeedPage>(`/api/feed${qs ? `?${qs}` : ""}`);
}

export function fetchVideoById(id: string) {
  return apiFetch<FeedItem>(`/api/videos/${id}`);
}

export function likeVideo(id: string) {
  return apiFetch<{ liked: boolean; likesCount: number }>(`/api/videos/${id}/like`, { method: "POST" });
}

export function unlikeVideo(id: string) {
  return apiFetch<{ liked: boolean; likesCount: number }>(`/api/videos/${id}/like`, { method: "DELETE" });
}

export function shareVideo(id: string) {
  return apiFetch<{ sharesCount: number }>(`/api/videos/${id}/share`, { method: "POST" });
}
