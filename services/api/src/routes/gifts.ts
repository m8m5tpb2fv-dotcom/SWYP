import type { FastifyInstance } from "fastify";
import { Readable } from "node:stream";
import { prisma } from "@swyp/database";
import { requireEnv } from "@swyp/config";
import { authenticate } from "../plugins/authenticate.js";
import { callTelegram, createStarsInvoice } from "../telegram-api.js";

interface TelegramSticker {
  file_id: string;
  // Animated/video gifts (the vast majority) have is_animated/is_video set
  // and file_id then points at a .tgs (gzipped Lottie JSON) or .webm — not
  // something <img> can render. thumbnail is the static JPEG/WEBP preview
  // frame, which is what actually needs to be shown here.
  thumbnail?: { file_id: string };
}

interface TelegramGift {
  id: string;
  sticker: TelegramSticker;
  star_count: number;
  remaining_count?: number;
  total_count?: number;
}

// Long-press the like button -> buy the author a real Telegram Gift with
// Stars (ТЗ: gifts long-press feature). The catalog and each sticker image
// come straight from Telegram rather than being mirrored into our own DB —
// gifts.getAvailableGifts is cheap to call and the catalog barely changes,
// so an in-memory cache is enough to avoid hitting Telegram on every load.
let catalogCache: { gifts: TelegramGift[]; fetchedAt: number } | null = null;
const CATALOG_TTL_MS = 60 * 60 * 1000;

async function getCatalog(): Promise<TelegramGift[]> {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CATALOG_TTL_MS) {
    return catalogCache.gifts;
  }
  const { gifts } = await callTelegram<{ gifts: TelegramGift[] }>("getAvailableGifts");
  catalogCache = { gifts, fetchedAt: Date.now() };
  return gifts;
}

export async function giftRoutes(app: FastifyInstance) {
  // Regular (always-available) gifts only for now — limited-edition ones
  // (remaining_count set) add sold-out/upgrade handling that's out of scope
  // for this first pass.
  app.get("/api/gifts", { preHandler: authenticate }, async () => {
    const gifts = await getCatalog();
    return {
      items: gifts
        .filter((g) => g.remaining_count === undefined)
        .map((g) => ({ id: g.id, starCount: g.star_count, stickerUrl: `/api/gifts/${g.id}/sticker` })),
    };
  });

  // No auth: <img src> can't attach a bearer token, and a gift sticker isn't
  // user-specific — it's the same public Telegram asset for everyone.
  // Immutable per catalog id, so cached hard on both ends.
  app.get("/api/gifts/:id/sticker", async (request, reply) => {
    const { id } = request.params as { id: string };
    const gifts = await getCatalog();
    const gift = gifts.find((g) => g.id === id);
    if (!gift) return reply.code(404).send({ error: "Gift not found" });

    const token = requireEnv("TELEGRAM_BOT_TOKEN");
    const stickerFileId = gift.sticker.thumbnail?.file_id ?? gift.sticker.file_id;
    const file = await callTelegram<{ file_path: string }>("getFile", { file_id: stickerFileId });
    const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
    if (!fileRes.ok || !fileRes.body) return reply.code(502).send({ error: "Failed to fetch sticker" });

    // Telegram's file server always answers with Content-Type:
    // application/octet-stream regardless of the actual file — trusting
    // that (or defaulting only when absent, which never triggers) sends the
    // browser a WEBP image mislabeled as generic binary, and it may refuse
    // to render it in <img>. Derive it from the file extension instead.
    const contentType = file.file_path.endsWith(".png")
      ? "image/png"
      : file.file_path.endsWith(".jpg") || file.file_path.endsWith(".jpeg")
        ? "image/jpeg"
        : "image/webp";
    reply.header("Content-Type", contentType);
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    return reply.send(Readable.fromWeb(fileRes.body as import("stream/web").ReadableStream));
  });

  // Creates a Stars invoice for the given gift, addressed to recipientUserId.
  // Actual delivery (sendGift) happens once Telegram confirms the payment —
  // see apps/bot's successful_payment handler — not here.
  app.post("/api/gifts/purchase", { preHandler: authenticate }, async (request, reply) => {
    const purchaserId = request.user.sub;
    const { giftId, recipientUserId, videoId } = (request.body ?? {}) as {
      giftId?: string;
      recipientUserId?: string;
      videoId?: string;
    };
    if (!giftId || !recipientUserId) {
      return reply.code(400).send({ error: "giftId and recipientUserId are required" });
    }
    if (recipientUserId === purchaserId) {
      return reply.code(400).send({ error: "Cannot gift yourself" });
    }

    const [gifts, recipient] = await Promise.all([
      getCatalog(),
      prisma.user.findUnique({ where: { id: recipientUserId }, select: { id: true } }),
    ]);
    if (!recipient) return reply.code(404).send({ error: "Recipient not found" });

    const gift = gifts.find((g) => g.id === giftId);
    if (!gift) return reply.code(404).send({ error: "Gift not found" });

    const transaction = await prisma.giftTransaction.create({
      data: {
        purchaserId,
        recipientId: recipientUserId,
        videoId: videoId ?? null,
        telegramGiftId: gift.id,
        starCount: gift.star_count,
      },
    });

    const invoiceUrl = await createStarsInvoice({
      title: "Подарок в SWYP",
      description: "Подарок автору видео",
      payload: `giftTx:${transaction.id}`,
      starCount: gift.star_count,
    });

    return { transactionId: transaction.id, invoiceUrl };
  });
}
