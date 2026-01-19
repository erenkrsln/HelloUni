import { Skeleton } from "@/components/ui/skeleton";

export function NotificationFeedSkeleton() {
    return (
        <div className="divide-y divide-gray-100">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center justify-between w-full p-4">
                    <div className="flex items-center gap-3 flex-1">
                        {/* Avatar */}
                        <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />

                        {/* Text Content */}
                        <div className="flex flex-col flex-1 gap-2 mr-4">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/4" />
                        </div>
                    </div>

                    {/* Right side thumbnail or button */}
                    <Skeleton className="w-10 h-10 rounded-md flex-shrink-0" />
                </div>
            ))}
        </div>
    );
}
