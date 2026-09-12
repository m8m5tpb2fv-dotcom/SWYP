import { createReadStream } from "node:fs";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const bucket = () => requireEnv("STORAGE_BUCKET");

// S3-compatible: works against MinIO (path-style) or Railway/Tigris buckets
// (virtual-host style) alike — ТЗ раздел 10/11.
export const s3 = new S3Client({
  endpoint: requireEnv("STORAGE_ENDPOINT"),
  region: process.env.STORAGE_REGION ?? "auto",
  forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? "true") === "true",
  credentials: {
    accessKeyId: requireEnv("STORAGE_ACCESS_KEY"),
    secretAccessKey: requireEnv("STORAGE_SECRET_KEY"),
  },
});

export function getPresignedPutUrl(key: string, contentType: string, expiresInSeconds = 900) {
  const command = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

// getSignedUrl mints a fresh signature (and query string) on every call, even
// for the same object a second later — since the URL is the browser's cache
// key, that alone defeats HTTP caching for repeat requests (scrolling back to
// an already-watched video, reopening the Mini App). Reusing the same signed
// URL for a while, well inside its real expiry, lets those repeats actually
// hit cache instead of re-downloading the video.
const presignedGetCache = new Map<string, { url: string; goodUntil: number }>();

// Video/thumbnail buckets are private by default (no public-read ACL on Railway's
// bucket), so serving playable URLs means signing a GET at read time rather than
// storing a permanent public link — see toVideoUrls() in services/api/src/serializers.ts.
export async function getPresignedGetUrl(key: string, expiresInSeconds = 6 * 60 * 60): Promise<string> {
  const now = Date.now();
  const cached = presignedGetCache.get(key);
  if (cached && cached.goodUntil > now) return cached.url;

  const command = new GetObjectCommand({ Bucket: bucket(), Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  // Stop reusing well before the signature actually expires, so a slow
  // client never races a presigned URL going bad mid-download.
  const safeSeconds = Math.max(60, expiresInSeconds - 30 * 60);
  presignedGetCache.set(key, { url, goodUntil: now + safeSeconds * 1000 });

  if (presignedGetCache.size > 5000) {
    for (const [k, v] of presignedGetCache) {
      if (v.goodUntil <= now) presignedGetCache.delete(k);
    }
  }
  return url;
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function getObjectBytes(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function putObjectFile(key: string, filePath: string, contentType: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: createReadStream(filePath),
      ContentType: contentType,
      // Only called for the final transcoded video/thumbnail (see video-worker) —
      // each publish writes a brand-new UUID-keyed object and never overwrites it
      // afterward, so it's safe (and, for playback speed, important) to let
      // browsers cache it indefinitely instead of re-fetching every time.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}
