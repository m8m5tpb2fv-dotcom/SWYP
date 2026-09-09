import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { requireEnv } from "@swyp/config";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";

const app = Fastify({ logger: true });

await app.register(jwt, { secret: requireEnv("JWT_SECRET") });

app.get("/health", async () => ({ status: "ok" }));

await app.register(authRoutes);
await app.register(meRoutes);

// Route stubs matching ТЗ section 22 — implemented incrementally per MVP stage.
// GET  /api/feed
// GET  /api/videos/:id
// POST /api/videos/:id/like

const port = Number(process.env.API_PORT ?? 3000);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
