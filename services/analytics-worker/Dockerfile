# Build context must be the monorepo root (packages/* are workspace deps).
FROM node:22-slim

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @swyp/database exec prisma generate

ENV NODE_ENV=production

CMD ["pnpm", "--filter", "@swyp/analytics-worker", "exec", "tsx", "src/index.ts"]
