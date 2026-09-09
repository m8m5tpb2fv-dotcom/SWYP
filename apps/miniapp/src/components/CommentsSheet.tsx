import { useEffect, useRef, useState, type FormEvent } from "react";
import { fetchComments, postComment, deleteComment, type CommentItem } from "../lib/comments";

interface Props {
  videoId: string;
  currentUserId: string;
  onClose: () => void;
  onCountChange: (delta: number) => void;
}

export default function CommentsSheet({ videoId, currentUserId, onClose, onCountChange }: Props) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const nextCursorRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchComments(videoId)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        nextCursorRef.current = page.next_cursor;
        setHasMore(page.next_cursor !== null);
      })
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const handleLoadMore = () => {
    if (!nextCursorRef.current) return;
    fetchComments(videoId, nextCursorRef.current).then((page) => {
      setItems((prev) => [...prev, ...page.items]);
      nextCursorRef.current = page.next_cursor;
      setHasMore(page.next_cursor !== null);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    try {
      const comment = await postComment(videoId, trimmed);
      setItems((prev) => [comment, ...prev]);
      setText("");
      onCountChange(1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((c) => c.id !== id));
    onCountChange(-1);
    try {
      await deleteComment(id);
    } catch {
      // best-effort — the comment stays removed locally even if the request failed
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[70%] flex-col rounded-t-2xl bg-white text-black">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Комментарии</span>
          <button type="button" onClick={onClose} className="text-sm text-gray-500">
            Закрыть
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading && <p className="py-4 text-center text-sm text-gray-400">Загрузка…</p>}
          {error && <p className="py-4 text-center text-sm text-red-500">{error}</p>}
          {!loading && items.length === 0 && !error && (
            <p className="py-4 text-center text-sm text-gray-400">Пока нет комментариев</p>
          )}
          {items.map((comment) => (
            <div key={comment.id} className="border-b py-3 last:border-none">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {comment.author.username ?? comment.author.firstName ?? "Пользователь"}
                  </p>
                  <p className="mt-0.5 text-sm">{comment.text}</p>
                  {comment.repliesCount > 0 && (
                    <p className="mt-1 text-xs text-gray-400">{comment.repliesCount} ответ(ов)</p>
                  )}
                </div>
                {comment.author.id === currentUserId && (
                  <button type="button" onClick={() => handleDelete(comment.id)} className="text-xs text-gray-400">
                    Удалить
                  </button>
                )}
              </div>
            </div>
          ))}
          {hasMore && (
            <button type="button" onClick={handleLoadMore} className="w-full py-2 text-center text-xs text-blue-500">
              Загрузить ещё
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t px-4 py-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Написать комментарий…"
            className="flex-1 rounded-full border px-3 py-2 text-sm"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={posting || !text.trim()}
            className="text-sm font-semibold text-blue-500 disabled:text-gray-300"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
