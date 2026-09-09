import type { FastifyInstance } from "fastify";
import { prisma } from "@swyp/database";
import { requireEnv } from "@swyp/config";
import { verifyTelegramInitData } from "../telegram-auth.js";
import { toPublicUser } from "../serializers.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/telegram", async (request, reply) => {
    const { initData } = (request.body ?? {}) as { initData?: string };
    if (!initData) {
      return reply.code(400).send({ error: "initData is required" });
    }

    let verified;
    try {
      verified = verifyTelegramInitData(initData, requireEnv("TELEGRAM_BOT_TOKEN"));
    } catch (err) {
      return reply.code(401).send({ error: (err as Error).message });
    }

    const tgUser = verified.user;
    const user = await prisma.user.upsert({
      where: { telegramId: String(tgUser.id) },
      update: {
        username: tgUser.username ?? null,
        firstName: tgUser.first_name ?? null,
        lastName: tgUser.last_name ?? null,
        avatarUrl: tgUser.photo_url ?? null,
      },
      create: {
        telegramId: String(tgUser.id),
        username: tgUser.username ?? null,
        firstName: tgUser.first_name ?? null,
        lastName: tgUser.last_name ?? null,
        avatarUrl: tgUser.photo_url ?? null,
      },
    });

    if (user.isBanned) {
      return reply.code(403).send({ error: "User is banned" });
    }

    const accessToken = app.jwt.sign({ sub: user.id }, { expiresIn: "30d" });

    return { access_token: accessToken, user: toPublicUser(user) };
  });
}
