// Sets the CORS policy the video bucket needs for browser-based presigned
// uploads (apps/miniapp uploads directly to storage from the client). Railway's
// IaC bucket() node has no CORS field, so this can't live in .railway/railway.ts —
// run manually (`node packages/storage/scripts/configure-bucket-cors.mjs`) once
// per bucket, e.g. after recreating it. Without this, browser PUTs to the
// presigned URL fail preflight with a generic "Load failed" / "Failed to fetch".
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const client = new S3Client({
  endpoint: requireEnv("STORAGE_ENDPOINT"),
  region: process.env.STORAGE_REGION ?? "auto",
  forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? "true") === "true",
  credentials: {
    accessKeyId: requireEnv("STORAGE_ACCESS_KEY"),
    secretAccessKey: requireEnv("STORAGE_SECRET_KEY"),
  },
});

await client.send(
  new PutBucketCorsCommand({
    Bucket: requireEnv("STORAGE_BUCKET"),
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

console.log(`CORS policy set on bucket ${process.env.STORAGE_BUCKET}`);
