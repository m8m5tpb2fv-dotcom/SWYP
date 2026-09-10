import { useEffect, useRef, useState } from "react";
import { Eye, Play, UserRound } from "lucide-react";
import type { FeedItem } from "../lib/feed";
import { formatCount } from "../lib/format";

interface Props {
  item: FeedItem;
  active: boolean;
  preload: "auto" | "metadata" | "none";
  muted: boolean;
  onOpenAuthor: (item: FeedItem) => void;
  registerNode: (node: HTMLDivElement | null) => void;
}

// Playback + caption only — likes/comments/share/mute/report live in
// VideoActionBar, the floating bottom bar rendered alongside this card.
export default function VideoCard({ item, active, preload, muted, onOpenAuthor, registerNode }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Tracks the <video>'s actual paused state (via its own play/pause events,
  // not just the tap handler) so the overlay icon also shows up correctly
  // when playback is blocked by autoplay policy or paused by the active-card
  // effect below — not only on a manual tap.
  const [paused, setPaused] = useState(true);

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
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />

      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          paused ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2AABEE] shadow-xl">
          <Play size={30} strokeWidth={0} fill="white" className="ml-1" />
        </div>
      </div>

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
