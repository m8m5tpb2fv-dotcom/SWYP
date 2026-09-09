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
}
