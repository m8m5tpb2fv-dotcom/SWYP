import { useEffect, useRef } from "react";
import type { FeedItem } from "../lib/feed";

interface Props {
  item: FeedItem;
  active: boolean;
  preload: "auto" | "metadata" | "none";
  muted: boolean;
  onToggleMute: () => void;
  onToggleLike: (item: FeedItem) => void;
  onOpenAuthor: (item: FeedItem) => void;
  onOpenComments: (item: FeedItem) => void;
  onShare: (item: FeedItem) => void;
  registerNode: (node: HTMLDivElement | null) => void;
}

export default function VideoCard({
  item,
  active,
  preload,
  muted,
  onToggleMute,
  onToggleLike,
  onOpenAuthor,
  onOpenComments,
  onShare,
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
        <div className="pointer-events-auto flex items-end justify-between gap-4 p-4 pb-6">
          <div className="min-w-0 flex-1 text-white">
            <button type="button" onClick={() => onOpenAuthor(item)} className="text-sm font-semibold">
              @{authorLabel}
            </button>
            {item.title && <p className="mt-1 line-clamp-2 text-sm">{item.title}</p>}
            {item.hashtags.length > 0 && (
              <p className="mt-1 text-xs text-white/70">{item.hashtags.map((h) => `#${h}`).join(" ")}</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-4 text-white">
            <button type="button" onClick={() => onToggleLike(item)} className="flex flex-col items-center">
              <span className="text-2xl">{item.isLiked ? "❤️" : "🤍"}</span>
              <span className="text-xs">{item.likesCount}</span>
            </button>
            <button type="button" onClick={() => onOpenComments(item)} className="flex flex-col items-center">
              <span className="text-2xl">💬</span>
              <span className="text-xs">{item.commentsCount}</span>
            </button>
            <button type="button" onClick={() => onShare(item)} className="flex flex-col items-center">
              <span className="text-2xl">🔗</span>
            </button>
            <button type="button" onClick={onToggleMute} className="flex flex-col items-center">
              <span className="text-2xl">{muted ? "🔇" : "🔊"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
