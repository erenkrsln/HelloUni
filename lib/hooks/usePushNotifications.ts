"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Convert a base64url VAPID key to the Uint8Array the Push API expects. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
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

      await saveSubscription({
        userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });

      setIsSubscribed(true);
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
