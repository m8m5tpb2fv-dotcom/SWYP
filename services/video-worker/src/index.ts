import { Worker } from "bullmq";

// Pipeline per ТЗ section 10/11: upload -> ffmpeg transcode (360p/480p/720p/1080p)
// -> thumbnail -> CDN. Job handling is added once the upload API and storage exist.

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

const worker = new Worker(
  "video-processing",
  async (job) => {
    console.log(`[video-worker] received job ${job.id}`, job.data);
  },
  { connection },
);

worker.on("ready", () => console.log("[video-worker] ready"));
worker.on("failed", (job, err) => console.error(`[video-worker] job ${job?.id} failed`, err));
