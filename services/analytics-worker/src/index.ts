import { Worker } from "bullmq";
import { prisma } from "@swyp/database";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

interface AnalyticsJob {
  videoId: string;
  kind: "impression" | "watch" | "recompute" | "like";
  watchSeconds?: number;
  completed?: boolean;
  userId?: string;
}

// Personalization input for /api/feed (ТЗ раздел 5's "same order for everyone"
// gap): watch-based bumps are small and capped since a watch event fires on
// every video scrolled past, while a like is one deliberate tap — its bump is
// proportionally much larger. Bumps only accumulate (no decay on unlike/skip)
// to keep this a simple, cheap-to-explain "interest", not a full negative
// feedback model.
const WATCH_AFFINITY_WEIGHT = 0.3;
const LIKE_AFFINITY_BUMP = 1.5;

async function bumpCategoryAffinity(userId: string, category: string | null, delta: number) {
  if (!category || delta <= 0) return;
  await prisma.userCategoryScore.upsert({
    where: { userId_category: { userId, category } },
    create: { userId, category, score: delta },
    update: { score: { increment: delta } },
  });
}

// Recommendation score per ТЗ раздел 5 — built from per-impression rates rather than
// raw counts, so a video with more views doesn't automatically outrank one performing
// just as well with less reach; раздел 31's freshness-decay/exploration blend, and
// section 5's negative "быстрый свайп" term (no dedicated event for that yet), are
// future refinements on top of this.
async function recomputeScore(videoId: string) {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) return;

  const views = Math.max(video.viewsCount, 1);
  const watchRatio = video.duration
    ? Math.min(video.watchTimeSum / views / video.duration, 1)
    : 0;
  const completionRate = Math.min(video.completedViewsCount / views, 1);
  const likeRate = Math.min(video.likesCount / views, 1);
  const shareRate = Math.min(video.sharesCount / views, 1);
  const commentRate = Math.min(video.commentsCount / views, 1);
  const saveRate = Math.min(video.savesCount / views, 1);
  const reportRate = Math.min(video.reportsCount / views, 1);

  const score =
    watchRatio * 0.3 +
    completionRate * 0.25 +
    likeRate * 0.15 +
    shareRate * 0.15 +
    commentRate * 0.05 +
    saveRate * 0.1 -
    reportRate * 0.3;

  await prisma.video.update({ where: { id: videoId }, data: { score } });
}

const worker = new Worker(
  "analytics-events",
  async (job) => {
    const data = job.data as AnalyticsJob;

    if (data.kind === "impression") {
      await prisma.video.update({ where: { id: data.videoId }, data: { viewsCount: { increment: 1 } } });
    } else if (data.kind === "watch") {
      const video = await prisma.video.update({
        where: { id: data.videoId },
        data: {
          watchTimeSum: { increment: Math.max(0, Math.round(data.watchSeconds ?? 0)) },
          ...(data.completed ? { completedViewsCount: { increment: 1 } } : {}),
        },
      });
      if (data.userId) {
        const watchRatio = video.duration
          ? Math.min((data.watchSeconds ?? 0) / video.duration, 1)
          : 0;
        await bumpCategoryAffinity(data.userId, video.category, watchRatio * WATCH_AFFINITY_WEIGHT);
      }
    } else if (data.kind === "like" && data.userId) {
      const video = await prisma.video.findUnique({ where: { id: data.videoId }, select: { category: true } });
      await bumpCategoryAffinity(data.userId, video?.category ?? null, LIKE_AFFINITY_BUMP);
    }

    await recomputeScore(data.videoId);
  },
  { connection },
);

worker.on("ready", () => console.log("[analytics-worker] ready"));
worker.on("completed", (job) => console.log(`[analytics-worker] completed ${job.id}`));
worker.on("failed", (job, err) => console.error(`[analytics-worker] job ${job?.id} failed`, err));
