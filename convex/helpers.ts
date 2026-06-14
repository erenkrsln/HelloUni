export async function getImageUrl(ctx: any, imageValue: string | null | undefined): Promise<string | undefined> {
  if (!imageValue || imageValue.startsWith("http")) return imageValue || undefined;
  try {
    return await ctx.storage.getUrl(imageValue as any) || undefined;
  } catch {
    return undefined;
  }
}

export async function getUserImageUrl(ctx: any, imageValue: string | null | undefined): Promise<string> {
  const url = await getImageUrl(ctx, imageValue);
  return url || "/profile/user.svg";
}

export async function getGroupImageUrl(ctx: any, imageValue: string | null | undefined): Promise<string> {
  const url = await getImageUrl(ctx, imageValue);
  return url || "/profile/group.svg";
}

export function shouldDeleteR2File(oldUrl: string | null | undefined, newUrl: string | null | undefined): oldUrl is string {
  return !!(oldUrl && oldUrl.startsWith("http") && oldUrl !== newUrl);
}

// ─── Notifications + Web Push ────────────────────────────────────────────────

import { internal } from "./_generated/api";

type NotificationType =
  | "follow"
  | "post_like"
  | "comment"
  | "comment_like"
  | "event_join"
  | "group_join_request"
  | "group_join_accept"
  | "group_join_reject";

type NotificationFields = {
  userId: any;
  issuerId: any;
  type: NotificationType;
  targetId?: string;
  eventMetadata?: any;
  isRead: boolean;
  createdAt: number;
};

async function resolveCommentUrl(ctx: any, commentId?: string): Promise<string> {
  if (!commentId) return "/notifications";
  try {
    const comment = await ctx.db.get(commentId as any);
    if (comment?.postId) return `/posts/${comment.postId}`;
  } catch {
    // ignore – fall back to the notifications feed
  }
  return "/notifications";
}

/**
 * Insert an in-app notification AND schedule a Web Push delivery for it.
 * Drop-in replacement for `ctx.db.insert("notifications", fields)`.
 *
 * Push scheduling is best-effort: any failure here never blocks the notification.
 */
export async function createNotification(ctx: any, fields: NotificationFields) {
  const notificationId = await ctx.db.insert("notifications", fields);

  try {
    const issuer = await ctx.db.get(fields.issuerId);
    const issuerName = issuer?.name || "Jemand";

    // The message itself becomes the notification title, so the phone shows
    // the app name ("HelloUni") only once instead of repeating it.
    let title = "Neue Benachrichtigung";
    let url = "/notifications";

    switch (fields.type) {
      case "follow":
        title = `${issuerName} folgt dir jetzt`;
        url = issuer?.username ? `/profile/${issuer.username}` : "/notifications";
        break;
      case "post_like":
        title = `${issuerName} gefällt dein Beitrag`;
        url = fields.targetId ? `/posts/${fields.targetId}` : "/notifications";
        break;
      case "comment":
        title = `${issuerName} hat deinen Beitrag kommentiert`;
        url = await resolveCommentUrl(ctx, fields.targetId);
        break;
      case "comment_like":
        title = `${issuerName} gefällt dein Kommentar`;
        url = await resolveCommentUrl(ctx, fields.targetId);
        break;
      case "event_join":
        title = `${issuerName} nimmt an deinem Treffen teil`;
        url = fields.targetId ? `/posts/${fields.targetId}` : "/notifications";
        break;
      case "group_join_request":
        title = `${issuerName} möchte deiner Gruppe beitreten`;
        url = "/notifications";
        break;
      case "group_join_accept":
        title = "Deine Beitrittsanfrage wurde angenommen";
        url = fields.targetId ? `/chat/${fields.targetId}` : "/notifications";
        break;
      case "group_join_reject":
        title = "Deine Beitrittsanfrage wurde abgelehnt";
        url = "/notifications";
        break;
    }

    await ctx.scheduler.runAfter(0, internal.pushActions.sendPush, {
      userIds: [fields.userId],
      payload: { title, url },
    });
  } catch (err) {
    console.error("[push] failed to schedule notification push", err);
  }

  return notificationId;
}
