import { useEffect, useState } from "react";
import { fetchVideos, blockVideo, restoreVideo, deleteVideo, type AdminVideo } from "../lib/admin";

const STATUSES = ["", "draft", "processing", "pending", "published", "rejected", "blocked", "deleted"];

export default function VideosTab() {
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<AdminVideo[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (cursor?: string) => {
    if (!cursor) setLoading(true);
    fetchVideos(status || undefined, cursor)
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

  const updateItem = (id: string, patch: Partial<AdminVideo>) => {
    setItems((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const handleBlock = async (id: string) => {
    const res = await blockVideo(id);
    updateItem(id, { status: res.status });
  };

  const handleRestore = async (id: string) => {
    const res = await restoreVideo(id);
    updateItem(id, { status: res.status });
  };

  const handleDelete = async (id: string) => {
    await deleteVideo(id);
    updateItem(id, { status: "deleted" });
  };

  return (
    <div>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="mb-4 rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s || "Все статусы"}
          </option>
        ))}
      </select>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-gray-400">Загрузка…</p>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="px-4 py-2">Видео</th>
              <th className="px-4 py-2">Автор</th>
              <th className="px-4 py-2">Статус</th>
              <th className="px-4 py-2">Просмотры</th>
              <th className="px-4 py-2">Лайки</th>
              <th className="px-4 py-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} className="border-b last:border-none">
                <td className="px-4 py-2">{v.title ?? "Без названия"}</td>
                <td className="px-4 py-2">@{v.author.username ?? v.author.firstName}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{v.status}</span>
                </td>
                <td className="px-4 py-2">{v.viewsCount}</td>
                <td className="px-4 py-2">{v.likesCount}</td>
                <td className="space-x-2 px-4 py-2">
                  {v.status === "published" && (
                    <button type="button" onClick={() => handleBlock(v.id)} className="text-xs text-red-500">
                      Заблокировать
                    </button>
                  )}
                  {(v.status === "blocked" || v.status === "rejected") && (
                    <button type="button" onClick={() => handleRestore(v.id)} className="text-xs text-green-600">
                      Восстановить
                    </button>
                  )}
                  {v.status !== "deleted" && (
                    <button type="button" onClick={() => handleDelete(v.id)} className="text-xs text-gray-500">
                      Удалить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
