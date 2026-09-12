import { Bot, GrammyError, InlineKeyboard } from "grammy";
import { prisma } from "@swyp/database";

// Commands / menu per ТЗ sections 34-35. Auth itself happens inside the Mini App
// via Telegram initData, verified by services/api.

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

const miniAppUrl = process.env.MINIAPP_URL ?? "https://example.com";
const adminUrl = process.env.ADMIN_URL;

const bot = new Bot(token);

bot.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard().webApp("▶️ Смотреть Shorts", miniAppUrl);
  await ctx.reply("🔥 SHORTS\n\nСмотри короткие видео прямо внутри Telegram.", {
    reply_markup: keyboard,
  });
});

bot.command("app", async (ctx) => {
  const keyboard = new InlineKeyboard().webApp("▶️ Открыть", miniAppUrl);
  await ctx.reply("Открыть Mini App:", { reply_markup: keyboard });
});

// The admin panel keeps its own username/password login (separate from
// Telegram auth — see services/api/src/routes/admin.ts), so exposing this
// command to anyone is safe; it's just a convenient launcher, not a bypass.
bot.command("admin", async (ctx) => {
  if (!adminUrl) {
    await ctx.reply("Админ-панель не настроена (ADMIN_URL не задан).");
    return;
  }
  const keyboard = new InlineKeyboard().webApp("🛠 Открыть админку", adminUrl);
  await ctx.reply("Админ-панель SWYP:", { reply_markup: keyboard });
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "/start — открыть Shorts\n/app — открыть Mini App\n/profile — мой профиль\n/admin — админ-панель",
  );
});

const GIFT_PAYLOAD_PREFIX = "giftTx:";
const VIDEO_UNLOCK_PAYLOAD_PREFIX = "videoUnlock:";
const SUBSCRIBE_PAYLOAD_PREFIX = "subscribe:";
// Kept in sync with services/api/src/routes/monetization.ts's SUBSCRIPTION_DAYS —
// separate deployable services, no shared import between them.
const SUBSCRIPTION_DAYS = 30;

// Stars payment flow for the long-press-like-to-gift feature, per-video
// unlocks and creator subscriptions (services/api's /api/gifts/purchase,
// /api/videos/:id/unlock and /api/users/:id/subscribe create the invoices
// this pays). Telegram requires pre_checkout_query answered within 10s or
// the payment is auto-declined.
bot.on("pre_checkout_query", async (ctx) => {
  const payload = ctx.preCheckoutQuery.invoice_payload;

  if (payload.startsWith(GIFT_PAYLOAD_PREFIX)) {
    const tx = await prisma.giftTransaction.findUnique({ where: { id: payload.slice(GIFT_PAYLOAD_PREFIX.length) } });
    if (!tx || tx.status !== "pending_payment") {
      await ctx.answerPreCheckoutQuery(false, { error_message: "Заказ не найден или уже обработан" });
      return;
    }
    await ctx.answerPreCheckoutQuery(true);
    return;
  }

  if (payload.startsWith(VIDEO_UNLOCK_PAYLOAD_PREFIX)) {
    const videoId = payload.slice(VIDEO_UNLOCK_PAYLOAD_PREFIX.length);
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video || !video.isPremium || !video.priceStars) {
      await ctx.answerPreCheckoutQuery(false, { error_message: "Видео больше недоступно для покупки" });
      return;
    }
    await ctx.answerPreCheckoutQuery(true);
    return;
  }

  if (payload.startsWith(SUBSCRIBE_PAYLOAD_PREFIX)) {
    const creatorId = payload.slice(SUBSCRIBE_PAYLOAD_PREFIX.length);
    const creator = await prisma.user.findUnique({ where: { id: creatorId } });
    if (!creator || !creator.subscriptionPriceStars) {
      await ctx.answerPreCheckoutQuery(false, { error_message: "Подписка больше недоступна" });
      return;
    }
    await ctx.answerPreCheckoutQuery(true);
    return;
  }

  await ctx.answerPreCheckoutQuery(false, { error_message: "Неизвестный платёж" });
});

