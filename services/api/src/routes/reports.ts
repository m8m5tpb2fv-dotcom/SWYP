import type { FastifyInstance } from "fastify";
import { Prisma, prisma } from "@swyp/database";
import { authenticate } from "../plugins/authenticate.js";
import { analyticsQueue } from "../queues.js";

const VALID_REASONS = new Set(["adult", "violence", "fraud", "spam", "copyright", "abuse", "other"]);

export async function reportRoutes(app: FastifyInstance) {
  app.post("/api/reports", { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.sub;
    const { videoId, reason } = (request.body ?? {}) as { videoId?: string; reason?: string };

    if (!videoId || !reason || !VALID_REASONS.has(reason)) {
      return reply.code(400).send({ error: "videoId and a valid reason are required" });
    }

    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
    if (!video) {
      return reply.code(404).send({ error: "Video not found" });
    }

    try {
      await prisma.$transaction([
        prisma.report.create({
          data: { reporterId: userId, videoId, reason: reason as Prisma.ReportCreateInput["reason"] },
        }),
        prisma.video.update({ where: { id: videoId }, data: { reportsCount: { increment: 1 } } }),
      ]);
      await analyticsQueue.add("event", { videoId, kind: "recompute" });
    } catch (err) {
      const isDuplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isDuplicate) throw err;
      // already reported by this user — idempotent no-op, reportsCount stays as-is
    }

    return reply.code(201).send({ reported: true });
  });
}
