import { Bot, InlineKeyboard } from "grammy";
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

// Stars payment flow for the long-press-like-to-gift feature (services/api's
// /api/gifts/purchase creates the invoice this pays). Telegram requires
// pre_checkout_query answered within 10s or the payment is auto-declined.
bot.on("pre_checkout_query", async (ctx) => {
  const payload = ctx.preCheckoutQuery.invoice_payload;
  if (!payload.startsWith(GIFT_PAYLOAD_PREFIX)) {
    await ctx.answerPreCheckoutQuery(false, { error_message: "Неизвестный платёж" });
    return;
  }
  const tx = await prisma.giftTransaction.findUnique({ where: { id: payload.slice(GIFT_PAYLOAD_PREFIX.length) } });
  if (!tx || tx.status !== "pending_payment") {
    await ctx.answerPreCheckoutQuery(false, { error_message: "Заказ не найден или уже обработан" });
    return;
  }
  await ctx.answerPreCheckoutQuery(true);
});

// Payment confirmed — deliver the actual gift. sendGift spends from the
// bot's OWN Stars balance (separate from what was just received), so this
// can fail even after a successful payment (e.g. the bot's balance is too
// low) — in that case refund the purchaser rather than keep their stars for
// a gift that never arrived.
bot.on("message:successful_payment", async (ctx) => {
  const payment = ctx.message.successful_payment;
  const payload = payment.invoice_payload;
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

bot.start();
