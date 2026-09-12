import { useEffect, useState } from "react";
import { X, ChevronDown, UserRound, Pencil } from "lucide-react";
import { fetchUserProfile, fetchUserVideos, followUser, unfollowUser, type UserProfile } from "../lib/users";
import { fetchVideoById, type FeedItem } from "../lib/feed";
import { subscribeToCreator } from "../lib/monetization";
import WebApp from "@twa-dev/sdk";
import { useVideoInteractions } from "../lib/useVideoInteractions";
import VideoCard from "./VideoCard";
import VideoActionBar from "./VideoActionBar";
import CommentsSheet from "./CommentsSheet";
import ReportSheet from "./ReportSheet";
import EditProfileSheet from "./EditProfileSheet";
import EditVideoSheet from "./EditVideoSheet";
import GiftPickerSheet from "./GiftPickerSheet";

interface Props {
  userId: string;
  currentUserId: string;
  onClose: () => void;
}

export default function ProfileScreen({ userId, currentUserId, onClose }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followPending, setFollowPending] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [commentsForId, setCommentsForId] = useState<string | null>(null);
  const [reportForId, setReportForId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editVideoOpen, setEditVideoOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  // Bumped by the retry button below — the load effect otherwise only
  // re-runs on a userId change, so a failed load previously had no way to
  // try again short of closing and reopening the whole profile screen.
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchUserProfile(userId), fetchUserVideos(userId)])
      .then(([p, v]) => {
        if (cancelled) return;
        setProfile(p);
        setVideos(v.items);
      })
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, retryToken]);

  const handleToggleFollow = async () => {
    if (!profile || followPending) return;
    setFollowPending(true);
    const wasFollowing = profile.isFollowing;
    setProfile({ ...profile, isFollowing: !wasFollowing, followersCount: profile.followersCount + (wasFollowing ? -1 : 1) });
    try {
      const result = wasFollowing ? await unfollowUser(userId) : await followUser(userId);
      setProfile((prev) => (prev ? { ...prev, isFollowing: result.following, followersCount: result.followersCount } : prev));
    } catch {
      setProfile((prev) => (prev ? { ...prev, isFollowing: wasFollowing, followersCount: profile.followersCount } : prev));
    } finally {
      setFollowPending(false);
    }
  };

  const displayName = profile?.username ?? profile?.firstName ?? "Пользователь";

  const { handleToggleLike, handleShare } = useVideoInteractions(setVideos);

  const handleCommentCountChange = (videoId: string, delta: number) => {
    setVideos((prev) => prev.map((v) => (v.id === videoId ? { ...v, commentsCount: v.commentsCount + delta } : v)));
  };

  // Locked premium videos come back with videoUrl: null — re-fetch the item
  // once Stars payment confirms so the (now-signed) real URL replaces it.
  const handleUnlocked = (item: FeedItem) => {
    fetchVideoById(item.id)
      .then((updated) => {
        setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      })
      .catch(() => {});
  };

  const handleSubscribe = async () => {
    if (subscribing) return;
    setSubscribing(true);
    setSubscribeError(null);
    try {
      const { invoiceUrl } = await subscribeToCreator(userId);
      WebApp.openInvoice(invoiceUrl, (status) => {
        setSubscribing(false);
        if (status === "paid") {
          fetchUserProfile(userId)
            .then(setProfile)
            .catch(() => {});
        } else if (status === "failed") {
          setSubscribeError("Платёж не прошёл");
        }
      });
    } catch (err) {
      setSubscribing(false);
      setSubscribeError((err as Error).message);
    }
  };

  return (
    // Only the header+stats+grid actually scroll — the video viewer and the
    // sheets below are siblings of that scroll container, not nested inside
    // it, so their own `absolute inset-0` always resolves against this outer
    // (non-scrolling) box instead of picking up a stale/short containing
    // block from the scrolled content and leaving grid thumbnails visible
    // through the gap at the bottom.
    <div className="absolute inset-0 z-30 bg-black/55 text-white backdrop-blur-3xl">
      <div className="flex h-full flex-col overflow-y-auto">
        <div
          className="flex items-center justify-between border-b border-white/10 px-4 pb-3"
          style={{ paddingTop: "calc(var(--tg-safe-top, 0px) + 0.75rem)" }}
        >
          <span className="text-sm font-semibold">Профиль</span>
          <button type="button" onClick={onClose} className="text-sm text-white/60">
            Закрыть
          </button>
        </div>

        {loading && <p className="py-10 text-center text-sm text-white/60">Загрузка…</p>}
        {error && (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="text-center text-sm text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => setRetryToken((t) => t + 1)}
              className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Повторить
            </button>
          </div>
        )}

        {profile && (
          <div className="flex flex-col items-center gap-3 px-6 py-6">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white/10">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <UserRound size={32} strokeWidth={2} className="text-white/60" />
              )}
            </div>
            <p className="text-base font-semibold">@{displayName}</p>
            {profile.bio && <p className="text-center text-sm text-white/70">{profile.bio}</p>}

            <div className="flex gap-6 py-2 text-center text-sm">
              <div>
                <p className="font-semibold">{profile.followersCount}</p>
                <p className="text-white/50">подписчиков</p>
              </div>
              <div>
                <p className="font-semibold">{profile.followingCount}</p>
                <p className="text-white/50">подписки</p>
              </div>
              <div>
                <p className="font-semibold">{profile.videosCount}</p>
                <p className="text-white/50">Shorts</p>
              </div>
              <div>
                <p className="font-semibold">{profile.likesCount}</p>
                <p className="text-white/50">лайков</p>
              </div>
            </div>

            {profile.isMe ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="w-full max-w-xs rounded-lg bg-white/10 py-2 text-sm font-semibold text-white"
              >
                Редактировать профиль
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleFollow}
                disabled={followPending}
                className={`w-full max-w-xs rounded-lg py-2 text-sm font-semibold ${
                  profile.isFollowing ? "bg-white/10 text-white" : "bg-blue-500 text-white"
                }`}
              >
                {profile.isFollowing ? "Вы подписаны" : "Подписаться"}
              </button>
            )}

            {!profile.isMe && profile.subscriptionPriceStars !== null && (
              <div className="w-full max-w-xs">
                {profile.isSubscribed ? (
                  <p className="rounded-lg bg-white/10 py-2 text-center text-sm font-semibold text-white">
                    🔒 Премиум-подписка активна
                    {profile.subscriptionExpiresAt &&
                      ` до ${new Date(profile.subscriptionExpiresAt).toLocaleDateString("ru-RU")}`}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {subscribing
                      ? "Открываем оплату…"
                      : `🔒 Премиум-подписка · ${profile.subscriptionPriceStars}⭐ / 30 дней`}
                  </button>
                )}
                {subscribeError && <p className="mt-1 text-center text-xs text-red-400">{subscribeError}</p>}
              </div>
            )}
          </div>
        )}

        {videos.length > 0 && (
          <div className="grid grid-cols-3 gap-0.5 px-0.5 pb-6">
            {videos.map((v, index) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setOpenIndex(index)}
                className="aspect-[9/16] bg-white/5"
              >
                {v.thumbnailUrl && (
                  <img src={v.thumbnailUrl} alt={v.title ?? ""} className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}

        {profile && videos.length === 0 && !loading && (
          <p className="py-6 text-center text-sm text-white/40">Пока нет опубликованных Shorts</p>
        )}
      </div>

      {openIndex !== null && videos[openIndex] && !commentsForId && !reportForId && !editVideoOpen && !giftOpen && (
        <div className="absolute inset-0 z-40 bg-black">
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
            style={{ top: "calc(var(--tg-safe-top, 0px) + 1rem)" }}
          >
            <X size={18} strokeWidth={2} />
          </button>
          {profile?.isMe && (
            <button
              type="button"
              onClick={() => setEditVideoOpen(true)}
              className="absolute right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
              style={{ top: "calc(var(--tg-safe-top, 0px) + 3.75rem)" }}
            >
              <Pencil size={16} strokeWidth={2} />
            </button>
          )}
          {openIndex < videos.length - 1 && (
            <button
              type="button"
              onClick={() => setOpenIndex((i) => (i !== null ? i + 1 : i))}
              className="absolute left-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
              style={{ top: "calc(var(--tg-safe-top, 0px) + 1rem)" }}
            >
              <ChevronDown size={18} strokeWidth={2} />
            </button>
          )}
          <VideoCard
            key={videos[openIndex].id}
            item={videos[openIndex]}
            active
            preload="auto"
            muted={muted}
            onOpenAuthor={() => {}}
            onDoubleTapLike={handleToggleLike}
            registerNode={() => {}}
            onUnlocked={handleUnlocked}
          />
          <VideoActionBar
            item={videos[openIndex]}
            currentUserId={currentUserId}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onToggleLike={handleToggleLike}
            onOpenComments={(v) => setCommentsForId(v.id)}
            onShare={handleShare}
            onReport={(v) => setReportForId(v.id)}
            onOpenGift={() => setGiftOpen(true)}
          />
        </div>
      )}

      {commentsForId && (
        <CommentsSheet
          videoId={commentsForId}
          currentUserId={currentUserId}
          onClose={() => setCommentsForId(null)}
          onCountChange={(delta) => handleCommentCountChange(commentsForId, delta)}
        />
      )}

      {reportForId && <ReportSheet videoId={reportForId} onClose={() => setReportForId(null)} />}

      {editOpen && profile?.isMe && (
        <EditProfileSheet
          initialBio={profile.bio}
          initialSubscriptionPriceStars={profile.subscriptionPriceStars}
          onClose={() => setEditOpen(false)}
          onSaved={(patch) => setProfile((prev) => (prev ? { ...prev, ...patch } : prev))}
        />
      )}

      {editVideoOpen && openIndex !== null && videos[openIndex] && (
        <EditVideoSheet
          video={videos[openIndex]}
          onClose={() => setEditVideoOpen(false)}
          onSaved={(patch) => {
            const videoId = videos[openIndex].id;
            setVideos((prev) => prev.map((v) => (v.id === videoId ? { ...v, ...patch } : v)));
          }}
        />
      )}

      {giftOpen && openIndex !== null && videos[openIndex] && (
        <GiftPickerSheet
          recipientUserId={videos[openIndex].author.id}
          recipientLabel={
            videos[openIndex].author.username ? `@${videos[openIndex].author.username}` : videos[openIndex].author.firstName ?? "автора"
          }
          videoId={videos[openIndex].id}
          onClose={() => setGiftOpen(false)}
        />
      )}
    </div>
  );
}
