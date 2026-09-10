import WebApp from "@twa-dev/sdk";
import { MessageCircle, Heart, Link2, Volume2, VolumeX, Flag, Search, UserRound, Plus, Download } from "lucide-react";
import type { FeedItem } from "../lib/feed";

interface NavProps {
  onSearch: () => void;
  onUpload: () => void;
}

interface Props {
  item: FeedItem;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLike: (item: FeedItem) => void;
  onOpenComments: (item: FeedItem) => void;
  onShare: (item: FeedItem) => void;
  onReport: (item: FeedItem) => void;
  onOpenOwnProfile?: () => void;
  nav?: NavProps;
}

// Order: comments, share, download, like (elevated focal action), own
// profile, mute, report — per explicit spec. Search/upload aren't part of
// this row at all — they're fixed corner buttons (top-left/top-right),
// padded against --tg-safe-top the same way every other screen's top bar
// is (see App.tsx) so they don't sit under Telegram's fullscreen chrome.
export default function VideoActionBar({
  item,
  muted,
  onToggleMute,
  onToggleLike,
  onOpenComments,
  onShare,
  onReport,
  onOpenOwnProfile,
  nav,
}: Props) {
  const handleDownload = () => {
    if (!item.videoUrl) return;
    // Native Telegram download flow (Bot API 8.0+) — the client handles the
    // save-to-device prompt/progress itself. Older clients ignore the call
    // silently, so there's nothing to fall back to from inside the WebView.
    WebApp.downloadFile({ url: item.videoUrl, file_name: `SWYP-${item.id}.mp4` });
  };

  return (
    <>
      {nav && (
        <button
          type="button"
          onClick={nav.onSearch}
          className="pointer-events-auto absolute left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-xl"
          style={{ top: "calc(var(--tg-safe-top, 0px) + 1rem)" }}
        >
          <Search size={18} strokeWidth={2} />
        </button>
      )}

      {nav && (
        <button
          type="button"
          onClick={nav.onUpload}
          className="pointer-events-auto absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg"
          style={{ top: "calc(var(--tg-safe-top, 0px) + 1rem)" }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-2"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {/* Every control sits in a fixed-width slot so gaps read as even
            regardless of each glyph's own bounding-box width. min-w-0 lets the
            row shrink below its content's natural width (flex items default to
            min-width:auto, which would otherwise force it wider than the
            screen on narrow devices); overflow-x-auto turns that into a
            horizontal scroll instead of clipping off-screen. */}
        <div className="pointer-events-auto flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-full border border-white/10 bg-black/40 px-1.5 py-2 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => onOpenComments(item)}
            className="flex w-8 shrink-0 flex-col items-center gap-0.5 text-white"
          >
            <MessageCircle size={19} strokeWidth={2} />
            <span className="text-[10px] leading-none text-white/70">{item.commentsCount}</span>
          </button>

          <button type="button" onClick={() => onShare(item)} className="flex w-8 shrink-0 flex-col items-center text-white">
            <Link2 size={19} strokeWidth={2} />
          </button>

          <button type="button" onClick={handleDownload} className="flex w-8 shrink-0 flex-col items-center text-white">
            <Download size={19} strokeWidth={2} />
          </button>

          {/* Always blue — liked state shows as a filled (vs outline) heart
              rather than a color change, since the design calls for the
              button itself to stay blue. Count sits inside the same round
              badge as the heart rather than as a separate label below it. */}
          <button
            type="button"
            onClick={() => onToggleLike(item)}
            className="-mt-2.5 flex w-12 shrink-0 flex-col items-center"
          >
            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full border-[3px] border-black/50 bg-blue-500 shadow-lg">
              <Heart size={18} strokeWidth={2} fill={item.isLiked ? "white" : "none"} className="text-white" />
              <span className="text-[10px] font-semibold leading-none text-white">{item.likesCount}</span>
            </div>
          </button>

          {onOpenOwnProfile && (
            <button type="button" onClick={onOpenOwnProfile} className="flex w-8 shrink-0 flex-col items-center text-white">
              <UserRound size={19} strokeWidth={2} />
            </button>
          )}

          <button type="button" onClick={onToggleMute} className="flex w-8 shrink-0 flex-col items-center text-white">
            {muted ? <VolumeX size={19} strokeWidth={2} /> : <Volume2 size={19} strokeWidth={2} />}
          </button>

          <button type="button" onClick={() => onReport(item)} className="flex w-8 shrink-0 flex-col items-center text-white">
            <Flag size={17} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
}
