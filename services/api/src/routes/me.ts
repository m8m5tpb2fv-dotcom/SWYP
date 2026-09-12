import type { FastifyInstance } from "fastify";
import { Prisma, prisma } from "@swyp/database";
import { authenticate } from "../plugins/authenticate.js";
import { toPublicUser } from "../serializers.js";

const NICKNAME_PATTERN = /^[\p{L}\p{N}_ ]{3,20}$/u;

export async function meRoutes(app: FastifyInstance) {
  app.get("/api/me", { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }
    return toPublicUser(user);
  });

  // bio, subscriptionPriceStars and nickname are the only editable fields
  // here — username/firstName/lastName/avatarUrl are synced from Telegram's
  // own profile on every login (see routes/auth.ts), so an edit to those
  // would just be overwritten the next time the user opens the app.
  // Every field is optional and only touched when present in the body, so
  // the registration screen can PATCH just `nickname` without also having
  // to resend an unrelated bio.
  app.patch("/api/me", { preHandler: authenticate }, async (request, reply) => {
    const { bio, subscriptionPriceStars, nickname } = (request.body ?? {}) as {
      bio?: string;
      subscriptionPriceStars?: number | null;
      nickname?: string | null;
    };

    let bioUpdate: string | null | undefined;
    if (bio !== undefined) {
      if (typeof bio !== "string") {
        return reply.code(400).send({ error: "bio must be a string" });
      }
      const trimmed = bio.trim();
      if (trimmed.length > 150) {
        return reply.code(400).send({ error: "bio must be 150 characters or fewer" });
      }
      bioUpdate = trimmed || null;
    }

    let priceUpdate: number | null | undefined;
    if (subscriptionPriceStars !== undefined) {
      if (subscriptionPriceStars === null || subscriptionPriceStars === 0) {
        priceUpdate = null;
      } else if (
        typeof subscriptionPriceStars !== "number" ||
        !Number.isInteger(subscriptionPriceStars) ||
        subscriptionPriceStars < 1 ||
        subscriptionPriceStars > 100000
      ) {
        return reply.code(400).send({ error: "subscriptionPriceStars must be an integer between 1 and 100000, or 0/null to disable" });
      } else {
        priceUpdate = subscriptionPriceStars;
      }
    }

    let nicknameUpdate: string | null | undefined;
    if (nickname !== undefined) {
      if (nickname === null || nickname.trim().length === 0) {
        nicknameUpdate = null;
      } else if (typeof nickname !== "string" || !NICKNAME_PATTERN.test(nickname.trim())) {
        return reply
          .code(400)
          .send({ error: "nickname must be 3-20 characters: letters, digits, underscore or spaces" });
      } else {
        nicknameUpdate = nickname.trim();
      }
    }

    try {
      const user = await prisma.user.update({
        where: { id: request.user.sub },
        data: {
          ...(bioUpdate !== undefined ? { bio: bioUpdate } : {}),
          ...(priceUpdate !== undefined ? { subscriptionPriceStars: priceUpdate } : {}),
          ...(nicknameUpdate !== undefined ? { nickname: nicknameUpdate } : {}),
        },
      });
      return toPublicUser(user);
    } catch (err) {
      const isDuplicateNickname = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (isDuplicateNickname) {
        return reply.code(409).send({ error: "This nickname is already taken" });
      }
      throw err;
    }
  });
}
