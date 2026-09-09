export interface AuthUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export async function authenticateWithTelegram(initData: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Auth failed with status ${res.status}`);
  }

  const data = (await res.json()) as AuthResponse;
  accessToken = data.access_token;
  return data.user;
}
