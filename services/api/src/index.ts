import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

// Route stubs matching ТЗ section 22 — implemented incrementally per MVP stage.
// POST /api/auth/telegram
// GET  /api/feed
// GET  /api/videos/:id
// POST /api/videos/:id/like

const port = Number(process.env.API_PORT ?? 3000);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
