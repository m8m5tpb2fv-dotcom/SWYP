import { Queue } from "bullmq";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

// Previously no defaultJobOptions at all: BullMQ's own default is 1 attempt
// (no retry) and unbounded retention of completed/failed job hashes in
// Redis. attempts+backoff gives a transient failure (an S3 network blip, a
// momentary DB connection-pool exhaustion) a chance to self-heal instead of
// permanently marking a video "rejected" or dropping an analytics event on
// its one and only try; removeOnComplete/removeOnFail caps Redis growth for
// analytics-events in particular, which is enqueued on nearly every scroll.
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

export const videoProcessingQueue = new Queue("video-processing", { connection, defaultJobOptions });
export const analyticsQueue = new Queue("analytics-events", { connection, defaultJobOptions });
