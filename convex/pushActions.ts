"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import webpush from "web-push";

/**
 * Deliver a Web Push notification to every device subscription of the given users.
 * Runs in the Node runtime because the `web-push` library needs Node crypto.
 *
 * Required Convex env vars:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. "mailto:team@hellouni.app")
 */
export const sendPush = internalAction({
  args: {
    userIds: v.array(v.id("users")),
    payload: v.object({
      title: v.string(),
      body: v.optional(v.string()),
      url: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:team@hellouni.app";

    if (!publicKey || !privateKey) {
      console.error("[push] VAPID keys not configured; skipping push delivery");
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const subscriptions = await ctx.runQuery(
      internal.push.getSubscriptionsForUsers,
      { userIds: args.userIds }
    );

    if (subscriptions.length === 0) return;

    const notificationPayload = JSON.stringify({
      title: args.payload.title,
      body: args.payload.body || "",
      data: { url: args.payload.url || "/notifications" },
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            notificationPayload
          );
        } catch (err: any) {
          // 404/410 means the subscription is gone -> remove it.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await ctx.runMutation(internal.push.deleteSubscriptionByEndpoint, {
              endpoint: sub.endpoint,
            });
          } else {
            console.error("[push] send failed:", err?.statusCode, err?.body);
          }
        }
      })
    );
  },
});
