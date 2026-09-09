import type { Comment, User, Video } from "@swyp/database";

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

export function toFeedItem(video: Video & { user: User; likes: { id: string }[] }) {
  return {
    id: video.id,
    author: toAuthor(video.user),
    title: video.title,
    description: video.description,
    category: video.category,
    hashtags: video.hashtags,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
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
