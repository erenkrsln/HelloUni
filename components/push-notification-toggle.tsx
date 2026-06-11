"use client";

import { Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Inline banner that lets the user enable/disable Web Push notifications.
 * Renders nothing on unsupported browsers.
 */
export function PushNotificationToggle({ userId }: { userId: Id<"users"> | undefined }) {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications(userId);

  if (!isSupported) return null;

  const blocked = permission === "denied";

  return (
    <div className="mx-4 my-3 flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-[#D08945]" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-black">Push-Benachrichtigungen</p>
          <p className="truncate text-xs text-gray-500">
            {blocked
              ? "In den Browser-Einstellungen blockiert"
              : isSubscribed
                ? "Aktiviert auf diesem Gerät"
                : "Erhalte Benachrichtigungen auch wenn die App geschlossen ist"}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={isLoading || blocked || !userId}
        onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
        className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          isSubscribed
            ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
            : "bg-[#D08945] text-white hover:bg-[#b9763a]"
        }`}
      >
        {isLoading ? "…" : isSubscribed ? "Aus" : "Aktivieren"}
      </button>
    </div>
  );
}
