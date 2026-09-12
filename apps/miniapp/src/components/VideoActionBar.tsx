import { useEffect, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import WebApp from "@twa-dev/sdk";
import { MessageCircle, Heart, Link2, Volume2, VolumeX, Flag, UserRound, Download } from "lucide-react";
import type { FeedItem } from "../lib/feed";
import { hapticLight, hapticSelection } from "../lib/haptics";

const GIFT_LONG_PRESS_MS = 500;
// A press that drags past this distance is a gesture starting on the like
// button (e.g. the very start of a swipe), not a deliberate hold — same
// threshold idea as VideoCard's own tap-vs-swipe disambiguation.
const LIKE_PRESS_MOVE_THRESHOLD_PX = 10;

interface Props {
  item: FeedItem;
  currentUserId: string;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLike: (item: FeedItem) => void;
  onOpenComments: (item: FeedItem) => void;
  onShare: (item: FeedItem) => void;
  onReport: (item: FeedItem) => void;
  onOpenOwnProfile?: () => void;
  // Long-press the like button -> buy the author a real Telegram Gift.
  // Omitted (or the video is the viewer's own) disables the long-press —
  // gifting yourself makes no sense.
  onOpenGift?: (item: FeedItem) => void;
}

// Order: comments, share, download, like (elevated focal action), own
// profile, mute, report — per explicit spec. Search/upload aren't part of
// this row at all — they're TopNav's fixed corner buttons, rendered by the
// screen itself so they stay reachable even when there's no active video.
export default function VideoActionBar({
  item,
  currentUserId,
  muted,
  onToggleMute,
  onToggleLike,
  onOpenComments,
  onShare,
  onReport,
  onOpenOwnProfile,
  onOpenGift,
}: Props) {
  const handleDownload = () => {
    if (!item.videoUrl) return;
    // Native Telegram download flow (Bot API 8.0+) — the client handles the
    // save-to-device prompt/progress itself. Older clients ignore the call
    // silently, so there's nothing to fall back to from inside the WebView.
    WebApp.downloadFile({ url: item.videoUrl, file_name: `SWYP-${item.id}.mp4` });
  };

  const canGift = Boolean(onOpenGift) && item.author.id !== currentUserId;
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const likePressStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Pops the heart + count on a like (not on unlike, and not on the initial
  // mount of an already-liked video) — mirrors the double-tap heart's own
  // "replay via key change" trick in VideoCard.
  const wasLikedRef = useRef(item.isLiked);
  const [likePulse, setLikePulse] = useState(0);
  useEffect(() => {
    if (item.isLiked && !wasLikedRef.current) {
      setLikePulse((k) => k + 1);
    }
    wasLikedRef.current = item.isLiked;
  }, [item.isLiked]);

  const handleLikePressStart = (e: ReactTouchEvent<HTMLButtonElement>) => {
    if (!canGift) return;
    longPressFiredRef.current = false;
    const t = e.touches[0];
    likePressStartPosRef.current = { x: t.clientX, y: t.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      onOpenGift?.(item);
    }, GIFT_LONG_PRESS_MS);
  };

  const cancelLikePress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Without this, pressing down on the like button and dragging away without
  // lifting (e.g. a swipe gesture that happens to start on it) still fired
  // the long-press timer — only touchend/touchcancel cancelled it before.
  const handleLikePressMove = (e: ReactTouchEvent<HTMLButtonElement>) => {
    const start = likePressStartPosRef.current;
    if (!start) return;
    const t = e.touches[0];
    const distance = Math.hypot(t.clientX - start.x, t.clientY - start.y);
    if (distance > LIKE_PRESS_MOVE_THRESHOLD_PX) cancelLikePress();
  };

  const handleLikeClick = () => {
    // The long-press already opened the gift sheet — the click that follows
    // releasing the hold shouldn't also toggle the like.
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    hapticLight();
    onToggleLike(item);
  };

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-2"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {/* Every plain control sits in the same fixed h-11 w-11 slot — uniform
          size, no per-icon variation — so the row reads as consistent
          except for Like, which stays the deliberately bigger, elevated
          focal point. min-w-0 lets the row shrink below its content's
          natural width (flex items default to min-width:auto, which would
          otherwise force it wider than the screen on narrow devices);
          overflow-x-auto turns that into a horizontal scroll instead of
          clipping off-screen. */}
      <div className="pointer-events-auto flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/25 px-2 py-2.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => onOpenComments(item)}
          className="tap-scale relative flex h-11 w-11 shrink-0 items-center justify-center text-white"
        >
          {/* The count sits centered on top of the bubble glyph itself
              (not below it as a caption) — a bigger, thinner-stroke icon
              leaves room in the middle for the number to read clearly. */}
          <MessageCircle size={34} strokeWidth={1.5} />
          <span className="absolute text-[10px] font-semibold leading-none">{item.commentsCount}</span>
        </button>

        <button
          type="button"
          onClick={() => onShare(item)}
          className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center text-white"
        >
          <Link2 size={20} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center text-white"
        >
          <Download size={20} strokeWidth={2} />
        </button>

        {/* Always blue — liked state shows as a filled (vs outline) heart
            rather than a color change, since the design calls for the
            button itself to stay blue. Count sits inside the same round
            badge as the heart rather than as a separate label below it.
            Deliberately bigger than every other control — the focal action.
            No manual vertical offset: items-center on the row already
            centers the taller button symmetrically (bulging evenly above
            and below the pill) — an extra negative margin here previously
            pushed it up unevenly instead. */}
        <button
          type="button"
          onClick={handleLikeClick}
          onTouchStart={handleLikePressStart}
          onTouchMove={handleLikePressMove}
          onTouchEnd={cancelLikePress}
          onTouchCancel={cancelLikePress}
          className="tap-scale flex w-16 shrink-0 items-center justify-center"
        >
          <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full border border-white/25 bg-white/10 shadow-lg backdrop-blur-xl">
            <Heart
              key={likePulse}
              size={24}
              strokeWidth={2}
              fill={item.isLiked ? "white" : "none"}
              className={`text-white ${likePulse > 0 ? "animate-pop" : ""}`}
            />
            <span key={`count-${likePulse}`} className={`text-[11px] font-semibold leading-none text-white ${likePulse > 0 ? "animate-pop" : ""}`}>
              {item.likesCount}
            </span>
          </div>
        </button>

        {onOpenOwnProfile && (
          <button
            type="button"
            onClick={() => {
              hapticSelection();
              onOpenOwnProfile();
            }}
            className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center text-white"
          >
            <UserRound size={20} strokeWidth={2} />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleMute}
          className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center text-white"
        >
          {muted ? <VolumeX size={20} strokeWidth={2} /> : <Volume2 size={20} strokeWidth={2} />}
        </button>

        <button
          type="button"
          onClick={() => onReport(item)}
          className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center text-white"
        >
          <Flag size={20} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