// Payment confirmed — deliver the actual gift. sendGift spends from the
// bot's OWN Stars balance (separate from what was just received), so this
// can fail even after a successful payment (e.g. the bot's balance is too
// low) — in that case refund the purchaser rather than keep their stars for
// a gift that never arrived.
bot.on("message:successful_payment", async (ctx) => {
  const payment = ctx.message.successful_payment;
  const payload = payment.invoice_payload;

  // Unlock/subscribe never went through a pending DB row the way gifts do
  // (no external delivery call after payment that could itself fail), so the
  // buyer is resolved here from ctx.from — the same Telegram account that
  // authenticated through the Mini App to request the invoice.
  if (payload.startsWith(VIDEO_UNLOCK_PAYLOAD_PREFIX)) {
    const videoId = payload.slice(VIDEO_UNLOCK_PAYLOAD_PREFIX.length);
    const buyer = await prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) } });
    if (!buyer) return;
    await prisma.videoUnlock.upsert({
      where: { userId_videoId: { userId: buyer.id, videoId } },
      create: {
        userId: buyer.id,
        videoId,
        priceStars: payment.total_amount,
        telegramChargeId: payment.telegram_payment_charge_id,
      },
      update: {},
    });
    await ctx.reply("✅ Видео открыто! Вернись в приложение, чтобы посмотреть его.");
    return;
  }

  if (payload.startsWith(SUBSCRIBE_PAYLOAD_PREFIX)) {
    const creatorId = payload.slice(SUBSCRIBE_PAYLOAD_PREFIX.length);
    const buyer = await prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) } });
    if (!buyer) return;

    // Idempotency guard — Telegram doesn't normally redeliver successful_payment,
    // but unlike VideoUnlock (a unique userId+videoId row an upsert can no-op
    // on) a subscription extends an expiry date, so a duplicate delivery would
    // double-grant days without this check.
    const already = await prisma.creatorSubscription.findFirst({
      where: { telegramChargeId: payment.telegram_payment_charge_id },
    });
    if (already) return;

    // Renewing before expiry stacks the new period onto the remaining time
    // instead of wasting it.
    const latestActive = await prisma.creatorSubscription.findFirst({
      where: { subscriberId: buyer.id, creatorId, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "desc" },
    });
    const base = latestActive ? latestActive.expiresAt : new Date();
    const expiresAt = new Date(base.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);

    await prisma.creatorSubscription.create({
      data: {
        subscriberId: buyer.id,
        creatorId,
        priceStars: payment.total_amount,
        expiresAt,
        telegramChargeId: payment.telegram_payment_charge_id,
      },
    });
    await ctx.reply(`✅ Подписка активна на ${SUBSCRIPTION_DAYS} дней! Открой приложение, чтобы смотреть эксклюзивные Shorts.`);
    return;
  }

  if (!payload.startsWith(GIFT_PAYLOAD_PREFIX)) return;

  const tx = await prisma.giftTransaction.findUnique({
    where: { id: payload.slice(GIFT_PAYLOAD_PREFIX.length) },
    include: { purchaser: true, recipient: true },
  });
  if (!tx || tx.status !== "pending_payment") return;

  await prisma.giftTransaction.update({
    where: { id: tx.id },
    data: { telegramChargeId: payment.telegram_payment_charge_id },
  });

  try {
    await ctx.api.sendGift(Number(tx.recipient.telegramId), tx.telegramGiftId);
    await prisma.giftTransaction.update({ where: { id: tx.id }, data: { status: "delivered" } });

    await ctx.reply("🎁 Подарок отправлен!");
    const purchaserLabel = tx.purchaser.username ? `@${tx.purchaser.username}` : tx.purchaser.firstName ?? "Кто-то";
    await bot.api
      .sendMessage(Number(tx.recipient.telegramId), `🎁 ${purchaserLabel} подарил(а) вам подарок в SWYP!`)
      .catch(() => {
        // recipient may have blocked the bot — the gift itself still landed on their account
      });
  } catch (err) {
    console.error("[bot] sendGift failed", err);
    await prisma.giftTransaction.update({ where: { id: tx.id }, data: { status: "failed_refunded" } });
    try {
      await ctx.api.refundStarPayment(Number(tx.purchaser.telegramId), payment.telegram_payment_charge_id);
      await ctx.reply("Не удалось отправить подарок — звёзды возвращены.");
    } catch (refundErr) {
      console.error("[bot] refund failed", refundErr);
      await ctx.reply("Не удалось отправить подарок. Напишите в поддержку для возврата звёзд.");
    }
  }
});

bot.catch((err) => console.error("[bot] error", err));

// bot.catch() only wraps errors from update processing (grammy's middleware
// error boundary) — it does not cover a rejection from start() itself (e.g.
// its initial getMe() call failing on a bad token or a DNS/network blip
// right at container start), which would otherwise be an unhandled
// top-level promise rejection and crash the process outright on Node's
// default --unhandled-rejections=strict behavior.
//
// getUpdates (long polling) only allows ONE active poller per bot token —
// during a Railway redeploy the old container's in-flight getUpdates call
// (up to its own 30s timeout) can still be "live" on Telegram's side for a
// few seconds after the new container starts and tries to poll too,
// producing a 409 Conflict. Exiting immediately on that (as before) just
// handed the retry to Railway's restart policy, which could bounce the
// container faster than the old poll actually expired — occasionally
// turning a few-second overlap into a longer crash loop. Retrying inside
// the same process with backoff gives the old poll time to actually clear
// before trying again, self-healing the common case without needing a
// manual token rotation.
const START_MAX_ATTEMPTS = 6;

async function startWithRetry() {
  for (let attempt = 1; attempt <= START_MAX_ATTEMPTS; attempt++) {
    try {
      // Resolves only once the bot is told to stop (e.g. SIGINT/SIGTERM) —
      // this call blocks for the process's normal lifetime on success.
      await bot.start();
      return;
    } catch (err) {
      const isConflict = err instanceof GrammyError && err.error_code === 409;
      if (!isConflict || attempt === START_MAX_ATTEMPTS) {
        console.error("[bot] failed to start", err);
        process.exit(1);
      }
      const delayMs = attempt * 5000;
      console.warn(`[bot] getUpdates conflict on attempt ${attempt}/${START_MAX_ATTEMPTS} — retrying in ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

startWithRetry();
