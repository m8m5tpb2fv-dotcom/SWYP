import type { Comment, User, Video } from "@swyp/database";
import { getPresignedGetUrl } from "@swyp/storage";

export function toPublicUser(user: User) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  };
}

// Author info attached to videos/comments — no telegramId, that's only exposed via /api/me.
export function toAuthor(user: User) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    avatarUrl: user.avatarUrl,
  };
}

// videoUrl/thumbnailUrl on the Video row hold object keys (the bucket is private —
// see services/video-worker/src/index.ts), so every response signs a fresh
// time-limited GET URL rather than returning a permanent link.
async function toVideoUrls(video: Pick<Video, "videoUrl" | "thumbnailUrl">) {
  const [videoUrl, thumbnailUrl] = await Promise.all([
    video.videoUrl ? getPresignedGetUrl(video.videoUrl) : Promise.resolve(null),
    video.thumbnailUrl ? getPresignedGetUrl(video.thumbnailUrl) : Promise.resolve(null),
  ]);
  return { videoUrl, thumbnailUrl };
}

export async function toFeedItem(video: Video & { user: User; likes: { id: string }[] }) {
  const urls = await toVideoUrls(video);
  return {
    id: video.id,
    author: toAuthor(video.user),
    title: video.title,
    description: video.description,
    category: video.category,
    hashtags: video.hashtags,
    ...urls,
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
