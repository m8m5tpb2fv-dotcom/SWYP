# Build context must be the monorepo root (packages/* are workspace deps) —
# see services/api/Dockerfile for the same pattern. Needed once apps/bot
# started depending on @swyp/database: Railway's default Nixpacks build for
# this service runs plain `npm install` scoped to apps/bot alone, which
# can't resolve a "workspace:*" dependency or see packages/database at all.
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

CMD ["pnpm", "--filter", "@swyp/bot", "exec", "tsx", "src/index.ts"]
