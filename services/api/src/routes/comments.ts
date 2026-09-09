import type { FastifyInstance } from "fastify";
import { prisma } from "@swyp/database";
import { authenticate } from "../plugins/authenticate.js";
import { toCommentItem } from "../serializers.js";
import { parseLimit } from "../pagination.js";

const MAX_TEXT_LENGTH = 2000;

export async function commentRoutes(app: FastifyInstance) {
  app.get("/api/videos/:id/comments", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { cursor } = request.query as { cursor?: string };
    const limit = parseLimit((request.query as { limit?: string }).limit, 20, 50);

    const video = await prisma.video.findUnique({ where: { id }, select: { id: true } });
    if (!video) {
      return reply.code(404).send({ error: "Video not found" });
    }

    const comments = await prisma.comment.findMany({
      where: { videoId: id, parentId: null, status: "published" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { user: true, _count: { select: { replies: true } } },
    });

    const hasMore = comments.length > limit;
    const items = comments.slice(0, limit);

    return {
      items: items.map(toCommentItem),
      next_cursor: hasMore ? items[items.length - 1].id : null,
    };
  });

  app.post("/api/videos/:id/comments", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    const { text, parentId } = (request.body ?? {}) as { text?: string; parentId?: string };

    if (typeof text !== "string" || text.trim().length === 0) {
      return reply.code(400).send({ error: "text is required" });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return reply.code(400).send({ error: `text must be at most ${MAX_TEXT_LENGTH} characters` });
    }

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.status !== "published") {
      return reply.code(404).send({ error: "Video not found" });
    }

    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.videoId !== id || parent.status !== "published") {
        return reply.code(400).send({ error: "Invalid parentId" });
      }
    }

    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: { userId, videoId: id, text: text.trim(), parentId: parentId ?? null },
        include: { user: true },
      }),
      prisma.video.update({ where: { id }, data: { commentsCount: { increment: 1 } } }),
    ]);

    return reply.code(201).send(toCommentItem({ ...comment, _count: { replies: 0 } }));
  });

  app.delete("/api/comments/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.status === "deleted") {
      return reply.code(404).send({ error: "Comment not found" });
    }
    if (comment.userId !== userId) {
      return reply.code(403).send({ error: "Not your comment" });
    }

    await prisma.$transaction([
      prisma.comment.update({ where: { id }, data: { status: "deleted" } }),
      prisma.video.update({ where: { id: comment.videoId }, data: { commentsCount: { decrement: 1 } } }),
    ]);

    return reply.code(204).send();
  });
}
