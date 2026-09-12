import { apiFetch } from "./api";
import type { FeedItem } from "./feed";

export interface UserProfile {
  id: string;
  username: string | null;
  nickname: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  followersCount: number;
  followingCount: number;
  videosCount: number;
  likesCount: number;
  isFollowing: boolean;
  isMe: boolean;
  // Set only when this user offers subscriptions (creator side). isSubscribed/
  // subscriptionExpiresAt describe the requester's own standing with them —
  // both null/false when isMe (subscribing to yourself makes no sense).
  subscriptionPriceStars: number | null;
  isSubscribed: boolean;
  subscriptionExpiresAt: string | null;
}

interface VideosPage {
  items: FeedItem[];
  next_cursor: string | null;
}

export function fetchUserProfile(userId: string) {
  return apiFetch<UserProfile>(`/api/users/${userId}`);
}

export function fetchUserVideos(userId: string, cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiFetch<VideosPage>(`/api/users/${userId}/videos${query}`);
}

export function followUser(userId: string) {
  return apiFetch<{ following: boolean; followersCount: number }>(`/api/users/${userId}/follow`, {
    method: "POST",
  });
}

export function unfollowUser(userId: string) {
  return apiFetch<{ following: boolean; followersCount: number }>(`/api/users/${userId}/follow`, {
    method: "DELETE",
  });
}

// bio, nickname and subscriptionPriceStars are the only editable fields —
// username/name/avatar sync from Telegram's own profile on every login, so
// editing those in-app would just be overwritten next launch. Every field
// is optional: omit one entirely to leave it unchanged (used by
// RegistrationScreen, which only ever sends `nickname`); subscriptionPriceStars
// specifically also accepts 0/null to turn subscriptions off.
export function updateMyProfile(payload: { bio?: string; subscriptionPriceStars?: number | null; nickname?: string | null }) {
  return apiFetch<{ bio: string | null; subscriptionPriceStars: number | null; nickname: string | null }>("/api/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
