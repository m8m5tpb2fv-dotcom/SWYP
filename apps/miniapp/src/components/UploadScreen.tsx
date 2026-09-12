import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { requestUploadUrl, uploadFileToStorage, publishVideo, getVideoStatus } from "../lib/upload";
import { CATEGORIES } from "../lib/categories";

interface Props {
  onClose: () => void;
  onPublished: () => void;
}

type Stage =
  | { kind: "pick" }
  | { kind: "uploading"; progress: number }
  | { kind: "form"; videoId: string }
  | { kind: "publishing"; videoId: string }
  | { kind: "processing"; videoId: string }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function UploadScreen({ onClose, onPublished }: Props) {
  const [stage, setStage] = useState<Stage>({ kind: "pick" });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [hashtags, setHashtags] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStage({ kind: "uploading", progress: 0 });
    try {
      const contentType = file.type || "video/mp4";
      const { videoId, uploadUrl } = await requestUploadUrl(contentType);
      await uploadFileToStorage(uploadUrl, file, contentType, (fraction) =>
        setStage({ kind: "uploading", progress: fraction }),
      );
      setStage({ kind: "form", videoId });
    } catch (err) {
      setStage({ kind: "error", message: (err as Error).message });
    }
  };

  const handlePublish = async () => {
    if (stage.kind !== "form") return;
    const { videoId } = stage;
    setStage({ kind: "publishing", videoId });
    try {
      await publishVideo(videoId, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        category,
        hashtags: hashtags
          .split(/[\s,#]+/)
          .map((h) => h.trim())
          .filter(Boolean),
      });
      setStage({ kind: "processing", videoId });
      pollRef.current = setInterval(async () => {
        try {
          const status = await getVideoStatus(videoId);
          if (status.status === "published") {
            if (pollRef.current) clearInterval(pollRef.current);
            setStage({ kind: "done" });
          } else if (status.status === "rejected") {
            if (pollRef.current) clearInterval(pollRef.current);
            setStage({ kind: "error", message: "Не удалось обработать видео" });
          }
        } catch {
          // transient network error — keep polling rather than aborting
        }
      }, 2000);
    } catch (err) {
      setStage({ kind: "error", message: (err as Error).message });
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-black text-white">
      <div
        className="flex items-center justify-between border-b border-white/10 px-4 pb-3"
        style={{ paddingTop: "calc(var(--tg-safe-top, 0px) + 0.75rem)" }}
      >
        <span className="text-sm font-semibold">Создать Short</span>
        <button type="button" onClick={onClose} className="text-sm text-white/60">
          Закрыть
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 py-6">
        {stage.kind === "pick" && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/30 px-8 py-10">
            <span className="text-3xl">＋</span>
            <span className="text-sm text-white/70">Выбрать видео</span>
            <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={handleFileChange} />
          </label>
        )}

        {stage.kind === "uploading" && (
          <div className="w-full max-w-xs space-y-2">
            <p className="text-center text-sm text-white/70">
              Загрузка видео… {Math.round(stage.progress * 100)}%
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-blue-500 transition-[width]"
                style={{ width: `${Math.round(stage.progress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {stage.kind === "form" && (
          <div className="w-full space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название"
              className="w-full rounded-lg bg-white/10 px-3 py-2 text-base placeholder:text-white/40"
              maxLength={200}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание"
              className="w-full rounded-lg bg-white/10 px-3 py-2 text-base placeholder:text-white/40"
              rows={2}
              maxLength={2000}
            />
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#хэштеги через пробел"
              className="w-full rounded-lg bg-white/10 px-3 py-2 text-base placeholder:text-white/40"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg bg-white/10 px-3 py-2 text-base"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="text-black">
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handlePublish}
              className="w-full rounded-lg bg-blue-500 py-2 text-sm font-semibold"
            >
              Опубликовать
            </button>
          </div>
        )}

        {stage.kind === "publishing" && <p className="text-sm text-white/70">Публикация…</p>}
        {stage.kind === "processing" && <p className="text-sm text-white/70">Обработка видео…</p>}
        {stage.kind === "done" && (
          <>
            <p className="text-sm text-white">Готово! 🎉</p>
            <button
              type="button"
              onClick={onPublished}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold"
            >
              К ленте
            </button>
          </>
        )}
        {stage.kind === "error" && <p className="text-center text-sm text-red-400">{stage.message}</p>}
      </div>
    </div>
  );
}
