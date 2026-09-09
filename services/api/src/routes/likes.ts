import type { FastifyInstance } from "fastify";
import { Prisma, prisma } from "@swyp/database";
import { authenticate } from "../plugins/authenticate.js";

export async function likeRoutes(app: FastifyInstance) {
  app.post("/api/videos/:id/like", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.status !== "published") {
      return reply.code(404).send({ error: "Video not found" });
    }

    try {
      await prisma.$transaction([
        prisma.like.create({ data: { userId, videoId: id } }),
        prisma.video.update({ where: { id }, data: { likesCount: { increment: 1 } } }),
      ]);
    } catch (err) {
      const isDuplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isDuplicate) {
        throw err;
      }
      // already liked — idempotent no-op
    }

    const updated = await prisma.video.findUniqueOrThrow({ where: { id }, select: { likesCount: true } });
    return { liked: true, likesCount: updated.likesCount };
  });

  app.delete("/api/videos/:id/like", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;

    const video = await prisma.video.findUnique({ where: { id }, select: { id: true } });
    if (!video) {
      return reply.code(404).send({ error: "Video not found" });
    }

    const existing = await prisma.like.findUnique({
      where: { userId_videoId: { userId, videoId: id } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existing.id } }),
        prisma.video.update({ where: { id }, data: { likesCount: { decrement: 1 } } }),
      ]);
    }

    const updated = await prisma.video.findUniqueOrThrow({ where: { id }, select: { likesCount: true } });
    return { liked: false, likesCount: updated.likesCount };
  });
}
