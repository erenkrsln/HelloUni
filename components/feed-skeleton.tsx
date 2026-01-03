import { Skeleton } from "@/components/ui/skeleton";

export function FeedSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="bg-white p-5 border-b border-gray-100"
                >
                    <div className="flex items-start gap-4 mb-4">
                        <Skeleton
                            className="rounded-full flex-shrink-0"
                            style={{
                                height: "48px",
                                width: "48px",
                                backgroundColor: "rgb(229, 231, 235)",
                            }}
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                            <Skeleton
                                className="h-4 w-32"
                                style={{ backgroundColor: "rgb(229, 231, 235)" }}
                            />
                            <Skeleton
                                className="h-3 w-48"
                                style={{ backgroundColor: "rgb(243, 244, 246)" }}
                            />
                        </div>
                    </div>
                    <div className="space-y-2 mb-4">
                        <Skeleton
                            className="h-4 w-full"
                            style={{ backgroundColor: "rgb(229, 231, 235)" }}
                        />
                        <Skeleton
                            className="h-4 w-3/4"
                            style={{ backgroundColor: "rgb(243, 244, 246)" }}
                        />
                    </div>
                    <div
                        className="flex items-center gap-6 pt-3"
                        style={{ borderTop: "1px solid rgb(243, 244, 246)" }}
                    >
                        <Skeleton
                            className="h-5 w-12"
                            style={{ backgroundColor: "rgb(229, 231, 235)" }}
                        />
                        <Skeleton
                            className="h-5 w-12"
                            style={{ backgroundColor: "rgb(229, 231, 235)" }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
