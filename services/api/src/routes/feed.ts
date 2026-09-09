import type { FastifyInstance } from "fastify";
import { prisma } from "@swyp/database";
import { authenticate } from "../plugins/authenticate.js";
import { toFeedItem } from "../serializers.js";
import { parseLimit } from "../pagination.js";

// GET /api/feed — chronological for now; the score-based ordering from
// ТЗ раздел 5/31 lands once view/watch-time events are collected.
export async function feedRoutes(app: FastifyInstance) {
  app.get("/api/feed", { preHandler: authenticate }, async (request) => {
    const { cursor, category } = request.query as { cursor?: string; category?: string };
    const limit = parseLimit((request.query as { limit?: string }).limit, 10, 30);
    const userId = request.user.sub;

    const videos = await prisma.video.findMany({
      where: { status: "published", ...(category ? { category } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: true,
        likes: { where: { userId }, select: { id: true }, take: 1 },
      },
    });

    const hasMore = videos.length > limit;
    const items = videos.slice(0, limit);

    return {
      items: items.map(toFeedItem),
      next_cursor: hasMore ? items[items.length - 1].id : null,
    };
  });
}
