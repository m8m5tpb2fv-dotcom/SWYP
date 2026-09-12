import type { Comment, User, Video } from "@swyp/database";
import { prisma } from "@swyp/database";
import { getPresignedGetUrl } from "@swyp/storage";

export function toPublicUser(user: User) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    nickname: user.nickname,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    isVerified: user.isVerified,
    subscriptionPriceStars: user.subscriptionPriceStars,
  };
}

// Author info attached to videos/comments — no telegramId, that's only exposed via /api/me.
export function toAuthor(user: User) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    firstName: user.firstName,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
  };
}

// videoUrl/thumbnailUrl on the Video row hold object keys (the bucket is private —
// see services/video-worker/src/index.ts), so every response signs a fresh
// time-limited GET URL rather than returning a permanent link. includeVideo=false
// (a locked premium video) skips signing videoUrl entirely — the thumbnail still
// signs, as a teaser — rather than handing out a working link to content the
// viewer hasn't paid for.
async function toVideoUrls(video: Pick<Video, "videoUrl" | "thumbnailUrl">, includeVideo = true) {
  const [videoUrl, thumbnailUrl] = await Promise.all([
    includeVideo && video.videoUrl ? getPresignedGetUrl(video.videoUrl) : Promise.resolve(null),
    video.thumbnailUrl ? getPresignedGetUrl(video.thumbnailUrl) : Promise.resolve(null),
  ]);
  return { videoUrl, thumbnailUrl };
}

// A viewer holding an active (non-expired) CreatorSubscription to an author
// can watch every premium video from that author — fetched once per
// request (not per video) and passed into toFeedItem for each item, so
// listing a page of videos doesn't do a subscription lookup per row.
export async function getActiveSubscribedCreatorIds(subscriberId: string): Promise<Set<string>> {
  const rows = await prisma.creatorSubscription.findMany({
    where: { subscriberId, expiresAt: { gt: new Date() } },
    select: { creatorId: true },
  });
  return new Set(rows.map((r) => r.creatorId));
}

export async function toFeedItem(
  video: Video & { user: User; likes: { id: string }[]; unlocks: { id: string }[] },
  requesterId: string,
  subscribedCreatorIds: Set<string>,
) {
  const isOwner = video.userId === requesterId;
  const isUnlocked = !video.isPremium || isOwner || video.unlocks.length > 0 || subscribedCreatorIds.has(video.userId);
  const urls = await toVideoUrls(video, isUnlocked);
  return {
    id: video.id,
    author: toAuthor(video.user),
    title: video.title,
    description: video.description,
    category: video.category,
    hashtags: video.hashtags,
    ...urls,
    isPremium: video.isPremium,
    priceStars: video.priceStars,
    isAdult: video.isAdult,
    isUnlocked,
    duration: video.duration,
    viewsCount: video.viewsCount,
    likesCount: video.likesCount,
    commentsCount: video.commentsCount,
    sharesCount: video.sharesCount,
    savesCount: video.savesCount,
    createdAt: video.createdAt,
    publishedAt: video.publishedAt,
    isLiked: video.likes.length > 0,
  };
}

export async function toAdminVideoItem(video: Video & { user: User }) {
  const urls = await toVideoUrls(video);
  return {
    id: video.id,
    author: toAuthor(video.user),
    title: video.title,
    status: video.status,
    category: video.category,
    hashtags: video.hashtags,
    isAdult: video.isAdult,
    ...urls,
    viewsCount: video.viewsCount,
    likesCount: video.likesCount,
    commentsCount: video.commentsCount,
    createdAt: video.createdAt,
    publishedAt: video.publishedAt,
  };
}

export function toCommentItem(comment: Comment & { user: User; _count: { replies: number } }) {
  return {
    id: comment.id,
    author: toAuthor(comment.user),
    text: comment.text,
    parentId: comment.parentId,
    repliesCount: comment._count.replies,
    createdAt: comment.createdAt,
  };
}
