import { useEffect, useState } from "react";
import { X, ChevronDown, UserRound } from "lucide-react";
import { fetchUserProfile, fetchUserVideos, followUser, unfollowUser, type UserProfile } from "../lib/users";
import type { FeedItem } from "../lib/feed";
import { useVideoInteractions } from "../lib/useVideoInteractions";
import VideoCard from "./VideoCard";
import VideoActionBar from "./VideoActionBar";
import CommentsSheet from "./CommentsSheet";
import ReportSheet from "./ReportSheet";

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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
  }, [userId]);

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

  return (
    <div className="absolute inset-0 z-30 flex flex-col overflow-y-auto bg-black text-white">
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
      {error && <p className="py-10 text-center text-sm text-red-400">{error}</p>}

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

          {!profile.isMe && (
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

      {openIndex !== null && videos[openIndex] && !commentsForId && !reportForId && (
        <div className="absolute inset-0 z-40 bg-black">
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
            style={{ top: "calc(var(--tg-safe-top, 0px) + 1rem)" }}
          >
            <X size={18} strokeWidth={2} />
          </button>
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
          <VideoCard key={videos[openIndex].id} item={videos[openIndex]} active preload="auto" muted={muted} onOpenAuthor={() => {}} registerNode={() => {}} />
          <VideoActionBar
            item={videos[openIndex]}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onToggleLike={handleToggleLike}
            onOpenAuthor={() => {}}
            onOpenComments={(v) => setCommentsForId(v.id)}
            onShare={handleShare}
            onReport={(v) => setReportForId(v.id)}
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
    </div>
  );
}
