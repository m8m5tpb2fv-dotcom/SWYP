import { useEffect, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { Eye, Heart, Play, UserRound } from "lucide-react";
import type { FeedItem } from "../lib/feed";
import { formatCount } from "../lib/format";

interface Props {
  item: FeedItem;
  active: boolean;
  preload: "auto" | "metadata" | "none";
  muted: boolean;
  onOpenAuthor: (item: FeedItem) => void;
  // Double-tap-to-like (TikTok/Instagram-style) — always likes, never
  // unlikes, so a double tap on an already-liked video just replays the
  // heart animation without calling the API again.
  onDoubleTapLike?: (item: FeedItem) => void;
  registerNode: (node: HTMLDivElement | null) => void;
}

const DOUBLE_TAP_WINDOW_MS = 300;
// A vertical swipe to the next video starts with a touchstart on this same
// <video> — some mobile WebViews still fire a synthetic click afterward
// despite the finger having moved well past what any tap gesture would,
// which was toggling playback (and flashing the pause icon) mid-swipe.
// Anything past this distance is a scroll, not a tap.
const TAP_MOVE_THRESHOLD_PX = 12;

// Playback + caption only — likes/comments/share/mute/report live in
// VideoActionBar, the floating bottom bar rendered alongside this card.
export default function VideoCard({
  item,
  active,
  preload,
  muted,
  onOpenAuthor,
  onDoubleTapLike,
  registerNode,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Tracks the <video>'s actual paused state (via its own play/pause events,
  // not just the tap handler) so the overlay icon also shows up correctly
  // when playback is blocked by autoplay policy or paused by the active-card
  // effect below — not only on a manual tap.
  const [paused, setPaused] = useState(true);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [likeAnimKey, setLikeAnimKey] = useState(0);
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedPastThresholdRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.play().catch(() => {
        // autoplay can be blocked until the first user gesture — tapping the video recovers it
      });
    } else {
      video.pause();
    }
  }, [active]);

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current !== null) window.clearTimeout(tapTimeoutRef.current);
    };
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleVideoTouchStart = (e: ReactTouchEvent<HTMLVideoElement>) => {
    const t = e.touches[0];
    touchStartPosRef.current = { x: t.clientX, y: t.clientY };
    touchMovedPastThresholdRef.current = false;
  };

  const handleVideoTouchMove = (e: ReactTouchEvent<HTMLVideoElement>) => {
    const start = touchStartPosRef.current;
    if (!start) return;
    const t = e.touches[0];
    const distance = Math.hypot(t.clientX - start.x, t.clientY - start.y);
    if (distance > TAP_MOVE_THRESHOLD_PX) touchMovedPastThresholdRef.current = true;
  };

  const handleTap = () => {
    // The finger moved — this click is the browser's aftermath of a swipe
    // to scroll, not a real tap, so don't toggle playback or count it
    // toward a double-tap-to-like.
    if (touchMovedPastThresholdRef.current) {
      touchMovedPastThresholdRef.current = false;
      return;
    }

    const now = Date.now();
    const sinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    if (sinceLastTap < DOUBLE_TAP_WINDOW_MS) {
      // Second tap of a double tap — cancel the single-tap's pending
      // play/pause toggle so it doesn't also fire, and like instead.
      if (tapTimeoutRef.current !== null) {
        window.clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;
      setLikeAnimKey((k) => k + 1);
      setShowLikeAnim(true);
      if (!item.isLiked) onDoubleTapLike?.(item);
      return;
    }

    tapTimeoutRef.current = window.setTimeout(() => {
      togglePlayPause();
      tapTimeoutRef.current = null;
    }, DOUBLE_TAP_WINDOW_MS);
  };

  const authorLabel = item.author.username ?? item.author.firstName ?? "автор";

  return (
    <div
      ref={registerNode}
      data-video-id={item.id}
      className="relative h-full w-full shrink-0 snap-start bg-black"
    >
      <video
        ref={videoRef}
        src={item.videoUrl ?? undefined}
        poster={item.thumbnailUrl ?? undefined}
        className="h-full w-full object-contain"
        playsInline
        loop
        muted={muted}
        preload={preload}
        onClick={handleTap}
        onTouchStart={handleVideoTouchStart}
        onTouchMove={handleVideoTouchMove}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />

      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          paused ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2AABEE] shadow-xl">
          <Play size={28} strokeWidth={0} fill="white" />
        </div>
      </div>

      {showLikeAnim && (
        <div key={likeAnimKey} className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Heart
            size={120}
            strokeWidth={0}
            fill="#2AABEE"
            className="animate-like-pop drop-shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
            onAnimationEnd={() => setShowLikeAnim(false)}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-transparent to-black/10">
        <div className="pointer-events-auto p-4 pb-28" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}>
          <div className="min-w-0 max-w-[75%] text-white">
            <button type="button" onClick={() => onOpenAuthor(item)} className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                {item.author.avatarUrl ? (
                  <img src={item.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={13} strokeWidth={2} />
                )}
              </div>
              <span className="text-sm font-semibold">@{authorLabel}</span>
            </button>
            {item.title && <p className="mt-1 line-clamp-2 text-sm">{item.title}</p>}
            {item.hashtags.length > 0 && (
              <p className="mt-1 text-xs text-white/70">{item.hashtags.map((h) => `#${h}`).join(" ")}</p>
            )}
            <div className="mt-1.5 flex items-center gap-1 text-xs text-white/60">
              <Eye size={13} strokeWidth={2} />
              <span>{formatCount(item.viewsCount)} просмотров</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
