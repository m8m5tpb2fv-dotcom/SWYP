import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@swyp/database";

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  // isBanned was previously only checked at login (routes/auth.ts) — a ban
  // had no effect on an already-issued 30-day token until it expired on its
  // own. Re-checking here makes a ban take effect on the very next request.
  const user = await prisma.user.findUnique({ where: { id: request.user.sub }, select: { isBanned: true } });
  if (!user || user.isBanned) {
    return reply.code(403).send({ error: "Account is banned" });
  }
}
