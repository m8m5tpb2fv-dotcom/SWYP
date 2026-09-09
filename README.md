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

Реализовано: авторизация через Telegram initData; лента со свайпом, infinite scroll и
ранжированием по score; лайки; комментарии (bottom sheet); загрузка видео (presigned URL →
ffmpeg-обработка → публикация); профили и подписки; поиск (пользователи/Shorts/хэштеги);
жалобы и модерация (админ-панель: дашборд, видео, жалобы, пользователи); аналитика
просмотров (video_impression/video_watch → analytics-worker → пересчёт score по формуле
из ТЗ раздела 5). Дальше по плану (не входит в MVP выше): полноценная лестница качеств
видео (360p–1080p), freshness/exploration-подмес к score (раздел 31), сохранённые видео,
уведомления, монетизация.

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
pnpm --filter @swyp/video-worker dev       # обработка загруженных видео
pnpm --filter @swyp/analytics-worker dev   # события просмотра → пересчёт score
```
