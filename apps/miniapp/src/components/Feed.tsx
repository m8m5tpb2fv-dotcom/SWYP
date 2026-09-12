import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import VideoCard from "./VideoCard";
import VideoActionBar from "./VideoActionBar";
import TopNav from "./TopNav";
import CommentsSheet from "./CommentsSheet";
import ReportSheet from "./ReportSheet";
import { fetchFeed, type FeedItem } from "../lib/feed";
import { useVideoInteractions } from "../lib/useVideoInteractions";
import { sendImpression, sendWatch } from "../lib/events";

// Swipe-right-to-own-profile thresholds: predominantly horizontal (vertical
// drift under half the horizontal distance, so it doesn't fire during the
// normal vertical snap-scroll), far enough to be deliberate, fast enough
// that a slow drag/scroll doesn't accidentally qualify.
const SWIPE_MIN_DISTANCE_PX = 60;
const SWIPE_MAX_DURATION_MS = 600;

interface Props {
  currentUserId: string;
  onOpenProfile: (userId: string) => void;
  onOpenSearch: () => void;
  onOpenUpload: () => void;
  onOpenOwnProfile: () => void;
  // Video opened via a t.me share deep link (App.tsx resolves start_param
  // before Feed ever mounts) — pinned to the front of the first page so the
  // recipient lands on it and can immediately keep swiping the real feed,
  // instead of a separate single-video screen blocking further scrolling.
  initialVideo?: FeedItem | null;
  // Feed stays mounted underneath every overlay (profile, search, upload) —
  // it has no way of knowing it's covered otherwise, so its video would keep
  // playing (and making noise) behind whatever's on top of it, including a
  // second video played from the profile screen. false pauses playback and
  // stops counting watch time without losing scroll position or activeId,
  // so it picks back up right where it left off when the overlay closes.
  isForeground: boolean;
}

export default function Feed({
  currentUserId,
  onOpenProfile,
  onOpenSearch,
  onOpenUpload,
  onOpenOwnProfile,
  initialVideo,
  isForeground,
}: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [commentsForId, setCommentsForId] = useState<string | null>(null);
  const [reportForId, setReportForId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(new Map<string, HTMLDivElement>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const nextCursorRef = useRef<string | null>(null);
  const fetchingRef = useRef(false);
  const watchStartRef = useRef<{ id: string; start: number } | null>(null);
  const impressedRef = useRef(new Set<string>());
  const itemsRef = useRef<FeedItem[]>([]);
  itemsRef.current = items;

  const loadPage = useCallback(async (cursor?: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading((prev) => prev && !cursor);
    try {
      const page = await fetchFeed({ cursor });
      let pageItems = page.items;
      if (!cursor && initialVideo) {
        pageItems = [initialVideo, ...pageItems.filter((i) => i.id !== initialVideo.id)];
      }
      setItems((prev) => (cursor ? [...prev, ...pageItems] : pageItems));
      nextCursorRef.current = page.next_cursor;
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [initialVideo]);

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

  // ТЗ раздел 21: video_impression once per video per session, video_watch when
  // scrolling away — feeds the recommendation score (раздел 5) via the analytics worker.
  useEffect(() => {
    const prev = watchStartRef.current;
    if (prev) {
      const watchSeconds = (Date.now() - prev.start) / 1000;
      if (watchSeconds >= 0.5) {
        const video = itemsRef.current.find((i) => i.id === prev.id);
        const completed = video?.duration ? watchSeconds >= video.duration * 0.9 : false;
        sendWatch(prev.id, watchSeconds, completed);
      }
    }

    if (activeId && isForeground) {
      watchStartRef.current = { id: activeId, start: Date.now() };
      if (!impressedRef.current.has(activeId)) {
        impressedRef.current.add(activeId);
        sendImpression(activeId);
      }
    } else {
      watchStartRef.current = null;
    }
  }, [activeId, isForeground]);

  useEffect(() => {
    return () => {
      const prev = watchStartRef.current;
      if (prev) {
        const watchSeconds = (Date.now() - prev.start) / 1000;
        if (watchSeconds >= 0.5) sendWatch(prev.id, watchSeconds, false);
      }
    };
  }, []);

  const { handleToggleLike, handleShare } = useVideoInteractions(setItems);

  const handleOpenAuthor = useCallback(
    (item: FeedItem) => {
      onOpenProfile(item.author.id);
    },
    [onOpenProfile],
  );

  const handleCommentCountChange = useCallback((videoId: string, delta: number) => {
    setItems((prev) => prev.map((v) => (v.id === videoId ? { ...v, commentsCount: v.commentsCount + delta } : v)));
  }, []);

  // Own-profile access needs to work even with an empty/loading feed (no
  // VideoActionBar to hold its icon then) — a plain right swipe anywhere on
  // this screen opens it, on top of the icon already in the action bar.
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback(
    (e: ReactTouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      const deltaX = t.clientX - start.x;
      const deltaY = t.clientY - start.y;
      const elapsed = Date.now() - start.time;
      if (
        deltaX > SWIPE_MIN_DISTANCE_PX &&
        Math.abs(deltaY) < deltaX * 0.5 &&
        elapsed < SWIPE_MAX_DURATION_MS
      ) {
        onOpenOwnProfile();
      }
    },
    [onOpenOwnProfile],
  );

  const activeIndex = items.findIndex((i) => i.id === activeId);
  const activeItem = activeIndex !== -1 ? items[activeIndex] : null;

  return (
    <div className="relative h-full w-full" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {loading && (
        <div className="flex h-full w-full items-center justify-center text-sm text-white/60">Загрузка ленты…</div>
      )}

      {!loading && error && items.length === 0 && (
        <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex h-full w-full items-center justify-center text-sm text-white/60">Пока нет видео</div>
      )}

      {!loading && items.length > 0 && (
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
                active={item.id === activeId && isForeground}
                preload={distance <= 1 ? "auto" : "metadata"}
                muted={muted}
                onOpenAuthor={handleOpenAuthor}
                onDoubleTapLike={handleToggleLike}
                registerNode={(node) => setNodeRef(item.id, node)}
              />
            );
          })}
        </div>
      )}

      <TopNav onSearch={onOpenSearch} onUpload={onOpenUpload} />

      {activeItem && !commentsForId && !reportForId && (
        <VideoActionBar
          item={activeItem}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onToggleLike={handleToggleLike}
          onOpenComments={(v) => setCommentsForId(v.id)}
          onShare={handleShare}
          onReport={(v) => setReportForId(v.id)}
          onOpenOwnProfile={onOpenOwnProfile}
        />
      )}

      {commentsForId && (
        <CommentsSheet
          videoId={commentsForId}
          currentUserId={currentUserId}
          onClose={() => setCommentsForId(null)}
          onCountChange={(delta) => handleCommentCountChange(commentsForId, delta)}
        />
      )}

      {reportForId && <ReportSheet videoId={reportForId} onClose={() => setReportForId(null)} />}
    </div>
  );
}
