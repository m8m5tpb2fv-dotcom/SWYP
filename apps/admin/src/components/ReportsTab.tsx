import { useEffect, useState } from "react";
import { fetchReports, resolveReport, type AdminReport } from "../lib/admin";

const REASON_LABELS: Record<string, string> = {
  adult: "18+",
  violence: "Насилие",
  fraud: "Мошенничество",
  spam: "Спам",
  copyright: "Авторские права",
  abuse: "Оскорбления",
  other: "Другое",
};

export default function ReportsTab() {
  const [status, setStatus] = useState("open");
  const [items, setItems] = useState<AdminReport[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (cursor?: string) => {
    if (!cursor) setLoading(true);
    fetchReports(status, cursor)
      .then((page) => {
        setItems((prev) => (cursor ? [...prev, ...page.items] : page.items));
        setNextCursor(page.next_cursor);
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleResolve = async (id: string, action: "dismiss" | "block") => {
    await resolveReport(id, action);
    setItems((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="mb-4 rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="open">Открытые</option>
        <option value="resolved">Решённые</option>
        <option value="dismissed">Отклонённые</option>
      </select>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-gray-400">Загрузка…</p>}
      {!loading && items.length === 0 && <p className="text-sm text-gray-400">Жалоб нет</p>}

      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {r.video.title ?? "Без названия"} — @{r.video.author.username ?? r.video.author.firstName}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Причина: {REASON_LABELS[r.reason] ?? r.reason} · от @
                {r.reporter.username ?? r.reporter.firstName}
              </p>
            </div>
            {status === "open" && (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleResolve(r.id, "block")}
                  className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600"
                >
                  Заблокировать видео
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve(r.id, "dismiss")}
                  className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600"
                >
                  Отклонить жалобу
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {nextCursor && (
        <button
          type="button"
          onClick={() => load(nextCursor)}
          className="mt-4 w-full rounded-lg bg-white py-2 text-sm text-blue-500 shadow-sm"
        >
          Загрузить ещё
        </button>
      )}
    </div>
  );
}
