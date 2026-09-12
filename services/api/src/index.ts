import Fastify from "fastify";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import { Prisma } from "@swyp/database";
import { requireEnv } from "@swyp/config";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";
import { feedRoutes } from "./routes/feed.js";
import { likeRoutes } from "./routes/likes.js";
import { commentRoutes } from "./routes/comments.js";
import { uploadRoutes } from "./routes/uploads.js";
import { userRoutes } from "./routes/users.js";
import { searchRoutes } from "./routes/search.js";
import { reportRoutes } from "./routes/reports.js";
import { adminRoutes } from "./routes/admin.js";
import { eventRoutes } from "./routes/events.js";
import { shareRoutes } from "./routes/shares.js";
import { giftRoutes } from "./routes/gifts.js";
import { monetizationRoutes } from "./routes/monetization.js";

const app = Fastify({ logger: true });

// The Mini App is served from a different origin than the API (Telegram's webview
// included), so this needs to stay wide open — there's no cookie-based session to protect.
await app.register(cors, { origin: process.env.CORS_ORIGIN ?? true });

await app.register(jwt, { secret: requireEnv("JWT_SECRET") });

// Fail fast at boot rather than the first time a request happens to touch a
// missing secret — e.g. TELEGRAM_BOT_TOKEN was previously only read lazily
// inside route handlers, so a misconfigured deploy would pass health checks
// and only fail (with a confusing error) on the first login/payment request.
requireEnv("TELEGRAM_BOT_TOKEN");

// No route handler should ever leak a raw internal error message (a Prisma
// error, a missing-env-var Error, an unexpected exception) to the client —
// map the known cases to clean responses and mask everything else as a
// generic 500, logging the real error server-side instead.
app.setErrorHandler((err, request, reply) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      return reply.code(404).send({ error: "Not found" });
    }
    if (err.code === "P2002") {
      return reply.code(409).send({ error: "Conflict" });
    }
  }
  // Fastify's own validation/parsing errors already carry a real client-error
  // statusCode and a safe message — pass those through as-is.
  if (err.statusCode && err.statusCode < 500) {
    return reply.code(err.statusCode).send({ error: err.message });
  }
  app.log.error(err);
  return reply.code(500).send({ error: "Internal server error" });
});

app.get("/health", async () => ({ status: "ok" }));

await app.register(authRoutes);
await app.register(meRoutes);
await app.register(feedRoutes);
await app.register(likeRoutes);
await app.register(commentRoutes);
await app.register(uploadRoutes);
await app.register(userRoutes);
await app.register(searchRoutes);
await app.register(reportRoutes);
await app.register(adminRoutes);
await app.register(eventRoutes);
await app.register(shareRoutes);
await app.register(giftRoutes);
await app.register(monetizationRoutes);

// PORT is Railway's convention; API_PORT is the local-dev override.
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
