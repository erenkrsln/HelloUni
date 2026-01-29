import { Id } from "@/convex/_generated/dataModel";

export interface PostCacheData {
    post: any; // Using any for simplicity as it's a direct copy of the query result
    timestamp: number;
}

class PostCache {
    private cache = new Map<string, PostCacheData>();
    private readonly STORAGE_KEY = "hellouni_post_cache";
    private readonly MAX_AGE = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        if (typeof window === "undefined") return;
        try {
            const stored = sessionStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                Object.entries(parsed).forEach(([key, value]) => {
                    this.cache.set(key, value as PostCacheData);
                });
            }
        } catch (e) {
            console.error("Failed to load post cache", e);
        }
    }

    private saveToStorage() {
        if (typeof window === "undefined") return;
        try {
            const obj = Object.fromEntries(this.cache.entries());
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
        } catch (e) {
            console.error("Failed to save post cache", e);
        }
    }

    getKey(postId: string, viewerId?: string): string {
        return `${postId}:${viewerId ?? "anon"}`;
    }

    get(key: string): PostCacheData | undefined {
        const data = this.cache.get(key);
        if (!data) return undefined;

        if (Date.now() - data.timestamp > this.MAX_AGE) {
            this.cache.delete(key);
            this.saveToStorage();
            return undefined;
        }

        return data;
    }

    set(key: string, post: any) {
        this.cache.set(key, { post, timestamp: Date.now() });
        this.saveToStorage();
    }

    delete(key: string) {
        this.cache.delete(key);
        this.saveToStorage();
    }
}

export const postCache = new PostCache();
