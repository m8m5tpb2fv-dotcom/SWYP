import { Queue } from "bullmq";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

export const videoProcessingQueue = new Queue("video-processing", { connection });
export const analyticsQueue = new Queue("analytics-events", { connection });
