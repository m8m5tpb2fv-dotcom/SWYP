import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import WebApp from "@twa-dev/sdk";
import { likeVideo, unlikeVideo, shareVideo, type FeedItem } from "./feed";

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? "SWYP_bot";
// Registered via BotFather (Bot Settings → Configure Mini App / "SWYP" short
// name) — must match exactly, or t.me/<bot>/<name> falls back to opening the
// bot's chat instead of launching the Mini App directly.
const APP_SHORT_NAME = "SWYP";

// Shared by Feed, ProfileScreen's single-video viewer, and the shared-video
// overlay (App.tsx) — all three render a VideoCard/VideoActionBar pair over
// their own list of FeedItems and need the same like/share behavior.
export function useVideoInteractions(setItems: Dispatch<SetStateAction<FeedItem[]>>) {
  // A fast double-tap (like, then immediately unlike) fires two requests
  // that can resolve out of order over a mobile connection — without this,
  // whichever response happens to arrive last would win regardless of which
  // action the user actually did last. Tracks the latest in-flight request
  // per video so a stale response is ignored instead of clobbering state.
  const likeSeqRef = useRef(new Map<string, number>());

  const handleToggleLike = useCallback(
    (item: FeedItem) => {
      const wasLiked = item.isLiked;
      setItems((prev) =>
        prev.map((v) =>
          v.id === item.id ? { ...v, isLiked: !wasLiked, likesCount: v.likesCount + (wasLiked ? -1 : 1) } : v,
        ),
      );

      const seq = (likeSeqRef.current.get(item.id) ?? 0) + 1;
      likeSeqRef.current.set(item.id, seq);
      const isStillLatest = () => likeSeqRef.current.get(item.id) === seq;

      const request = wasLiked ? unlikeVideo(item.id) : likeVideo(item.id);
      request
        .then((result) => {
          if (!isStillLatest()) return;
          setItems((prev) =>
            prev.map((v) => (v.id === item.id ? { ...v, isLiked: result.liked, likesCount: result.likesCount } : v)),
          );
        })
        .catch(() => {
          if (!isStillLatest()) return;
          setItems((prev) =>
            prev.map((v) => (v.id === item.id ? { ...v, isLiked: wasLiked, likesCount: item.likesCount } : v)),
          );
        });
    },
    [setItems],
  );

  const handleShare = useCallback(
    (item: FeedItem) => {
      const deepLink = `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=video_${item.id}`;
      const text = item.title ? `🔥 Посмотри этот Short: ${item.title}` : "🔥 Посмотри этот Short";
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`;
      WebApp.openTelegramLink(shareUrl);
      shareVideo(item.id)
        .then((result) => {
          setItems((prev) => prev.map((v) => (v.id === item.id ? { ...v, sharesCount: result.sharesCount } : v)));
        })
        .catch(() => {});
    },
    [setItems],
  );

  return { handleToggleLike, handleShare };
}
