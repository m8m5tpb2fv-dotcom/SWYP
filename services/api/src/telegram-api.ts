import { requireEnv } from "@swyp/config";

// Shared by routes/gifts.ts and routes/monetization.ts — both create Stars
// (XTR) invoices or otherwise call the Bot API directly rather than through
// grammy (that's only a dependency of apps/bot).
export async function callTelegram<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) throw new Error(data.description ?? `Telegram API ${method} failed`);
  return data.result as T;
}

// provider_token is deliberately "" in every call site — Telegram Stars
// payments (currency XTR) don't go through a real payment provider.
export function createStarsInvoice(params: { title: string; description: string; payload: string; starCount: number }) {
  return callTelegram<string>("createInvoiceLink", {
    title: params.title,
    description: params.description,
    payload: params.payload,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: params.title, amount: params.starCount }],
  });
}
