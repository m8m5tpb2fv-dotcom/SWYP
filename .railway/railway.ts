import { bucket, defineRailway, github, postgres, project, redis, service } from "railway/iac";

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
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: cache.env.REDIS_URL,
      JWT_SECRET: jwtSecret,
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: adminPassword,
      // Filled in after the bucket + domains exist — see DEPLOY.md step 2/3.
      TELEGRAM_BOT_TOKEN: "unset",
      STORAGE_ENDPOINT: "unset",
      STORAGE_BUCKET: "videos",
      STORAGE_ACCESS_KEY: "unset",
      STORAGE_SECRET_KEY: "unset",
      CDN_BASE_URL: "unset",
    },
  });

  const videoWorker = service("video-worker", {
    source: github(REPO, { branch: BRANCH }),
    build: { builder: "DOCKERFILE", dockerfilePath: "services/video-worker/Dockerfile" },
    env: {
      NODE_ENV: "production",
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: cache.env.REDIS_URL,
      STORAGE_ENDPOINT: "unset",
      STORAGE_BUCKET: "videos",
      STORAGE_ACCESS_KEY: "unset",
      STORAGE_SECRET_KEY: "unset",
      CDN_BASE_URL: "unset",
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
      TELEGRAM_BOT_TOKEN: "unset",
      MINIAPP_URL: "unset",
    },
  });

  const miniapp = service("miniapp", {
    source: github(REPO, { branch: BRANCH, rootDirectory: "apps/miniapp" }),
    build: "npm install && npm run build",
    start: "npx --yes serve -s dist -l $PORT",
    env: {
      VITE_API_URL: "unset",
      VITE_BOT_USERNAME: "unset",
    },
  });

  const admin = service("admin", {
    source: github(REPO, { branch: BRANCH, rootDirectory: "apps/admin" }),
    build: "npm install && npm run build",
    start: "npx --yes serve -s dist -l $PORT",
    env: {
      VITE_API_URL: "unset",
    },
  });

  return project("swyp", {
    resources: [db, cache, videos, api, videoWorker, analyticsWorker, bot, miniapp, admin],
  });
});
