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
  video-worker/       — обработка видео: транскодинг, превью, CDN (BullMQ)
  analytics-worker/   — агрегация событий просмотра для рекомендаций (BullMQ)

packages/
  database/   — Prisma-схема и клиент (общие для api и воркеров)
  types/      — общие TypeScript-типы
  config/     — загрузка переменных окружения

docker/
  docker-compose.yml — Postgres, Redis, MinIO для локальной разработки
```

Это каркас проекта (пока без бизнес-логики) — соответствует разделу 37 ТЗ.
Реализация идёт поэтапно: авторизация → лента → загрузка видео → соц. функции →
профили → поиск → модерация → рекомендации → аналитика.

## Разработка

Требуется Node.js 20+ и pnpm.

```bash
pnpm install
cp .env.example .env   # заполнить TELEGRAM_BOT_TOKEN и остальное

docker compose -f docker/docker-compose.yml up -d   # Postgres, Redis, MinIO

pnpm dev:api        # backend, http://localhost:3000
pnpm dev:miniapp    # Mini App, http://localhost:5173
pnpm dev:admin      # админка, http://localhost:5174
pnpm dev:bot        # Telegram-бот (нужен TELEGRAM_BOT_TOKEN)
```
