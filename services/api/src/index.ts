import Fastify from "fastify";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import { requireEnv } from "@swyp/config";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";
import { feedRoutes } from "./routes/feed.js";
import { likeRoutes } from "./routes/likes.js";
import { commentRoutes } from "./routes/comments.js";

const app = Fastify({ logger: true });

// The Mini App is served from a different origin than the API (Telegram's webview
// included), so this needs to stay wide open — there's no cookie-based session to protect.
await app.register(cors, { origin: process.env.CORS_ORIGIN ?? true });

await app.register(jwt, { secret: requireEnv("JWT_SECRET") });

app.get("/health", async () => ({ status: "ok" }));

await app.register(authRoutes);
await app.register(meRoutes);
await app.register(feedRoutes);
await app.register(likeRoutes);
await app.register(commentRoutes);

// Route stub matching ТЗ section 22 — implemented once video upload exists.
// GET  /api/videos/:id

const port = Number(process.env.API_PORT ?? 3000);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
