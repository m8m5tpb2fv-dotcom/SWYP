import type { FastifyInstance } from "fastify";
import { prisma } from "@swyp/database";
import { authenticate } from "../plugins/authenticate.js";
import { toFeedItem, getActiveSubscribedCreatorIds } from "../serializers.js";
import { parseLimit } from "../pagination.js";

// Candidate-pool + re-rank personalization: pull the top POOL_LIMIT globally-
// scored published videos (so low-quality content never surfaces regardless
// of personal affinity), then boost each candidate for the requesting user by
// (a) following the author and (b) their UserCategoryScore for that video's
// category (built by the analytics worker from watch ratio + likes — see
// services/analytics-worker). This keeps ranking logic simple JS rather than
// a raw-SQL weighted join, at the cost of a pool size ceiling: a user who
// scrolls past POOL_LIMIT videos in one session sees hasMore=false even if
// more published videos exist further down the global ranking. Fine at
// current scale; a real ranking service is the fix once that stops being true.
const POOL_LIMIT = 300;
const FOLLOW_BOOST = 0.5;
const CATEGORY_BOOST_WEIGHT = 0.4;
// A user who has liked/watched their way to this much affinity in one
// category gets the full category boost — the raw score is unbounded
// (bumps only accumulate), so cap the *effect* rather than the stored value.
const CATEGORY_AFFINITY_NORMALIZER = 5;

export async function feedRoutes(app: FastifyInstance) {
  // Backs share deep links (t.me/<bot>/<app>?startapp=video_<id>) — the miniapp
  // reads WebApp.initDataUnsafe.start_param on launch and fetches this to open
  // the shared video directly instead of just landing on the normal feed.
  app.get("/api/videos/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;

    const [video, subscribedCreatorIds] = await Promise.all([
      prisma.video.findUnique({
        where: { id },
        include: {
          user: true,
          likes: { where: { userId }, select: { id: true }, take: 1 },
          unlocks: { where: { userId }, select: { id: true }, take: 1 },
        },
      }),
      getActiveSubscribedCreatorIds(userId),
    ]);

    if (!video || video.status !== "published") {
      return reply.code(404).send({ error: "Video not found" });
    }

    return toFeedItem(video, userId, subscribedCreatorIds);
  });

  app.get("/api/feed", { preHandler: authenticate }, async (request) => {
    const { cursor, category } = request.query as { cursor?: string; category?: string };
    const limit = parseLimit((request.query as { limit?: string }).limit, 10, 30);
    const userId = request.user.sub;

    const offset = cursor ? Math.max(0, parseInt(cursor, 10) || 0) : 0;

    const [candidates, affinityRows, followedRows, subscribedCreatorIds] = await Promise.all([
      prisma.video.findMany({
        where: { status: "published", ...(category ? { category } : {}) },
        orderBy: [{ score: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        take: POOL_LIMIT,
        include: {
          user: true,
          likes: { where: { userId }, select: { id: true }, take: 1 },
          unlocks: { where: { userId }, select: { id: true }, take: 1 },
        },
      }),
      prisma.userCategoryScore.findMany({ where: { userId }, select: { category: true, score: true } }),
      prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
      getActiveSubscribedCreatorIds(userId),
    ]);

    const affinityByCategory = new Map(affinityRows.map((r) => [r.category, r.score]));
    const followedAuthorIds = new Set(followedRows.map((r) => r.followingId));

    const ranked = candidates
      .map((video) => {
        const followBoost = followedAuthorIds.has(video.userId) ? FOLLOW_BOOST : 0;
        const affinity = video.category ? (affinityByCategory.get(video.category) ?? 0) : 0;
        const categoryBoost = Math.min(affinity / CATEGORY_AFFINITY_NORMALIZER, 1) * CATEGORY_BOOST_WEIGHT;
        return { video, personalizedScore: video.score + followBoost + categoryBoost };
      })
      .sort((a, b) => {
        if (b.personalizedScore !== a.personalizedScore) return b.personalizedScore - a.personalizedScore;
        return b.video.createdAt.getTime() - a.video.createdAt.getTime();
      })
      .map((r) => r.video);

    const page = ranked.slice(offset, offset + limit);
    const hasMore = offset + limit < ranked.length;

    return {
      items: await Promise.all(page.map((v) => toFeedItem(v, userId, subscribedCreatorIds))),
      next_cursor: hasMore ? String(offset + limit) : null,
    };
  });
}
