import type { FastifyInstance } from "fastify";
import { prisma } from "@swyp/database";
import { authenticate } from "../plugins/authenticate.js";
import { analyticsQueue } from "../queues.js";

export async function shareRoutes(app: FastifyInstance) {
  app.post("/api/videos/:id/share", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const video = await prisma.video.findUnique({ where: { id }, select: { id: true } });
    if (!video) {
      return reply.code(404).send({ error: "Video not found" });
    }

    const updated = await prisma.video.update({
      where: { id },
      data: { sharesCount: { increment: 1 } },
      select: { sharesCount: true },
    });

    await analyticsQueue.add("event", { videoId: id, kind: "recompute" });

    return { sharesCount: updated.sharesCount };
  });
}
