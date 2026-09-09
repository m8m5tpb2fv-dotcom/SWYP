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

// S3-compatible: works against MinIO/R2/S3 alike (ТЗ раздел 10/11).
export const s3 = new S3Client({
  endpoint: requireEnv("STORAGE_ENDPOINT"),
  region: process.env.STORAGE_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: requireEnv("STORAGE_ACCESS_KEY"),
    secretAccessKey: requireEnv("STORAGE_SECRET_KEY"),
  },
});

export function getPresignedPutUrl(key: string, contentType: string, expiresInSeconds = 900) {
  const command = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
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
    }),
  );
}

// The dev bucket is served directly by MinIO with anonymous read; production points
// CDN_BASE_URL at the real CDN in front of the bucket.
export function publicUrl(key: string): string {
  const base = process.env.CDN_BASE_URL ?? `${requireEnv("STORAGE_ENDPOINT")}/${bucket()}`;
  return `${base.replace(/\/$/, "")}/${key}`;
}
