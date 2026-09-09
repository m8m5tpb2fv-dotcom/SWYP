import { useCallback, useEffect, useRef, useState } from "react";
import WebApp from "@twa-dev/sdk";
import VideoCard from "./VideoCard";
import CommentsSheet from "./CommentsSheet";
import { fetchFeed, likeVideo, unlikeVideo, type FeedItem } from "../lib/feed";

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? "SWYP_bot";

interface Props {
  currentUserId: string;
  onOpenProfile: (userId: string) => void;
}

export default function Feed({ currentUserId, onOpenProfile }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [commentsForId, setCommentsForId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(new Map<string, HTMLDivElement>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const nextCursorRef = useRef<string | null>(null);
  const fetchingRef = useRef(false);

  const loadPage = useCallback(async (cursor?: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading((prev) => prev && !cursor);
    try {
      const page = await fetchFeed({ cursor });
      setItems((prev) => (cursor ? [...prev, ...page.items] : page.items));
      nextCursorRef.current = page.next_cursor;
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const setNodeRef = useCallback((id: string, node: HTMLDivElement | null) => {
    const prev = nodesRef.current.get(id);
    if (prev && observerRef.current) observerRef.current.unobserve(prev);
    if (node) {
      nodesRef.current.set(id, node);
      observerRef.current?.observe(node);
    } else {
      nodesRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null;
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.videoId;
          if (!id || !entry.isIntersecting) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { id, ratio: entry.intersectionRatio };
          }
        }
        if (best) setActiveId(best.id);
      },
      { root: containerRef.current, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    observerRef.current = observer;
    nodesRef.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activeId && items.length > 0) {
      setActiveId(items[0].id);
    }
  }, [items, activeId]);

  useEffect(() => {
    if (!activeId) return;
    const index = items.findIndex((i) => i.id === activeId);
    if (index !== -1 && index >= items.length - 2 && nextCursorRef.current) {
      loadPage(nextCursorRef.current);
    }
  }, [activeId, items, loadPage]);

  const handleToggleLike = useCallback((item: FeedItem) => {
    const wasLiked = item.isLiked;
    setItems((prev) =>
      prev.map((v) =>
        v.id === item.id
          ? { ...v, isLiked: !wasLiked, likesCount: v.likesCount + (wasLiked ? -1 : 1) }
          : v,
      ),
    );

    const request = wasLiked ? unlikeVideo(item.id) : likeVideo(item.id);
    request
      .then((result) => {
        setItems((prev) =>
          prev.map((v) => (v.id === item.id ? { ...v, isLiked: result.liked, likesCount: result.likesCount } : v)),
        );
      })
      .catch(() => {
        setItems((prev) =>
          prev.map((v) => (v.id === item.id ? { ...v, isLiked: wasLiked, likesCount: item.likesCount } : v)),
        );
      });
  }, []);

  const handleOpenAuthor = useCallback(
    (item: FeedItem) => {
      onOpenProfile(item.author.id);
    },
    [onOpenProfile],
  );

  const handleShare = useCallback((item: FeedItem) => {
    const deepLink = `https://t.me/${BOT_USERNAME}/app?startapp=video_${item.id}`;
    const text = item.title ? `🔥 Посмотри этот Short: ${item.title}` : "🔥 Посмотри этот Short";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`;
    WebApp.openTelegramLink(shareUrl);
  }, []);

  const handleCommentCountChange = useCallback((videoId: string, delta: number) => {
    setItems((prev) => prev.map((v) => (v.id === videoId ? { ...v, commentsCount: v.commentsCount + delta } : v)));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
        Загрузка ленты…
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
        Пока нет видео
      </div>
    );
  }

  const activeIndex = items.findIndex((i) => i.id === activeId);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-scroll"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item, index) => {
          const distance = Math.abs(index - (activeIndex === -1 ? 0 : activeIndex));
          return (
            <VideoCard
              key={item.id}
              item={item}
              active={item.id === activeId}
              preload={distance <= 1 ? "auto" : "metadata"}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onToggleLike={handleToggleLike}
              onOpenAuthor={handleOpenAuthor}
              onOpenComments={(v) => setCommentsForId(v.id)}
              onShare={handleShare}
              registerNode={(node) => setNodeRef(item.id, node)}
            />
          );
        })}
      </div>

      {commentsForId && (
        <CommentsSheet
          videoId={commentsForId}
          currentUserId={currentUserId}
          onClose={() => setCommentsForId(null)}
          onCountChange={(delta) => handleCommentCountChange(commentsForId, delta)}
        />
      )}
    </div>
  );
}
