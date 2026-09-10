import { useCallback, type Dispatch, type SetStateAction } from "react";
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
  const handleToggleLike = useCallback(
    (item: FeedItem) => {
      const wasLiked = item.isLiked;
      setItems((prev) =>
        prev.map((v) =>
          v.id === item.id ? { ...v, isLiked: !wasLiked, likesCount: v.likesCount + (wasLiked ? -1 : 1) } : v,
        ),
      );
      const request = wasLiked ? unlikeVideo(item.id) : likeVideo(item.id);
      request
        .then((result) => {
          setItems((prev) =>
            prev.map((v) => (v.id === item.id ? { ...v, isLiked: result.liked, likesCount: result.likesCount } : v)),
          );
        })
        .catch(() => {
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
