"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Filter/settings icon in the notifications header. Opens a small menu with an
 * iOS-style switch to enable/disable Web Push notifications on this device.
 */
export function NotificationSettingsMenu({ userId }: { userId: Id<"users"> | undefined }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications(userId);

  // Close the menu when clicking outside of it.
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const blocked = permission === "denied";
  const switchDisabled = !isSupported || isLoading || blocked || !userId;

  const handleToggle = () => {
    if (switchDisabled) return;
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  const statusText = !isSupported
    ? "Auf diesem Gerät nicht verfügbar"
    : blocked
      ? "In den Browser-Einstellungen blockiert"
      : isSubscribed
        ? "Aktiviert auf diesem Gerät"
        : "Erhalte Mitteilungen aufs Gerät";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Benachrichtigungseinstellungen"
        aria-expanded={open}
        className="p-1 text-black hover:opacity-70 transition-opacity"
      >
        <SlidersHorizontal className="w-6 h-6" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl z-[60]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-black">Push-Benachrichtigungen</p>
              <p className="mt-0.5 text-xs text-gray-500">{statusText}</p>
            </div>

            {/* iOS-style toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isSubscribed}
              disabled={switchDisabled}
              onClick={handleToggle}
              className={`relative inline-flex h-[31px] w-[51px] flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 ${
                isSubscribed ? "bg-[#34C759]" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                  isSubscribed ? "translate-x-[22px]" : "translate-x-[2px]"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
