import { useEffect, useRef, useState, type FormEvent } from "react";
import { UserRound, Send } from "lucide-react";
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
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-[75%] flex-col rounded-t-2xl bg-[#161616] text-white">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20" />

        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="text-sm font-semibold">Комментарии</span>
          <button type="button" onClick={onClose} className="text-sm text-white/50">
            Закрыть
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading && <p className="py-4 text-center text-sm text-white/40">Загрузка…</p>}
          {error && <p className="py-4 text-center text-sm text-red-400">{error}</p>}
          {!loading && items.length === 0 && !error && (
            <p className="py-8 text-center text-sm text-white/40">
              Пока нет комментариев.
              <br />
              Будь первым!
            </p>
          )}
          {items.map((comment) => {
            const authorLabel = comment.author.username ?? comment.author.firstName ?? "Пользователь";
            return (
              <div key={comment.id} className="flex items-start gap-3 border-b border-white/5 py-3 last:border-none">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                  {comment.author.avatarUrl ? (
                    <img src={comment.author.avatarUrl} alt={authorLabel} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound size={16} strokeWidth={2} className="text-white/60" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white/60">{authorLabel}</p>
                    {comment.author.id === currentUserId && (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        className="shrink-0 text-xs text-white/30"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 break-words text-sm">{comment.text}</p>
                  {comment.repliesCount > 0 && (
                    <p className="mt-1 text-xs text-white/40">{comment.repliesCount} ответ(ов)</p>
                  )}
                </div>
              </div>
            );
          })}
          {hasMore && (
            <button type="button" onClick={handleLoadMore} className="w-full py-3 text-center text-xs text-blue-400">
              Загрузить ещё
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex shrink-0 items-center gap-2 border-t border-white/10 px-3 pt-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Написать комментарий…"
            className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={posting || !text.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white disabled:bg-white/10 disabled:text-white/30"
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}
