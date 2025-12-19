import { Id } from "@/convex/_generated/dataModel";

export interface ProfileData {
    user: {
        _id: Id<"users">;
        name: string;
        username?: string;
        image?: string;
        headerImage?: string;
        uni_name?: string;
        major?: string;
        semester?: number;
        bio?: string;
        createdAt?: number;
    };
    followerCount: number;
    followingCount: number;
    isFollowing?: boolean; // undefined if not logged in
    timestamp: number;
}

class ProfileCache {
    private cache = new Map<string, ProfileData>();
    private readonly STORAGE_KEY = "hellouni_profile_cache";
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
                    this.cache.set(key, value as ProfileData);
                });
            }
        } catch (e) {
            console.error("Failed to load profile cache", e);
        }
    }

    private saveToStorage() {
        if (typeof window === "undefined") return;
        try {
            const obj = Object.fromEntries(this.cache.entries());
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
        } catch (e) {
            console.error("Failed to save profile cache", e);
        }
    }

    getKey(username: string, viewerId?: string): string {
        return `${username}:${viewerId ?? "anon"}`;
    }

    get(key: string): ProfileData | undefined {
        const data = this.cache.get(key);
        if (!data) return undefined;

        if (Date.now() - data.timestamp > this.MAX_AGE) {
            this.cache.delete(key);
            this.saveToStorage();
            return undefined;
        }

        return data;
    }

    set(key: string, data: Omit<ProfileData, "timestamp">) {
        this.cache.set(key, { ...data, timestamp: Date.now() });
        this.saveToStorage();
    }

    delete(key: string) {
        this.cache.delete(key);
        this.saveToStorage();
    }
}

export const profileCache = new ProfileCache();
