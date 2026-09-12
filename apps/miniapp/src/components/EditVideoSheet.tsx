import { useState } from "react";
import { updateVideo } from "../lib/upload";
import { CATEGORIES } from "../lib/categories";
import type { FeedItem } from "../lib/feed";

interface Props {
  video: FeedItem;
  onClose: () => void;
  onSaved: (patch: { title: string | null; description: string | null; category: string | null; hashtags: string[] }) => void;
}

export default function EditVideoSheet({ video, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(video.title ?? "");
  const [description, setDescription] = useState(video.description ?? "");
  const [hashtags, setHashtags] = useState(video.hashtags.join(" "));
  const [category, setCategory] = useState(video.category ?? CATEGORIES[0].value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await updateVideo(video.id, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        category,
        hashtags: hashtags
          .split(/[\s,#]+/)
          .map((h) => h.trim())
          .filter(Boolean),
      });
      onSaved(result);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85%] flex-col overflow-y-auto rounded-t-2xl bg-white text-black">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Редактировать Short</span>
          <button type="button" onClick={onClose} className="text-sm text-gray-500">
            Отмена
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-base outline-none focus:border-blue-400"
            maxLength={200}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание"
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-base outline-none focus:border-blue-400"
            maxLength={2000}
          />
          <input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#хэштеги через пробел"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-base outline-none focus:border-blue-400"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-base outline-none focus:border-blue-400"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
