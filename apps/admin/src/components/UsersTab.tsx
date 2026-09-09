import { useEffect, useState } from "react";
import { fetchUsers, banUser, unbanUser, type AdminUser } from "../lib/admin";

export default function UsersTab() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (cursor?: string) => {
    if (!cursor) setLoading(true);
    fetchUsers(cursor)
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
  }, []);

  const handleToggleBan = async (user: AdminUser) => {
    const result = user.isBanned ? await unbanUser(user.id) : await banUser(user.id);
    setItems((prev) => prev.map((u) => (u.id === user.id ? { ...u, isBanned: result.isBanned } : u)));
  };

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-gray-400">Загрузка…</p>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="px-4 py-2">Пользователь</th>
              <th className="px-4 py-2">Telegram ID</th>
              <th className="px-4 py-2">Видео</th>
              <th className="px-4 py-2">Статус</th>
              <th className="px-4 py-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b last:border-none">
                <td className="px-4 py-2">@{u.username ?? u.firstName ?? "—"}</td>
                <td className="px-4 py-2 text-gray-400">{u.telegramId}</td>
                <td className="px-4 py-2">{u.videosCount}</td>
                <td className="px-4 py-2">
                  {u.isBanned ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">забанен</span>
                  ) : (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600">активен</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => handleToggleBan(u)}
                    className={`text-xs ${u.isBanned ? "text-green-600" : "text-red-500"}`}
                  >
                    {u.isBanned ? "Разбанить" : "Забанить"}
                  </button>
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
