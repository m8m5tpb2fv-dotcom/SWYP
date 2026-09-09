# Build context must be the monorepo root (packages/* are workspace deps).
# Runs services via tsx rather than tsc dist output — the shared packages
# (packages/database etc.) ship TS source ("main": "./src/index.ts"), so a
# plain `node dist/index.js` can't resolve them without a build step per
# package; tsx transpiles workspace imports on the fly instead.
FROM node:22-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @swyp/database exec prisma generate

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @swyp/database exec prisma migrate deploy && pnpm --filter @swyp/api exec tsx src/index.ts"]
