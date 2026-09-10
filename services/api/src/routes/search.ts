import type { FastifyInstance } from "fastify";
import { prisma } from "@swyp/database";
import { authenticate } from "../plugins/authenticate.js";
import { toFeedItem, toAuthor } from "../serializers.js";

// MVP search per ТЗ раздел 12: ILIKE over title/description/username, plus a
// hashtag aggregate via unnest — full-text search / Elasticsearch is future scope.
export async function searchRoutes(app: FastifyInstance) {
  app.get("/api/search", { preHandler: authenticate }, async (request) => {
    const { q } = request.query as { q?: string };
    const query = (q ?? "").trim();
    if (!query) {
      return { videos: [], users: [], hashtags: [] };
    }

    const userId = request.user.sub;

    const [videos, users, hashtagRows] = await Promise.all([
      prisma.video.findMany({
        where: {
          status: "published",
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: [{ createdAt: "desc" }],
        take: 10,
        include: {
          user: true,
          likes: { where: { userId }, select: { id: true }, take: 1 },
        },
      }),
      prisma.user.findMany({
        where: {
          isBanned: false,
          OR: [
            { username: { contains: query, mode: "insensitive" } },
            { firstName: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
      }),
      prisma.$queryRaw<{ tag: string; count: bigint }[]>`
        SELECT tag, count(*)::bigint as count
        FROM videos, unnest(hashtags) as tag
        WHERE status = 'published' AND tag ILIKE ${`%${query}%`}
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    return {
      videos: await Promise.all(videos.map(toFeedItem)),
      users: users.map(toAuthor),
      hashtags: hashtagRows.map((r) => ({ tag: r.tag, count: Number(r.count) })),
    };
  });
}
