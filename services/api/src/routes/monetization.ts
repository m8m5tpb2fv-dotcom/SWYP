import type { FastifyInstance } from "fastify";
import { prisma } from "@swyp/database";
import { authenticate } from "../plugins/authenticate.js";
import { createStarsInvoice } from "../telegram-api.js";

export const SUBSCRIPTION_DAYS = 30;

// Exclusive Shorts (per-video unlock) and creator subscriptions. Both just
// mint a Stars invoice here — the actual VideoUnlock/CreatorSubscription row
// is only created once Telegram confirms the payment (apps/bot's
// successful_payment handler), the same "invoice now, grant access on
// confirmed payment" split used for gifts, except neither of these needs a
// pending/failed state: unlike sendGift (an external Bot API call that can
// fail on its own), granting access here is just one DB write with nothing
// external that could fail after payment succeeds.
export async function monetizationRoutes(app: FastifyInstance) {
  app.post("/api/videos/:id/unlock", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.status !== "published") {
      return reply.code(404).send({ error: "Video not found" });
    }
    if (!video.isPremium || !video.priceStars) {
      return reply.code(400).send({ error: "This video isn't premium" });
    }
    if (video.userId === userId) {
      return reply.code(400).send({ error: "You already own this video" });
    }

    const existing = await prisma.videoUnlock.findUnique({
      where: { userId_videoId: { userId, videoId: id } },
    });
    if (existing) {
      return reply.code(400).send({ error: "Already unlocked" });
    }

    const invoiceUrl = await createStarsInvoice({
      title: "Эксклюзивный Short",
      description: video.title ? `Открыть видео «${video.title}»` : "Открыть эксклюзивное видео",
      payload: `videoUnlock:${id}`,
      starCount: video.priceStars,
    });

    return { invoiceUrl };
  });

  app.post("/api/users/:id/subscribe", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;

    if (id === userId) {
      return reply.code(400).send({ error: "Cannot subscribe to yourself" });
    }

    const creator = await prisma.user.findUnique({ where: { id } });
    if (!creator) return reply.code(404).send({ error: "Creator not found" });
    if (!creator.subscriptionPriceStars) {
      return reply.code(400).send({ error: "This creator doesn't offer subscriptions" });
    }

    const displayName = creator.username ? `@${creator.username}` : (creator.firstName ?? "автора");
    const invoiceUrl = await createStarsInvoice({
      title: "Премиум-подписка SWYP",
      description: `Подписка на ${displayName} — ${SUBSCRIPTION_DAYS} дней доступа к эксклюзивным Shorts`,
      payload: `subscribe:${id}`,
      starCount: creator.subscriptionPriceStars,
    });

    return { invoiceUrl };
  });
}
