import { Skeleton } from "@/components/ui/skeleton";

export function FeedSkeleton() {
    return (
        <div className="space-y-6">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="backdrop-blur-sm p-5"
                    style={{
                        borderRadius: "var(--border-radius-card)",
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                    }}
                >
                    <div className="flex items-start gap-4 mb-4">
                        <Skeleton
                            className="rounded-full"
                            style={{
                                height: "56px",
                                width: "56px",
                                backgroundColor: "rgba(244, 207, 171, 0.1)",
                            }}
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                            <Skeleton
                                className="h-4 w-32"
                                style={{ backgroundColor: "rgba(244, 207, 171, 0.1)" }}
                            />
                            <Skeleton
                                className="h-3 w-48"
                                style={{ backgroundColor: "rgba(244, 207, 171, 0.1)" }}
                            />
                        </div>
                    </div>
                    <div className="space-y-2 mb-4">
                        <Skeleton
                            className="h-4 w-full"
                            style={{ backgroundColor: "rgba(244, 207, 171, 0.1)" }}
                        />
                        <Skeleton
                            className="h-4 w-3/4"
                            style={{ backgroundColor: "rgba(244, 207, 171, 0.1)" }}
                        />
                    </div>
                    <div
                        className="flex items-center gap-6 pt-3"
                        style={{ borderTop: "1px solid rgba(244, 207, 171, 0.2)" }}
                    >
                        <Skeleton
                            className="h-5 w-12"
                            style={{ backgroundColor: "rgba(244, 207, 171, 0.1)" }}
                        />
                        <Skeleton
                            className="h-5 w-12"
                            style={{ backgroundColor: "rgba(244, 207, 171, 0.1)" }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
