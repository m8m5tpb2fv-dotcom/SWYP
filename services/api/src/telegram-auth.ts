import { createHmac, timingSafeEqual } from "node:crypto";

// Verification per https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

export interface TelegramInitDataUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface VerifiedInitData {
  user: TelegramInitDataUser;
  authDate: number;
}

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

export function verifyTelegramInitData(initData: string, botToken: string): VerifiedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new Error("initData is missing hash");
  }
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const expected = Buffer.from(computedHash, "hex");
  const received = Buffer.from(hash, "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error("Invalid initData signature");
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) {
    throw new Error("initData is expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new Error("initData is missing user");
  }

  return { user: JSON.parse(userRaw) as TelegramInitDataUser, authDate };
}
