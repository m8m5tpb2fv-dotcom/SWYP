# SWYP

Telegram-native Shorts платформа: вертикальная видеолента внутри Telegram Mini App,
без отдельной регистрации (авторизация через Telegram), с шерингом роликов прямо в чаты.

## Структура монорепо

```
apps/
  miniapp/    — Mini App (React + Vite + Tailwind), открывается внутри Telegram
  admin/      — админ-панель (React + Vite + Tailwind)
  bot/        — Telegram-бот (grammy), точка входа в Mini App

services/
  api/                — backend REST API (Fastify)
  video-worker/       — обработка видео: ffmpeg-транскодинг, превью, загрузка в storage (BullMQ)
  analytics-worker/   — агрегация событий просмотра для рекомендаций (BullMQ)

packages/
  database/   — Prisma-схема и клиент (общие для api и воркеров)
  storage/    — S3-совместимый клиент (presigned URL, чтение/запись объектов)
  types/      — общие TypeScript-типы
  config/     — загрузка переменных окружения

docker/
  docker-compose.yml — Postgres, Redis, MinIO (+ автосоздание бакета) для локальной разработки
```

Реализовано: авторизация через Telegram initData, лента со свайпом и infinite scroll,
лайки, комментарии (bottom sheet), загрузка видео (presigned URL → ffmpeg-обработка →
публикация в ленте). Дальше по плану: профили, подписки, поиск, модерация, рекомендации,
аналитика, админка.

## Разработка

Требуется Node.js 20+, pnpm и ffmpeg (для `video-worker`).

```bash
pnpm install
cp .env.example .env   # заполнить TELEGRAM_BOT_TOKEN и остальное

docker compose -f docker/docker-compose.yml up -d   # Postgres, Redis, MinIO

pnpm dev:api        # backend, http://localhost:3000
pnpm dev:miniapp    # Mini App, http://localhost:5173
pnpm dev:admin      # админка, http://localhost:5174
pnpm dev:bot        # Telegram-бот (нужен TELEGRAM_BOT_TOKEN)
pnpm --filter @swyp/video-worker dev   # обработка загруженных видео
```
