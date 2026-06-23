"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Convert a base64url VAPID key to the Uint8Array the Push API expects. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

/**
 * Manages the browser's Web Push subscription and syncs it with Convex.
 *
 * Registers /sw.js, exposes the current permission state, and provides
 * subscribe()/unsubscribe() helpers tied to the logged-in user.
 */
export function usePushNotifications(userId: Id<"users"> | undefined) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const saveSubscription = useMutation(api.push.saveSubscription);
  const removeSubscription = useMutation(api.push.removeSubscription);

  // Detect support, register the service worker, and read current state.
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setIsSupported(false);
      setPermission("unsupported");
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission as PushPermission);

    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setIsSubscribed(sub !== null);
      })
      .catch((err) => console.error("[push] service worker registration failed", err));

    return () => {
      cancelled = true;
    };
  }, []);

  // Self-heal: if the browser already has a subscription but the backend doesn't
  // (e.g. a previous save failed), re-upsert it once the user id is known.
  // saveSubscription is an idempotent upsert by endpoint, so this is safe to repeat.
  useEffect(() => {
    if (!userId || typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        if (cancelled || !sub) return;
        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
        return saveSubscription({
          userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        });
      })
      .catch((err) => console.error("[push] subscription resync failed", err));
    return () => {
      cancelled = true;
    };
  }, [userId, saveSubscription]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !userId) return false;
    if (!VAPID_PUBLIC_KEY) {
      console.error("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
      return false;
    }

    setIsLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as PushPermission);
      if (permissionResult !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;

      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Incomplete push subscription");
      }

      // The browser subscription exists -> reflect that in the UI right away.
      // A failing backend save must not undo the toggle or hang the spinner;
      // the resync effect will retry the upsert on the next app open.
      setIsSubscribed(true);
      try {
        await saveSubscription({
          userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        });
      } catch (saveErr) {
        console.error("[push] saveSubscription failed", saveErr);
      }

      return true;
    } catch (err) {
      console.error("[push] subscribe failed", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId, saveSubscription]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await removeSubscription({ endpoint });
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("[push] unsubscribe failed", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, removeSubscription]);

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
