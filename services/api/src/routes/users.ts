import type { FastifyInstance } from "fastify";
import { prisma } from "@swyp/database";
import { authenticate } from "../plugins/authenticate.js";
import { toFeedItem } from "../serializers.js";
import { parseLimit } from "../pagination.js";

export async function userRoutes(app: FastifyInstance) {
  // Экран №2/№4 — Profile: stats are computed live rather than denormalized onto
  // User, since a profile is loaded far less often than a video is scrolled past.
  app.get("/api/users/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const requesterId = request.user.sub;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    const [followersCount, followingCount, videosCount, likesAgg, followRow] = await Promise.all([
      prisma.follow.count({ where: { followingId: id } }),
      prisma.follow.count({ where: { followerId: id } }),
      prisma.video.count({ where: { userId: id, status: "published" } }),
      prisma.video.aggregate({ where: { userId: id, status: "published" }, _sum: { likesCount: true } }),
      id === requesterId
        ? null
        : prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: requesterId, followingId: id } },
          }),
    ]);

    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      followersCount,
      followingCount,
      videosCount,
      likesCount: likesAgg._sum.likesCount ?? 0,
      isFollowing: followRow !== null,
      isMe: id === requesterId,
    };
  });

  app.get("/api/users/:id/videos", { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const { cursor } = request.query as { cursor?: string };
    const limit = parseLimit((request.query as { limit?: string }).limit, 12, 30);
    const requesterId = request.user.sub;

    const videos = await prisma.video.findMany({
      where: { userId: id, status: "published" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: true,
        likes: { where: { userId: requesterId }, select: { id: true }, take: 1 },
      },
    });

    const hasMore = videos.length > limit;
    const items = videos.slice(0, limit);

    return {
      items: await Promise.all(items.map(toFeedItem)),
      next_cursor: hasMore ? items[items.length - 1].id : null,
    };
  });

  app.post("/api/users/:id/follow", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const followerId = request.user.sub;

    if (id === followerId) {
      return reply.code(400).send({ error: "Cannot follow yourself" });
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) {
      return reply.code(404).send({ error: "User not found" });
    }

    await prisma.follow
      .create({ data: { followerId, followingId: id } })
      .catch(() => {
        // already following — idempotent no-op
      });

    const followersCount = await prisma.follow.count({ where: { followingId: id } });
    return { following: true, followersCount };
  });

  app.delete("/api/users/:id/follow", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const followerId = request.user.sub;

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) {
      return reply.code(404).send({ error: "User not found" });
    }

    await prisma.follow.deleteMany({ where: { followerId, followingId: id } });

    const followersCount = await prisma.follow.count({ where: { followingId: id } });
    return { following: false, followersCount };
  });
}
