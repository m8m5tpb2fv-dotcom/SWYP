import { Worker } from "bullmq";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prisma } from "@swyp/database";
import { getObjectBytes, putObjectFile, publicUrl } from "@swyp/storage";

const execFileAsync = promisify(execFile);

// Pipeline per ТЗ section 10/11: fetch original -> ffmpeg transcode -> thumbnail -> CDN.
// MVP does a single web-friendly rendition (capped at 720p) rather than the full
// 360p/480p/720p/1080p ladder from the ТЗ.
async function processVideo(videoId: string, objectKey: string) {
  const dir = await mkdtemp(path.join(tmpdir(), "swyp-video-"));
  const inputPath = path.join(dir, "input.mp4");
  const outputPath = path.join(dir, "output.mp4");
  const thumbPath = path.join(dir, "thumb.jpg");

  try {
    const bytes = await getObjectBytes(objectKey);
    await writeFile(inputPath, bytes);

    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-vf",
      "scale='min(1280,iw)':-2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    await execFileAsync("ffmpeg", ["-y", "-i", inputPath, "-ss", "00:00:00.5", "-frames:v", "1", thumbPath]);

    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,duration",
      "-of",
      "json",
      outputPath,
    ]);
    const probe = JSON.parse(stdout) as { streams?: { width?: number; height?: number; duration?: string }[] };
    const stream = probe.streams?.[0] ?? {};

    const dirKey = objectKey.replace(/\/[^/]+$/, "");
    const videoKey = `${dirKey}/video.mp4`;
    const thumbKey = `${dirKey}/thumb.jpg`;

    await putObjectFile(videoKey, outputPath, "video/mp4");
    await putObjectFile(thumbKey, thumbPath, "image/jpeg");

    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "published",
        videoUrl: publicUrl(videoKey),
        thumbnailUrl: publicUrl(thumbKey),
        width: stream.width ?? null,
        height: stream.height ?? null,
        duration: stream.duration ? Math.round(Number(stream.duration)) : null,
        publishedAt: new Date(),
      },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

const worker = new Worker(
  "video-processing",
  async (job) => {
    const { videoId, objectKey } = job.data as { videoId: string; objectKey: string };
    try {
      await processVideo(videoId, objectKey);
    } catch (err) {
      await prisma.video.update({ where: { id: videoId }, data: { status: "rejected" } });
      throw err;
    }
  },
  { connection },
);

worker.on("ready", () => console.log("[video-worker] ready"));
worker.on("completed", (job) => console.log(`[video-worker] completed ${job.id}`));
worker.on("failed", (job, err) => console.error(`[video-worker] job ${job?.id} failed`, err));
