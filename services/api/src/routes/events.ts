import type { FastifyInstance } from "fastify";
import { prisma } from "@swyp/database";
import { authenticate } from "../plugins/authenticate.js";
import { analyticsQueue } from "../queues.js";

const VALID_TYPES = new Set(["video_impression", "video_watch"]);

// Feeds the recommendation score (ТЗ раздел 5/21/25): the client fires these as a
// video becomes active / is scrolled away from — see Feed.tsx for the timing logic.
export async function eventRoutes(app: FastifyInstance) {
  app.post("/api/events", { preHandler: authenticate }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      type?: string;
      videoId?: string;
      watchSeconds?: number;
      completed?: boolean;
    };

    if (!body.type || !VALID_TYPES.has(body.type) || !body.videoId) {
      return reply.code(400).send({ error: "type and videoId are required" });
    }

    const video = await prisma.video.findUnique({ where: { id: body.videoId }, select: { id: true } });
    if (!video) {
      return reply.code(404).send({ error: "Video not found" });
    }

    if (body.type === "video_impression") {
      await analyticsQueue.add("event", { videoId: body.videoId, kind: "impression" });
    } else {
      await analyticsQueue.add("event", {
        videoId: body.videoId,
        kind: "watch",
        watchSeconds: Math.max(0, Math.round(body.watchSeconds ?? 0)),
        completed: Boolean(body.completed),
        userId: request.user.sub,
      });
    }

    return reply.code(202).send({ accepted: true });
  });
}
