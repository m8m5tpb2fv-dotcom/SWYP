import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent, TouchEvent as ReactTouchEvent } from "react";
import { Eye, Heart, Lock, Play, UserRound } from "lucide-react";
import WebApp from "@twa-dev/sdk";
import type { FeedItem } from "../lib/feed";
import { formatCount, displayName } from "../lib/format";
import { unlockVideo } from "../lib/monetization";
import VerifiedBadge from "./VerifiedBadge";

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
  // Fired once a locked premium video's unlock payment is confirmed —
  // videoUrl came back null while locked, so the parent re-fetches the item
  // to get the real, now-signed URL instead of this card trying to play one.
  onUnlocked?: (item: FeedItem) => void;
  // True for the active card and its immediate neighbors (Feed's own
  // `distance <= 1`, matching its preload="auto" cutoff) — hints the
  // browser to keep these specific cards on their own GPU compositor layer
  // for a smoother swipe, without paying that memory cost for every card
  // in a long feed.
  warm?: boolean;
  // Fired when the <video> element itself reports it's no longer muted
  // while our own `muted` prop still says it should be — see the
  // onVolumeChange handler below for why that happens and why it needs to
  // propagate up rather than just flip a local flag.
  onVolumeUp?: () => void;
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
  onUnlocked,
  warm,
  onVolumeUp,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  // Tracks the <video>'s actual paused state (via its own play/pause events,
  // not just the tap handler) so the overlay icon also shows up correctly
  // when playback is blocked by autoplay policy or paused by the active-card
  // effect below — not only on a manual tap.
  const [paused, setPaused] = useState(true);
  // A freshly-active card is always technically "paused" for a beat before
  // play() actually starts (React state defaults to true on mount, and even
  // a warm <video> takes a moment to fire 'play') — showing the icon during
  // that beat reads as the next video being stuck on pause every single
  // swipe. Suppresses the icon only for that startup window; a manual tap-
  // to-pause on an already-active video bypasses this entirely, so that
  // stays instant.
  const [suppressPauseIcon, setSuppressPauseIcon] = useState(false);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [likeAnimKey, setLikeAnimKey] = useState(0);
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedPastThresholdRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let retry: (() => void) | null = null;
    let suppressTimer: number | null = null;
    // play() is async — if this card goes inactive again before it settles
    // (a quick swipe onto this video and immediately back off), the .catch()
    // below used to still run and register a document-level retry listener
    // that nothing would ever clean up (this effect's own cleanup had
    // already run by then, with `retry` still null). That orphaned listener
    // would later fire on literally the next tap anywhere in the app and
    // force-play this specific, by-then off-screen video. Guard every
    // deferred callback on this flag instead.
    let cancelled = false;

    if (active) {
      setSuppressPauseIcon(true);
      // Safety net: if play() never settles (or 'play' never fires) for some
      // reason, stop hiding the icon anyway so a genuinely stuck video isn't
      // silently unreadable.
      suppressTimer = window.setTimeout(() => setSuppressPauseIcon(false), 500);

      video
        .play()
        .then(() => {
          if (!cancelled) setSuppressPauseIcon(false);
        })
        .catch(() => {
          if (cancelled) return;
          // Some WebViews (Telegram's included) still silently block the very
          // first autoplay attempt before the page has seen any interaction
          // at all, even for a muted video — this is why only the FIRST
          // video on cold app open ever showed paused, never ones reached by
          // swiping (a swipe is itself the interaction that unblocks it).
          // Retry once on the first touch/click anywhere, then stop listening.
          // Unsuppress right away here — this is a real stuck-paused state,
          // not startup latency, so the icon should tell the user to tap.
          setSuppressPauseIcon(false);
          retry = () => {
            video.play().catch(() => {});
          };
          document.addEventListener("touchstart", retry, { once: true, passive: true });
          document.addEventListener("click", retry, { once: true });
        });
    } else {
      video.pause();
      // A single-tap-to-pause toggle scheduled (see handleTap's tapTimeoutRef)
      // while this card was still active would otherwise fire ~300ms after
      // swiping away and resume playback (and audio) on this now off-screen
      // video, since togglePlayPause just checks video.paused with no
      // awareness of whether the card is still the active one.
      if (tapTimeoutRef.current !== null) {
        window.clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
    }

    return () => {
      cancelled = true;
      if (suppressTimer !== null) window.clearTimeout(suppressTimer);
      if (retry) {
        document.removeEventListener("touchstart", retry);
        document.removeEventListener("click", retry);
      }
    };
  }, [active]);

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current !== null) window.clearTimeout(tapTimeoutRef.current);
    };
  }, []);

  // There's no web API for "the user pressed the phone's hardware volume-up
  // button" — but on platforms where the OS routes hardware volume to
  // whichever <video> currently owns the media session (notably Chrome on
  // Android), that shows up here as the element unmuting/raising its own
  // .volume on its own, independent of our in-app mute button. Our `muted`
  // prop is otherwise fully controlled from Feed/ProfileScreen's own state —
  // without this, the very next render would just re-apply muted={true}
  // and silently undo what the hardware button just did. Not reliable on
  // iOS (WebKit keeps system volume and page media more decoupled), but
  // there's nothing more direct available and it's a harmless no-op there.
  const handleVolumeChange = (e: SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (muted && !video.muted && video.volume > 0) {
      onVolumeUp?.();
    }
  };

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

  const authorLabel = displayName(item.author, "автор");
  const locked = item.isPremium && !item.isUnlocked;

  const handleUnlock = async () => {
    if (unlocking) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const { invoiceUrl } = await unlockVideo(item.id);
      WebApp.openInvoice(invoiceUrl, (status) => {
        setUnlocking(false);
        if (status === "paid") {
          onUnlocked?.(item);
        } else if (status === "failed") {
          setUnlockError("Платёж не прошёл");
        }
      });
    } catch (err) {
      setUnlocking(false);
      setUnlockError((err as Error).message);
    }
  };

  return (
    <div
      ref={registerNode}
      data-video-id={item.id}
      className="relative h-full w-full shrink-0 snap-start bg-black"
      style={warm ? { transform: "translate3d(0,0,0)", willChange: "transform" } : undefined}
    >
      {locked ? (
        <>
          {item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
          {/* Matte darkening — a translucent tint + a Telegram-style strong
              frosted diffusion (like its own blurred-photo placeholder),
              rather than the original opacity-40+blur-2xl treatment (hid
              the preview entirely) or a too-light blur (barely read as
              "blurred" at all) — the thumbnail still reads as a teaser
              through the frosting, with the lock + price as the focal point. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 px-8 text-center text-white backdrop-blur-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-xl">
              <Lock size={24} strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold">Эксклюзивный Short</p>
            <button
              type="button"
              onClick={handleUnlock}
              disabled={unlocking}
              className="tap-scale rounded-full bg-blue-500 px-5 py-2.5 text-sm font-semibold shadow-lg disabled:opacity-60"
            >
              {unlocking ? "Открываем…" : `Открыть за ${item.priceStars} ⭐`}
            </button>
            {unlockError && <p className="text-xs text-red-400">{unlockError}</p>}
          </div>
        </>
      ) : (
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
          onVolumeChange={handleVolumeChange}
        />
      )}

      {!locked && (
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
            paused && !suppressPauseIcon ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-white/10 shadow-lg backdrop-blur-xl">
            <Play size={28} strokeWidth={0} fill="white" />
          </div>
        </div>
      )}

      {showLikeAnim && (
        <div key={likeAnimKey} className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Heart
            size={120}
            strokeWidth={0}
            fill="white"
            className="animate-like-pop opacity-90 drop-shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
            onAnimationEnd={() => setShowLikeAnim(false)}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-transparent to-black/10">
        <div className="pointer-events-auto p-4 pb-28" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}>
          <div className="min-w-0 max-w-[75%] text-white">
            <button type="button" onClick={() => onOpenAuthor(item)} className="tap-scale flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                {item.author.avatarUrl ? (
                  <img src={item.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={13} strokeWidth={2} />
                )}
              </div>
              <span className="flex items-center gap-1 text-sm font-semibold">
                @{authorLabel}
                {item.author.isVerified && <VerifiedBadge size={14} />}
              </span>
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
