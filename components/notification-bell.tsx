"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface NotificationBellProps {
    userId: Id<"users">;
}

export function NotificationBell({ userId }: NotificationBellProps) {
    const notificationData = useQuery(api.notifications.get, { userId });

    const unreadCount = notificationData?.unreadCount ?? 0;

    return (
        <Link
            href="/notifications"
            className="relative flex items-center justify-center w-11 h-11 transition-opacity hover:opacity-70"
            style={{
                willChange: "opacity",
                transform: "translateZ(0)",
                backfaceVisibility: "hidden",
            }}
            aria-label={`Benachrichtigungen${unreadCount > 0 ? ` (${unreadCount} ungelesen)` : ""}`}
        >
            <Bell
                className="w-7 h-7"
                style={{
                    color: "#000000",
                    fill: "none",
                    stroke: "#000000",
                    strokeWidth: 2,
                }}
            />
            {unreadCount > 0 && (
                <div
                    className="absolute flex items-center justify-center"
                    style={{
                        top: "2px",
                        right: "2px",
                        minWidth: "20px",
                        height: "20px",
                        padding: "0 5px",
                        backgroundColor: "#FF3B30",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#FFFFFF",
                        lineHeight: "20px",
                    }}
                >
                    {unreadCount > 99 ? "99+" : unreadCount}
                </div>
            )}
        </Link>
    );
}
