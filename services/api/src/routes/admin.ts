import type { FastifyInstance } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@swyp/database";
import { requireEnv } from "@swyp/config";
import { authenticateAdmin } from "../plugins/authenticate-admin.js";
import { toAdminVideoItem, toPublicUser } from "../serializers.js";
import { parseLimit } from "../pagination.js";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function adminRoutes(app: FastifyInstance) {
  // Admin panel (Раздел 26-28) is a separate app with its own login — not tied
  // to a Telegram user's isAdmin flag, which is reserved for future in-app admin UI.
  app.post("/api/admin/login", async (request, reply) => {
    const { username, password } = (request.body ?? {}) as { username?: string; password?: string };
    if (!username || !password) {
      return reply.code(400).send({ error: "username and password are required" });
    }

    const validUser = safeEqual(username, requireEnv("ADMIN_USERNAME"));
    const validPass = safeEqual(password, requireEnv("ADMIN_PASSWORD"));
    if (!validUser || !validPass) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const accessToken = app.jwt.sign({ sub: "admin", role: "admin" }, { expiresIn: "7d" });
    return { access_token: accessToken };
  });

  app.get("/api/admin/stats", { preHandler: authenticateAdmin }, async () => {
    const [usersCount, videosCount, publishedVideosCount, openReportsCount, aggregates] = await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
      prisma.video.count({ where: { status: "published" } }),
      prisma.report.count({ where: { status: "open" } }),
      prisma.video.aggregate({ _sum: { viewsCount: true, likesCount: true } }),
    ]);

    return {
      usersCount,
      videosCount,
      publishedVideosCount,
      openReportsCount,
      viewsSum: aggregates._sum.viewsCount ?? 0,
      likesSum: aggregates._sum.likesCount ?? 0,
    };
  });

  app.get("/api/admin/videos", { preHandler: authenticateAdmin }, async (request) => {
    const { status, cursor } = request.query as { status?: string; cursor?: string };
    const limit = parseLimit((request.query as { limit?: string }).limit, 20, 50);

    const videos = await prisma.video.findMany({
      where: status ? { status: status as never } : {},
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { user: true },
    });

    const hasMore = videos.length > limit;
    const items = videos.slice(0, limit);

    return {
      items: await Promise.all(items.map(toAdminVideoItem)),
      next_cursor: hasMore ? items[items.length - 1].id : null,
    };
  });

  app.post("/api/admin/videos/:id/block", { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return reply.code(404).send({ error: "Video not found" });
    await prisma.video.update({ where: { id }, data: { status: "blocked" } });
    return { id, status: "blocked" };
  });

  app.post("/api/admin/videos/:id/restore", { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return reply.code(404).send({ error: "Video not found" });
    // "blocked" (a video that WAS published, with real transcoded media) and
    // "pending" (a paid isAdult video awaiting its first moderation decision,
    // see video-worker's processVideo) both already have real transcoded
    // media — this doubles as the "approve" action for the latter. "rejected"
    // means the transcode itself never succeeded — videoUrl/thumbnailUrl are
    // still null (only video-worker's success path ever sets them) — so
    // restoring one straight to "published" put a permanently broken,
    // unplayable card in every feed instead of the working video an admin
    // would expect.
    if (video.status !== "blocked" && video.status !== "pending") {
      return reply
        .code(400)
        .send({ error: `Cannot restore a video with status ${video.status} — it was never successfully processed` });
    }
    await prisma.video.update({ where: { id }, data: { status: "published" } });
    return { id, status: "published" };
  });

  app.delete("/api/admin/videos/:id", { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return reply.code(404).send({ error: "Video not found" });
    await prisma.video.update({ where: { id }, data: { status: "deleted" } });
    return reply.code(204).send();
  });

  app.get("/api/admin/reports", { preHandler: authenticateAdmin }, async (request) => {
    const { status, cursor } = request.query as { status?: string; cursor?: string };
    const limit = parseLimit((request.query as { limit?: string }).limit, 20, 50);

    const reports = await prisma.report.findMany({
      where: { status: (status as never) ?? "open" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        reporter: true,
        video: { include: { user: true } },
      },
    });

    const hasMore = reports.length > limit;
    const items = reports.slice(0, limit);

    return {
      items: items.map((r) => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
        reporter: toPublicUser(r.reporter),
        video: {
          id: r.video.id,
          title: r.video.title,
          status: r.video.status,
          thumbnailUrl: r.video.thumbnailUrl,
          author: toPublicUser(r.video.user),
        },
      })),
      next_cursor: hasMore ? items[items.length - 1].id : null,
    };
  });

  app.post("/api/admin/reports/:id/resolve", { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action } = (request.body ?? {}) as { action?: "dismiss" | "block" };
    if (action !== "dismiss" && action !== "block") {
      return reply.code(400).send({ error: "action must be 'dismiss' or 'block'" });
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return reply.code(404).send({ error: "Report not found" });

    await prisma.report.update({
      where: { id },
      data: { status: action === "block" ? "resolved" : "dismissed" },
    });

    if (action === "block") {
      await prisma.video.update({ where: { id: report.videoId }, data: { status: "blocked" } });
    }

    return { id, status: action === "block" ? "resolved" : "dismissed" };
  });

  app.get("/api/admin/users", { preHandler: authenticateAdmin }, async (request) => {
    const { cursor } = request.query as { cursor?: string };
    const limit = parseLimit((request.query as { limit?: string }).limit, 20, 50);

    const users = await prisma.user.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { _count: { select: { videos: true } } },
    });

    const hasMore = users.length > limit;
    const items = users.slice(0, limit);

    return {
      items: items.map((u) => ({ ...toPublicUser(u), isBanned: u.isBanned, videosCount: u._count.videos })),
      next_cursor: hasMore ? items[items.length - 1].id : null,
    };
  });

  app.post("/api/admin/users/:id/ban", { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.code(404).send({ error: "User not found" });
    await prisma.user.update({ where: { id }, data: { isBanned: true } });
    return { id, isBanned: true };
  });

  app.post("/api/admin/users/:id/unban", { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.code(404).send({ error: "User not found" });
    await prisma.user.update({ where: { id }, data: { isBanned: false } });
    return { id, isBanned: false };
  });
}
