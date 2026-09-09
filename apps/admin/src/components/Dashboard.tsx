import { useEffect, useState } from "react";
import { fetchStats, type Stats } from "../lib/admin";

const TILES: { key: keyof Stats; label: string }[] = [
  { key: "usersCount", label: "Пользователи" },
  { key: "videosCount", label: "Видео (всего)" },
  { key: "publishedVideosCount", label: "Опубликовано" },
  { key: "viewsSum", label: "Просмотры" },
  { key: "likesSum", label: "Лайки" },
  { key: "openReportsCount", label: "Открытых жалоб" },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((err) => setError((err as Error).message));
  }, []);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!stats) return <p className="text-sm text-gray-400">Загрузка…</p>;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {TILES.map((tile) => (
        <div key={tile.key} className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-semibold text-gray-900">{stats[tile.key]}</p>
          <p className="mt-1 text-sm text-gray-500">{tile.label}</p>
        </div>
      ))}
    </div>
  );
}
