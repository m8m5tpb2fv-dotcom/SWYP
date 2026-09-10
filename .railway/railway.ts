import { bucket, defineRailway, github, postgres, preserve, project, redis, service } from "railway/iac";

const REPO = "m8m5tpb2fv-dotcom/swyp";
const BRANCH = "claude/hello-ntyrhn";

export default defineRailway((ctx) => {
  const db = postgres("db");
  const cache = redis("cache");
  const videos = bucket("videos", { region: "sjc" });

  const jwtSecret = ctx.randomString("jwt-secret", 32);
  const adminPassword = ctx.randomString("admin-password", 16);

  // services/api, services/video-worker, services/analytics-worker consume workspace
  // packages (packages/database, packages/storage, ...), so their Dockerfile build
  // context must be the monorepo root — no rootDirectory, just a dockerfilePath.
  const api = service("api", {
    source: github(REPO, { branch: BRANCH }),
    build: { builder: "DOCKERFILE", dockerfilePath: "services/api/Dockerfile" },
    healthcheck: "/health",
    env: {
      NODE_ENV: "production",
      // Railway's healthcheck prober reads this to know which port to probe —
      // without it the deployment never leaves DEPLOYING, no matter what the
      // app itself listens on.
      PORT: "3000",
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: cache.env.REDIS_URL,
      JWT_SECRET: jwtSecret,
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: adminPassword,
      // Bucket credentials aren't referenceable via the IaC graph yet (BucketNode
      // has no .env) — set once with `railway variable set`, preserve() here so a
      // future `config apply` doesn't overwrite them back to nothing.
      STORAGE_ENDPOINT: preserve(),
      STORAGE_BUCKET: preserve(),
      STORAGE_ACCESS_KEY: preserve(),
      STORAGE_SECRET_KEY: preserve(),
      STORAGE_FORCE_PATH_STYLE: "false",
      // Real value only known once @BotFather issues it — set via `railway variable set`.
      TELEGRAM_BOT_TOKEN: preserve(),
    },
  });

  const videoWorker = service("video-worker", {
    source: github(REPO, { branch: BRANCH }),
    build: { builder: "DOCKERFILE", dockerfilePath: "services/video-worker/Dockerfile" },
    env: {
      NODE_ENV: "production",
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: cache.env.REDIS_URL,
      STORAGE_ENDPOINT: preserve(),
      STORAGE_BUCKET: preserve(),
      STORAGE_ACCESS_KEY: preserve(),
      STORAGE_SECRET_KEY: preserve(),
      STORAGE_FORCE_PATH_STYLE: "false",
    },
  });

  const analyticsWorker = service("analytics-worker", {
    source: github(REPO, { branch: BRANCH }),
    build: { builder: "DOCKERFILE", dockerfilePath: "services/analytics-worker/Dockerfile" },
    env: {
      NODE_ENV: "production",
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: cache.env.REDIS_URL,
    },
  });

  // bot/miniapp/admin have zero @swyp/* workspace deps, so Nixpacks can build them
  // standalone from their own subdirectory — no Dockerfile needed.
  const bot = service("bot", {
    source: github(REPO, { branch: BRANCH, rootDirectory: "apps/bot" }),
    build: "npm install && npm run build",
    start: "npm start",
    env: {
      NODE_ENV: "production",
      TELEGRAM_BOT_TOKEN: preserve(),
      // The Mini App's public domain — set via `railway variable set` once it exists.
      MINIAPP_URL: preserve(),
    },
  });

  const miniapp = service("miniapp", {
    source: github(REPO, { branch: BRANCH, rootDirectory: "apps/miniapp" }),
    build: "npm install && npm run build",
    start: "npx --yes serve -s dist -l $PORT",
    env: {
      PORT: "3000",
      // Vite bakes these in at build time — set via `railway variable set` once
      // the api service's public domain exists, then redeploy to rebuild.
      VITE_API_URL: preserve(),
      VITE_BOT_USERNAME: preserve(),
    },
  });

  const admin = service("admin", {
    source: github(REPO, { branch: BRANCH, rootDirectory: "apps/admin" }),
    build: "npm install && npm run build",
    start: "npx --yes serve -s dist -l $PORT",
    env: {
      PORT: "3000",
      VITE_API_URL: preserve(),
    },
  });

  return project("swyp", {
    resources: [db, cache, videos, api, videoWorker, analyticsWorker, bot, miniapp, admin],
  });
});
