import { Worker } from "bullmq";

// Consumes frontend events (video_impression, video_complete, like, share, ...)
// per ТЗ section 21 and aggregates them for the recommendation score (section 5/31).

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

const worker = new Worker(
  "analytics-events",
  async (job) => {
    console.log(`[analytics-worker] received event ${job.id}`, job.data);
  },
  { connection },
);

worker.on("ready", () => console.log("[analytics-worker] ready"));
worker.on("failed", (job, err) => console.error(`[analytics-worker] job ${job?.id} failed`, err));
