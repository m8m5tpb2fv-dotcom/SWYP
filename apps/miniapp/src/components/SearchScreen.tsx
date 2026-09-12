import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { search, type SearchResults } from "../lib/search";

interface Props {
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

export default function SearchScreen({ onClose, onOpenProfile }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against an earlier, slower query's response overwriting a later
  // one's results — e.g. typing "cat" then quickly "dog", where "cat"'s
  // network round trip happens to finish after "dog"'s.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      const requestId = ++requestIdRef.current;
      search(trimmed)
        .then((r) => {
          if (requestIdRef.current === requestId) setResults(r);
        })
        .catch(() => {
          if (requestIdRef.current === requestId) setResults({ videos: [], users: [], hashtags: [] });
        })
        .finally(() => {
          if (requestIdRef.current === requestId) setLoading(false);
        });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const hasQuery = query.trim().length > 0;
  const isEmpty = results && results.users.length === 0 && results.videos.length === 0 && results.hashtags.length === 0;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-black text-white">
      <div
        className="flex items-center gap-2 border-b border-white/10 px-4 pb-3"
        style={{ paddingTop: "calc(var(--tg-safe-top, 0px) + 0.75rem)" }}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск пользователей, Shorts, #хэштегов"
          className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-base placeholder:text-white/40"
        />
        <button type="button" onClick={onClose} className="text-sm text-white/60">
          Закрыть
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && <p className="py-4 text-center text-sm text-white/40">Поиск…</p>}

        {!loading && hasQuery && results && (
          <>
            {results.users.length > 0 && (
              <section className="mb-4">
                <h3 className="mb-2 text-xs font-semibold uppercase text-white/40">Пользователи</h3>
                <div className="space-y-2">
                  {results.users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => onOpenProfile(u.id)}
                      className="flex w-full items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-left"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <UserRound size={18} strokeWidth={2} className="text-white/60" />
                        )}
                      </div>
                      <span className="text-sm">@{u.username ?? u.firstName ?? "пользователь"}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {results.videos.length > 0 && (
              <section className="mb-4">
                <h3 className="mb-2 text-xs font-semibold uppercase text-white/40">Shorts</h3>
                <div className="space-y-2">
                  {results.videos.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onOpenProfile(v.author.id)}
                      className="flex w-full items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-left"
                    >
                      <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-white/10">
                        {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{v.title ?? "Без названия"}</p>
                        <p className="text-xs text-white/40">@{v.author.username ?? v.author.firstName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {results.hashtags.length > 0 && (
              <section className="mb-4">
                <h3 className="mb-2 text-xs font-semibold uppercase text-white/40">Хэштеги</h3>
                <div className="flex flex-wrap gap-2">
                  {results.hashtags.map((h) => (
                    <button
                      key={h.tag}
                      type="button"
                      onClick={() => setQuery(h.tag)}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs"
                    >
                      #{h.tag} · {h.count}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {isEmpty && <p className="py-6 text-center text-sm text-white/40">Ничего не найдено</p>}
          </>
        )}
      </div>
    </div>
  );
}
