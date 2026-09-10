import { useState } from "react";
import { X } from "lucide-react";
import type { FeedItem } from "../lib/feed";
import { useVideoInteractions } from "../lib/useVideoInteractions";
import VideoCard from "./VideoCard";
import VideoActionBar from "./VideoActionBar";
import CommentsSheet from "./CommentsSheet";
import ReportSheet from "./ReportSheet";

interface Props {
  video: FeedItem;
  currentUserId: string;
  onClose: () => void;
}

// Landing screen for a shared-video deep link (t.me/<bot>/<app>?startapp=video_<id>) —
// see App.tsx, which resolves start_param to a FeedItem and renders this instead
// of dropping the viewer into the normal feed.
export default function SharedVideoScreen({ video, currentUserId, onClose }: Props) {
  const [items, setItems] = useState<FeedItem[]>([video]);
  const [muted, setMuted] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { handleToggleLike, handleShare } = useVideoInteractions(setItems);

  const item = items[0];

  return (
    <div className="absolute inset-0 z-30 bg-black">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
        style={{ top: "calc(var(--tg-safe-top, 0px) + 1rem)" }}
      >
        <X size={18} strokeWidth={2} />
      </button>

      <VideoCard item={item} active preload="auto" muted={muted} onOpenAuthor={() => {}} registerNode={() => {}} />

      {!commentsOpen && !reportOpen && (
        <VideoActionBar
          item={item}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onToggleLike={handleToggleLike}
          onOpenAuthor={() => {}}
          onOpenComments={() => setCommentsOpen(true)}
          onShare={handleShare}
          onReport={() => setReportOpen(true)}
        />
      )}

      {commentsOpen && (
        <CommentsSheet
          videoId={item.id}
          currentUserId={currentUserId}
          onClose={() => setCommentsOpen(false)}
          onCountChange={(delta) =>
            setItems((prev) => prev.map((v) => (v.id === item.id ? { ...v, commentsCount: v.commentsCount + delta } : v)))
          }
        />
      )}

      {reportOpen && <ReportSheet videoId={item.id} onClose={() => setReportOpen(false)} />}
    </div>
  );
}
