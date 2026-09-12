import { apiFetch } from "./api";
import type { FeedItem } from "./feed";

export interface SearchUser {
  id: string;
  username: string | null;
  nickname: string | null;
  firstName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface HashtagResult {
  tag: string;
  count: number;
}

export interface SearchResults {
  videos: FeedItem[];
  users: SearchUser[];
  hashtags: HashtagResult[];
}

export function search(query: string) {
  return apiFetch<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`);
}
