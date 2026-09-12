import type { FastifyInstance } from "fastify";
import { prisma } from "@swyp/database";
import { authenticate } from "../plugins/authenticate.js";
import { toPublicUser } from "../serializers.js";

export async function meRoutes(app: FastifyInstance) {
  app.get("/api/me", { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }
    return toPublicUser(user);
  });

  // Only bio is editable here — username/firstName/lastName/avatarUrl are
  // synced from Telegram's own profile on every login (see routes/auth.ts),
  // so an edit to those would just be overwritten the next time the user
  // opens the app.
  app.patch("/api/me", { preHandler: authenticate }, async (request, reply) => {
    const { bio } = (request.body ?? {}) as { bio?: string };
    if (typeof bio !== "string") {
      return reply.code(400).send({ error: "bio is required" });
    }
    const trimmed = bio.trim();
    if (trimmed.length > 150) {
      return reply.code(400).send({ error: "bio must be 150 characters or fewer" });
    }

    const user = await prisma.user.update({
      where: { id: request.user.sub },
      data: { bio: trimmed || null },
    });
    return toPublicUser(user);
  });
}
