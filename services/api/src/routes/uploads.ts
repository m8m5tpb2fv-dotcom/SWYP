import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { prisma } from "@swyp/database";
import { getPresignedPutUrl, getPresignedGetUrl, objectExists } from "@swyp/storage";
import { authenticate } from "../plugins/authenticate.js";
import { videoProcessingQueue } from "../queues.js";

const ALLOWED_CONTENT_TYPES = new Set(["video/mp4", "video/quicktime"]);

export async function uploadRoutes(app: FastifyInstance) {
  // ШАГ 11 upload architecture: client gets a presigned PUT URL and pushes bytes
  // straight to storage — the API never touches the file itself.
  app.post("/api/videos/upload-url", { preHandler: authenticate }, async (request, reply) => {
    const { contentType } = (request.body ?? {}) as { contentType?: string };
    if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
      return reply.code(400).send({ error: "contentType must be video/mp4 or video/quicktime" });
    }

    const userId = request.user.sub;
    const objectKey = `videos/${userId}/${randomUUID()}/original.mp4`;

    const video = await prisma.video.create({
      data: { userId, status: "draft", objectKey },
    });

    const uploadUrl = await getPresignedPutUrl(objectKey, contentType);

    return { videoId: video.id, uploadUrl };
  });

  app.post("/api/videos/:id/publish", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    const { title, description, category, hashtags } = (request.body ?? {}) as {
      title?: string;
      description?: string;
      category?: string;
      hashtags?: string[];
    };

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.userId !== userId) {
      return reply.code(404).send({ error: "Video not found" });
    }
    if (video.status !== "draft") {
      return reply.code(400).send({ error: `Video is already ${video.status}` });
    }
    if (!video.objectKey) {
      return reply.code(400).send({ error: "Video has no uploaded file" });
    }

    const uploaded = await objectExists(video.objectKey);
    if (!uploaded) {
      return reply.code(400).send({ error: "Video file was not uploaded yet" });
    }

    await prisma.video.update({
      where: { id },
      data: {
        title: title?.trim() || null,
        description: description?.trim() || null,
        category: category ?? null,
        hashtags: Array.isArray(hashtags) ? hashtags.filter((h) => h.trim().length > 0) : [],
        status: "processing",
      },
    });

    await videoProcessingQueue.add("process", { videoId: id, objectKey: video.objectKey });

    return { id, status: "processing" };
  });

  // Editing a video's title/description/hashtags/category after it's already
  // published — a separate action from /publish (which also kicks off
  // transcoding). Restricted to published videos: draft/processing has no
  // meaningful "edit" yet, and blocked/rejected/deleted shouldn't be touched
  // via this route.
  app.patch("/api/videos/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    const { title, description, category, hashtags } = (request.body ?? {}) as {
      title?: string;
      description?: string;
      category?: string;
      hashtags?: string[];
    };

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.userId !== userId) {
      return reply.code(404).send({ error: "Video not found" });
    }
    if (video.status !== "published") {
      return reply.code(400).send({ error: `Cannot edit a video with status ${video.status}` });
    }

    const updated = await prisma.video.update({
      where: { id },
      data: {
        title: title?.trim() || null,
        description: description?.trim() || null,
        category: category ?? video.category,
        hashtags: Array.isArray(hashtags) ? hashtags.filter((h) => h.trim().length > 0) : video.hashtags,
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      hashtags: updated.hashtags,
    };
  });

  app.get("/api/videos/:id/status", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const video = await prisma.video.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, videoUrl: true, thumbnailUrl: true },
    });
    if (!video || video.userId !== request.user.sub) {
      return reply.code(404).send({ error: "Video not found" });
    }
    // video.videoUrl/thumbnailUrl store object keys, not URLs (the bucket is
    // private) — sign fresh GET URLs the same way toFeedItem does.
    const [videoUrl, thumbnailUrl] = await Promise.all([
      video.videoUrl ? getPresignedGetUrl(video.videoUrl) : Promise.resolve(null),
      video.thumbnailUrl ? getPresignedGetUrl(video.thumbnailUrl) : Promise.resolve(null),
    ]);
    return { id: video.id, status: video.status, videoUrl, thumbnailUrl };
  });
}
