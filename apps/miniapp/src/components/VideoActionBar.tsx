import WebApp from "@twa-dev/sdk";
import { MessageCircle, Heart, Link2, Volume2, VolumeX, Flag, Search, UserRound, Plus, Download } from "lucide-react";
import type { FeedItem } from "../lib/feed";

interface NavProps {
  onSearch: () => void;
  onUpload: () => void;
  onOwnProfile: () => void;
}

interface Props {
  item: FeedItem;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLike: (item: FeedItem) => void;
  onOpenAuthor: (item: FeedItem) => void;
  onOpenComments: (item: FeedItem) => void;
  onShare: (item: FeedItem) => void;
  onReport: (item: FeedItem) => void;
  nav?: NavProps;
}

// Floating pill bottom bar, styled after Telegram's own tab bar (frosted glass,
// rounded, floating above content) — replaces the old TikTok-style right-edge
// vertical stack so every control sits within one-handed thumb reach at the
// bottom of the screen, with Like as the elevated, centered focal action.
//
// Uses lucide SVG icons rather than emoji: emoji glyphs render at wildly
// different sizes/bounding boxes across platforms (Android's system emoji in
// particular render much larger than the reserved box), which visually
// clipped icons against their containers — SVGs render identically everywhere.
export default function VideoActionBar({
  item,
  muted,
  onToggleMute,
  onToggleLike,
  onOpenAuthor,
  onOpenComments,
  onShare,
  onReport,
  nav,
}: Props) {
  const authorLabel = item.author.username ?? item.author.firstName ?? "автор";

  const handleDownload = () => {
    if (!item.videoUrl) return;
    // Native Telegram download flow (Bot API 8.0+) — the client handles the
    // save-to-device prompt/progress itself. Older clients ignore the call
    // silently, so there's nothing to fall back to from inside the WebView.
    WebApp.downloadFile({ url: item.videoUrl, file_name: `SWYP-${item.id}.mp4` });
  };

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-center gap-1.5 px-2"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {nav && (
        <button
          type="button"
          onClick={nav.onSearch}
          className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-xl"
        >
          <Search size={18} strokeWidth={2} />
        </button>
      )}

      {/* min-w-0 lets this shrink below its content's natural width (flex items
          default to min-width:auto, which would otherwise force the whole row
          wider than the screen on narrow devices); overflow-x-auto turns that
          into a horizontal scroll instead of the row clipping off-screen —
          the actual bug reported ("обрезано") when adding the download button
          pushed total width past small Android screens. */}
      <div className="pointer-events-auto flex min-w-0 items-center gap-0 overflow-x-auto rounded-full border border-white/10 bg-black/40 px-1.5 py-2 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => onOpenComments(item)}
          className="flex shrink-0 flex-col items-center gap-0.5 px-1 text-white"
        >
          <MessageCircle size={20} strokeWidth={2} />
          <span className="text-[10px] leading-none text-white/70">{item.commentsCount}</span>
        </button>

        <button type="button" onClick={() => onOpenAuthor(item)} className="shrink-0 px-1">
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/10">
            {item.author.avatarUrl ? (
              <img src={item.author.avatarUrl} alt={authorLabel} className="h-full w-full object-cover" />
            ) : (
              <UserRound size={14} strokeWidth={2} className="text-white/70" />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onToggleLike(item)}
          className="-mt-3 flex shrink-0 flex-col items-center gap-0.5 px-0.5"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-black/40 shadow-lg ${
              item.isLiked ? "bg-red-500" : "bg-blue-500"
            }`}
          >
            <Heart size={22} strokeWidth={2} fill={item.isLiked ? "white" : "none"} className="text-white" />
          </div>
          <span className="text-[10px] leading-none text-white/70">{item.likesCount}</span>
        </button>

        <button type="button" onClick={() => onShare(item)} className="flex shrink-0 flex-col items-center px-1 text-white">
          <Link2 size={20} strokeWidth={2} />
        </button>

        <button type="button" onClick={handleDownload} className="flex shrink-0 flex-col items-center px-1 text-white">
          <Download size={20} strokeWidth={2} />
        </button>

        <button type="button" onClick={onToggleMute} className="flex shrink-0 flex-col items-center px-1 text-white">
          {muted ? <VolumeX size={20} strokeWidth={2} /> : <Volume2 size={20} strokeWidth={2} />}
        </button>

        <button type="button" onClick={() => onReport(item)} className="flex shrink-0 flex-col items-center px-1 text-white">
          <Flag size={18} strokeWidth={2} />
        </button>
      </div>

      {nav && (
        <div className="pointer-events-auto flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={nav.onOwnProfile}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-xl"
          >
            <UserRound size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={nav.onUpload}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
