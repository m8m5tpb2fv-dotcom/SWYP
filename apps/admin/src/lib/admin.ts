import { apiFetch } from "./api";
import { setToken } from "./auth";

export async function login(username: string, password: string) {
  const { access_token } = await apiFetch<{ access_token: string }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(access_token);
}

export interface Stats {
  usersCount: number;
  videosCount: number;
  publishedVideosCount: number;
  openReportsCount: number;
  viewsSum: number;
  likesSum: number;
}

export function fetchStats() {
  return apiFetch<Stats>("/api/admin/stats");
}

export interface AdminAuthor {
  id: string;
  username: string | null;
  firstName: string | null;
  avatarUrl: string | null;
}

export interface AdminVideo {
  id: string;
  author: AdminAuthor;
  title: string | null;
  status: string;
  category: string | null;
  hashtags: string[];
  isAdult: boolean;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  publishedAt: string | null;
}

interface VideosPage {
  items: AdminVideo[];
  next_cursor: string | null;
}

export function fetchVideos(status?: string, cursor?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return apiFetch<VideosPage>(`/api/admin/videos${qs ? `?${qs}` : ""}`);
}

export function blockVideo(id: string) {
  return apiFetch<{ id: string; status: string }>(`/api/admin/videos/${id}/block`, { method: "POST" });
}

export function restoreVideo(id: string) {
  return apiFetch<{ id: string; status: string }>(`/api/admin/videos/${id}/restore`, { method: "POST" });
}

export function deleteVideo(id: string) {
  return apiFetch<void>(`/api/admin/videos/${id}`, { method: "DELETE" });
}

export interface AdminReport {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { id: string; username: string | null; firstName: string | null };
  video: { id: string; title: string | null; status: string; thumbnailUrl: string | null; author: AdminAuthor };
}

interface ReportsPage {
  items: AdminReport[];
  next_cursor: string | null;
}

export function fetchReports(status?: string, cursor?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return apiFetch<ReportsPage>(`/api/admin/reports${qs ? `?${qs}` : ""}`);
}

export function resolveReport(id: string, action: "dismiss" | "block") {
  return apiFetch<{ id: string; status: string }>(`/api/admin/reports/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export interface AdminUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isBanned: boolean;
  videosCount: number;
}

interface UsersPage {
  items: AdminUser[];
  next_cursor: string | null;
}

export function fetchUsers(cursor?: string) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiFetch<UsersPage>(`/api/admin/users${qs}`);
}

export function banUser(id: string) {
  return apiFetch<{ id: string; isBanned: boolean }>(`/api/admin/users/${id}/ban`, { method: "POST" });
}

export function unbanUser(id: string) {
  return apiFetch<{ id: string; isBanned: boolean }>(`/api/admin/users/${id}/unban`, { method: "POST" });
}
