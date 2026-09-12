import { apiFetch } from "./api";
import type { FeedItem } from "./feed";

export interface UserProfile {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  videosCount: number;
  likesCount: number;
  isFollowing: boolean;
  isMe: boolean;
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

// Only bio is editable — username/name/avatar are synced from Telegram's own
// profile on every login, so editing those in-app would just be overwritten
// the next time the user opens the Mini App.
export function updateMyBio(bio: string) {
  return apiFetch<{ bio: string | null }>("/api/me", {
    method: "PATCH",
    body: JSON.stringify({ bio }),
  });
}
