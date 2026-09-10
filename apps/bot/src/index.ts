import { Bot, InlineKeyboard } from "grammy";

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

bot.catch((err) => console.error("[bot] error", err));

bot.start();
