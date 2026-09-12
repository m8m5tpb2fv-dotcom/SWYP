import { apiFetch } from "./api";

export interface CommentAuthor {
  id: string;
  username: string | null;
  nickname: string | null;
  firstName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface CommentItem {
  id: string;
  author: CommentAuthor;
  text: string;
  parentId: string | null;
  repliesCount: number;
  createdAt: string;
}

interface CommentsPage {
  items: CommentItem[];
  next_cursor: string | null;
}

export function fetchComments(videoId: string, cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiFetch<CommentsPage>(`/api/videos/${videoId}/comments${query}`);
}

export function postComment(videoId: string, text: string, parentId?: string) {
  return apiFetch<CommentItem>(`/api/videos/${videoId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text, ...(parentId ? { parentId } : {}) }),
  });
}

export function deleteComment(id: string) {
  return apiFetch<void>(`/api/comments/${id}`, { method: "DELETE" });
}
