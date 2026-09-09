import { Bot, InlineKeyboard } from "grammy";

// Commands / menu per ТЗ sections 34-35. Auth itself happens inside the Mini App
// via Telegram initData, verified by services/api.

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

const miniAppUrl = process.env.MINIAPP_URL ?? "https://example.com";

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

bot.command("help", async (ctx) => {
  await ctx.reply("/start — открыть Shorts\n/app — открыть Mini App\n/profile — мой профиль");
});

bot.catch((err) => console.error("[bot] error", err));

bot.start();
