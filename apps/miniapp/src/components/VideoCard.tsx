import { useEffect, useRef } from "react";
import { Eye, UserRound } from "lucide-react";
import type { FeedItem } from "../lib/feed";
import { formatCount } from "../lib/format";

interface Props {
  item: FeedItem;
  active: boolean;
  preload: "auto" | "metadata" | "none";
  muted: boolean;
  onOpenAuthor: (item: FeedItem) => void;
  // Optional: only Feed passes this (App's "jump to my own profile" action).
  // Lives here next to the author's name rather than as its own satellite
  // button in VideoActionBar — one less floating circle on screen.
  onOpenOwnProfile?: () => void;
  registerNode: (node: HTMLDivElement | null) => void;
}

// Playback + caption only — likes/comments/share/mute/report live in
// VideoActionBar, the floating bottom bar rendered alongside this card.
export default function VideoCard({
  item,
  active,
  preload,
  muted,
  onOpenAuthor,
  onOpenOwnProfile,
  registerNode,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const handleTap = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
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
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-transparent to-black/10">
        <div className="pointer-events-auto p-4 pb-28" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}>
          <div className="min-w-0 max-w-[75%] text-white">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onOpenAuthor(item)} className="text-sm font-semibold">
                @{authorLabel}
              </button>
              {onOpenOwnProfile && (
                <button
                  type="button"
                  onClick={onOpenOwnProfile}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10"
                  aria-label="Мой профиль"
                >
                  <UserRound size={13} strokeWidth={2} />
                </button>
              )}
            </div>
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
