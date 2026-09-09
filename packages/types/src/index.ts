// Shared domain types, used across apps/services.
// Placeholder shapes — will grow alongside the database schema (see packages/database).

export interface User {
  id: string;
  telegramId: string;
  username: string | null;
}

export interface Video {
  id: string;
  userId: string;
  status: "draft" | "processing" | "pending" | "published" | "rejected" | "blocked" | "deleted";
}
