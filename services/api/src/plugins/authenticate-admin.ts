import type { FastifyReply, FastifyRequest } from "fastify";

export async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
  if (request.user.role !== "admin") {
    return reply.code(403).send({ error: "Forbidden" });
  }
}
