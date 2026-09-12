import Fastify from "fastify";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
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
await app.register(uploadRoutes);
await app.register(userRoutes);
await app.register(searchRoutes);
await app.register(reportRoutes);
await app.register(adminRoutes);
await app.register(eventRoutes);
await app.register(shareRoutes);
await app.register(giftRoutes);

// PORT is Railway's convention; API_PORT is the local-dev override.
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
