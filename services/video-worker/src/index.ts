import { Worker } from "bullmq";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prisma } from "@swyp/database";
import { getObjectBytes, putObjectFile } from "@swyp/storage";

const execFileAsync = promisify(execFile);

// ffmpeg/ffprobe had no timeout at all — certain malformed/adversarial input
// (known bad MOV/MP4 atoms, some codecs) can make ffmpeg hang indefinitely
// instead of exiting with an error. Since BullMQ's lock-renewal heartbeat
// runs in this same process independent of the child process, a hung ffmpeg
// never gets flagged as a stalled job — it just wedges this worker's single
// job slot forever. A timeout turns that into an ordinary rejected job.
const TRANSCODE_TIMEOUT_MS = 3 * 60 * 1000;
const PROBE_TIMEOUT_MS = 30 * 1000;

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
      // Caps the LONG edge at 1280 regardless of orientation. The old
      // "min(1280,iw)" capped iw (width) unconditionally, which is a no-op
      // for portrait video — nearly all uploads here — since phone-shot
      // vertical clips already have width <= 1280 (e.g. 1080) while height
      // runs well past it (1920+, sometimes 2160+). Measured against a real
      // uploaded video this produced a 1280x2276 output (bitrate ~19.6Mbps,
      // 11.2MB for under 5s) instead of the intended ~720p-class rendition.
      "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      // VBV cap: bounds worst-case bitrate on complex/high-motion footage so
      // a single hard clip can't balloon file size the way CRF alone can —
      // same re-encode of the 11.2MB sample above came out at 1.8MB with
      // this in place, with no visible quality difference.
      "-maxrate",
      "2500k",
      "-bufsize",
      "5000k",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath,
    ], { timeout: TRANSCODE_TIMEOUT_MS });

    // Thumbnail extraction is best-effort and isolated from the main
    // transcode's success/failure: a video ffmpeg can fully transcode but
    // can't seek a frame out of at exactly 00:00:00.5 (very short or
    // single-frame clips) previously rejected the ENTIRE video here, even
    // though a perfectly valid output.mp4 already existed — the video would
    // just publish with no thumbnail instead.
    let hasThumbnail = true;
    try {
      await execFileAsync("ffmpeg", ["-y", "-i", inputPath, "-ss", "00:00:00.5", "-frames:v", "1", thumbPath], {
        timeout: PROBE_TIMEOUT_MS,
      });
    } catch (err) {
      hasThumbnail = false;
      console.error(`[video-worker] thumbnail generation failed for ${videoId}, publishing without one`, err);
    }

    const { stdout } = await execFileAsync(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,duration", "-of", "json", outputPath],
      { timeout: PROBE_TIMEOUT_MS },
    );
    const probe = JSON.parse(stdout) as { streams?: { width?: number; height?: number; duration?: string }[] };
    const stream = probe.streams?.[0] ?? {};

    const dirKey = objectKey.replace(/\/[^/]+$/, "");
    const videoKey = `${dirKey}/video.mp4`;
    const thumbKey = `${dirKey}/thumb.jpg`;

    await putObjectFile(videoKey, outputPath, "video/mp4");
    if (hasThumbnail) {
      await putObjectFile(thumbKey, thumbPath, "image/jpeg");
    }

    // videoUrl/thumbnailUrl hold object keys, not public links — the bucket is
    // private, so the API signs a time-limited GET URL per request (see
    // toVideoUrls in services/api/src/serializers.ts) rather than storing one.
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "published",
        videoUrl: videoKey,
        thumbnailUrl: hasThumbnail ? thumbKey : null,
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
