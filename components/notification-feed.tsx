"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { NotificationItem } from "./notification-item";
import { NotificationFeedSkeleton } from "./notification-feed-skeleton";

interface NotificationFeedProps {
    userId: Id<"users">;
}

import { isToday, isThisWeek } from "date-fns";

export function NotificationFeed({ userId }: NotificationFeedProps) {
    const notificationData = useQuery(api.notifications.get, { userId });

    if (!notificationData) {
        return <NotificationFeedSkeleton />;
    }

    if (notificationData.notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="text-center">
                    <p className="text-gray-500 text-base">
                        Keine Benachrichtigungen vorhanden
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                        Du wirst hier benachrichtigt, wenn jemand dir folgt oder mit deinen Beiträgen interagiert.
                    </p>
                </div>
            </div>
        );
    }

    // Group notifications
    const groupedNotifications = {
        today: notificationData.notifications.filter(n => isToday(new Date(n.createdAt))),
        thisWeek: notificationData.notifications.filter(n => !isToday(new Date(n.createdAt)) && isThisWeek(new Date(n.createdAt), { weekStartsOn: 1 })),
        earlier: notificationData.notifications.filter(n => !isToday(new Date(n.createdAt)) && !isThisWeek(new Date(n.createdAt), { weekStartsOn: 1 })),
    };

    const hasToday = groupedNotifications.today.length > 0;
    const hasThisWeek = groupedNotifications.thisWeek.length > 0;
    const hasEarlier = groupedNotifications.earlier.length > 0;

    return (
        <div className="pb-20">
            {hasToday && (
                <div className="relative">
                    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-50 px-4 py-3">
                        <h2 className="font-bold text-[16px]">Heute</h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {groupedNotifications.today.map((notification) => (
                            <NotificationItem
                                key={notification._id}
                                notification={notification as any}
                                currentUserId={userId}
                            />
                        ))}
                    </div>
                </div>
            )}

            {hasThisWeek && (
                <div className="relative">
                    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-50 px-4 py-3">
                        <h2 className="font-bold text-[16px]">Diese Woche</h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {groupedNotifications.thisWeek.map((notification) => (
                            <NotificationItem
                                key={notification._id}
                                notification={notification as any}
                                currentUserId={userId}
                            />
                        ))}
                    </div>
                </div>
            )}

            {hasEarlier && (
                <div className="relative">
                    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-50 px-4 py-3">
                        <h2 className="font-bold text-[16px]">Früher</h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {groupedNotifications.earlier.map((notification) => (
                            <NotificationItem
                                key={notification._id}
                                notification={notification as any}
                                currentUserId={userId}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
