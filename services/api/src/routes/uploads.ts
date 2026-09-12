import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { prisma } from "@swyp/database";
import { getPresignedPutUrl, getPresignedGetUrl, objectExists, getObjectSize } from "@swyp/storage";
import { authenticate } from "../plugins/authenticate.js";
import { videoProcessingQueue } from "../queues.js";
import { createStarsInvoice } from "../telegram-api.js";

// Flat one-time fee to publish a video flagged as containing profanity/mature
// language — fixed here, never taken from the client, so /publish's payment
// check can't be satisfied by a request that just claims a lower amount.
export const ADULT_CONTENT_PRICE_STARS = 10;

const ALLOWED_CONTENT_TYPES = new Set(["video/mp4", "video/quicktime"]);
// The presigned PUT URL itself places no ceiling on upload size, and
// video-worker fully buffers the object into memory to transcode it — an
// unbounded upload is a straightforward OOM vector for that worker. 300MB is
// generous for a short vertical clip (even a full-length, high-bitrate one)
// while still bounding worst case.
const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

// Same caps the miniapp's <input maxLength> already enforces client-side —
// these exist so a direct API call (bypassing the client entirely) can't
// store an unbounded title/description or a huge hashtags array/tag.
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_HASHTAGS = 20;
const MAX_HASHTAG_LENGTH = 30;

function normalizeHashtags(hashtags: unknown): string[] {
  if (!Array.isArray(hashtags)) return [];
  return hashtags
    .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
    .slice(0, MAX_HASHTAGS)
    .map((h) => h.trim().slice(0, MAX_HASHTAG_LENGTH));
}

// Shared by /publish and the PATCH edit route. Returns an error string on
// invalid input, or the normalized { isPremium, priceStars } to write.
function parsePremiumFields(body: { isPremium?: boolean; priceStars?: number }) {
  const isPremium = Boolean(body.isPremium);
  if (!isPremium) return { ok: true as const, isPremium: false, priceStars: null };

  const priceStars = body.priceStars;
  if (typeof priceStars !== "number" || !Number.isInteger(priceStars) || priceStars < 1 || priceStars > 100000) {
    return { ok: false as const, error: "priceStars must be an integer between 1 and 100000 for a premium video" };
  }
  return { ok: true as const, isPremium: true, priceStars };
}

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

  // Mints the Stars invoice for the profanity/mature-language publish fee.
  // Doesn't touch the video's status or fields — /publish still does the
  // actual publishing once a payment for this video exists.
  app.post("/api/videos/:id/adult-invoice", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.userId !== userId) {
      return reply.code(404).send({ error: "Video not found" });
    }
    if (video.status !== "draft") {
      return reply.code(400).send({ error: `Video is already ${video.status}` });
    }
    if (!video.objectKey || !(await objectExists(video.objectKey))) {
      return reply.code(400).send({ error: "Video file was not uploaded yet" });
    }

    const existingPayment = await prisma.adultPublishPayment.findUnique({ where: { videoId: id } });
    if (existingPayment) {
      return reply.code(400).send({ error: "This video's publish fee is already paid" });
    }

    const invoiceUrl = await createStarsInvoice({
      title: "Публикация с пометкой 18+",
      description: "Разовая плата за публикацию ролика с ненормативной лексикой",
      payload: `adultPublish:${id}`,
      starCount: ADULT_CONTENT_PRICE_STARS,
    });

    return { invoiceUrl };
  });

  app.post("/api/videos/:id/publish", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    const { title, description, category, hashtags, isPremium, priceStars, isAdult } = (request.body ?? {}) as {
      title?: string;
      description?: string;
      category?: string;
      hashtags?: string[];
      isPremium?: boolean;
      priceStars?: number;
      isAdult?: boolean;
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

    const size = await getObjectSize(video.objectKey);
    if (size !== null && size > MAX_UPLOAD_BYTES) {
      return reply.code(400).send({ error: `Video file is too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB)` });
    }

    const premium = parsePremiumFields({ isPremium, priceStars });
    if (!premium.ok) {
      return reply.code(400).send({ error: premium.error });
    }

    // The client's isAdult flag is only ever honored if a matching payment
    // row already exists (created by the bot's successful_payment handler,
    // never by this route) — a request that just sets isAdult:true with no
    // paid invoice is rejected outright, same as one that never asked at all.
    let adultConfirmed = false;
    if (isAdult) {
      const payment = await prisma.adultPublishPayment.findUnique({ where: { videoId: id } });
      if (!payment || payment.userId !== userId) {
        return reply.code(402).send({ error: "Publishing this as 18+ requires the 10-star fee to be paid first" });
      }
      adultConfirmed = true;
    }

    // Conditioned on status still being "draft" at write time, not just at
    // the read above — two concurrent /publish calls for the same video
    // (double-tap, a retried request) would otherwise both pass the
    // status-check earlier and both enqueue a transcode job for it.
    const { count } = await prisma.video.updateMany({
      where: { id, status: "draft" },
      data: {
        title: title?.trim().slice(0, MAX_TITLE_LENGTH) || null,
        description: description?.trim().slice(0, MAX_DESCRIPTION_LENGTH) || null,
        category: category ?? null,
        hashtags: normalizeHashtags(hashtags),
        isPremium: premium.isPremium,
        priceStars: premium.priceStars,
        isAdult: adultConfirmed,
        status: "processing",
      },
    });
    if (count === 0) {
      return reply.code(400).send({ error: "Video is already processing" });
    }

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
    const { title, description, category, hashtags, isPremium, priceStars } = (request.body ?? {}) as {
      title?: string;
      description?: string;
      category?: string;
      hashtags?: string[];
      isPremium?: boolean;
      priceStars?: number;
    };

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.userId !== userId) {
      return reply.code(404).send({ error: "Video not found" });
    }
    if (video.status !== "published") {
      return reply.code(400).send({ error: `Cannot edit a video with status ${video.status}` });
    }

    // isPremium/priceStars are optional here — omitting both keeps the
    // video's current premium state instead of resetting it to free, unlike
    // /publish where every field is always provided from the upload form.
    let premiumUpdate: { isPremium: boolean; priceStars: number | null } | undefined;
    if (isPremium !== undefined || priceStars !== undefined) {
      const premium = parsePremiumFields({ isPremium: isPremium ?? video.isPremium, priceStars });
      if (!premium.ok) {
        return reply.code(400).send({ error: premium.error });
      }
      premiumUpdate = premium;
    }

    const updated = await prisma.video.update({
      where: { id },
      data: {
        title: title?.trim().slice(0, MAX_TITLE_LENGTH) || null,
        description: description?.trim().slice(0, MAX_DESCRIPTION_LENGTH) || null,
        category: category ?? video.category,
        hashtags: Array.isArray(hashtags) ? normalizeHashtags(hashtags) : video.hashtags,
        ...(premiumUpdate ?? {}),
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      hashtags: updated.hashtags,
      isPremium: updated.isPremium,
      priceStars: updated.priceStars,
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
