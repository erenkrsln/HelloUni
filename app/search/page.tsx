"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LoadingScreen } from "@/components/ui/spinner";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Search, MapPin, GraduationCap } from "lucide-react";
import { FeedCard } from "@/components/feed-card";
import Link from "next/link";

export default function SearchPage() {
    const [isFirstVisit, setIsFirstVisit] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [filterType, setFilterType] = useState<"all" | "people" | "posts">("all");

    // Simple debounce for search query
    const [debouncedQuery, setDebouncedQuery] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { currentUser, currentUserId } = useCurrentUser();

    // Queries - conditionally skip based on filter
    const shouldSearchUsers = filterType === "all" || filterType === "people";
    const shouldSearchPosts = filterType === "all" || filterType === "posts";

    const userResults = useQuery(
        api.queries.searchProfiles,
        shouldSearchUsers ? { searchTerm: debouncedQuery } : "skip"
    );

    const postResults = useQuery(
        api.queries.searchPosts,
        shouldSearchPosts ? { searchTerm: debouncedQuery, userId: currentUserId } : "skip"
    );

    useEffect(() => {
        // Prüfe, ob Seite bereits besucht wurde
        const visited = sessionStorage.getItem("search_visited");
        if (visited) {
            setIsFirstVisit(false);
        } else {
            // Markiere Seite als besucht nach kurzer Verzögerung
            const timer = setTimeout(() => {
                sessionStorage.setItem("search_visited", "true");
                setIsFirstVisit(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden bg-white header-spacing">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {isFirstVisit ? (
                <div className="px-4">
                    <LoadingScreen text="Seite wird geladen..." />
                </div>
            ) : (
                <div className="px-4 py-6">
                    {/* Filters */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <button
                            onClick={() => setFilterType("all")}
                            className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "all"
                                ? "bg-[#d08945] text-white"
                                : "bg-gray-100 text-gray-700"
                                }`}
                        >
                            Alle
                        </button>
                        <button
                            onClick={() => setFilterType("people")}
                            className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "people"
                                ? "bg-[#d08945] text-white"
                                : "bg-gray-100 text-gray-700"
                                }`}
                        >
                            Personen
                        </button>
                        <button
                            onClick={() => setFilterType("posts")}
                            className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "posts"
                                ? "bg-[#d08945] text-white"
                                : "bg-gray-100 text-gray-700"
                                }`}
                        >
                            Posts
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-8">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                            <Search className="h-5 w-5" />
                        </div>
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-full outline-none focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent placeholder-gray-400 transition-colors"
                            placeholder="Suchen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {!debouncedQuery ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Search className="w-12 h-12 mb-4 opacity-20" />
                            <p>
                                {filterType === "people"
                                    ? "Suche nach Personen"
                                    : filterType === "posts"
                                        ? "Suche nach Posts"
                                        : "Suche nach Personen oder Posts"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Personen Section */}
                            {shouldSearchUsers && (
                                <div>
                                    <h2 className="text-lg font-semibold mb-4 px-1">Personen</h2>
                                    {userResults === undefined ? (
                                        <div className="py-4 text-center text-sm text-gray-400">Laden...</div>
                                    ) : userResults.length === 0 ? (
                                        <div className="py-2 px-1 text-sm text-gray-500">Keine Personen gefunden.</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {userResults.map((user) => (
                                                <Link href={`/profile/${user.username}`} key={user._id} className="flex items-center p-2 rounded-xl hover:bg-gray-50 transition-colors">
                                                    <div className="w-12 h-12 rounded-full overflow-hidden mr-3 flex-shrink-0 relative bg-gray-200">
                                                        {user.image ? (
                                                            <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center font-semibold text-gray-500">
                                                                {user.name?.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
                                                        <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                                                        {(user.uni_name || user.major) && (
                                                            <div className="flex items-center text-xs text-gray-400 mt-0.5 truncate gap-2">
                                                                {user.uni_name && (
                                                                    <span className="flex items-center truncate">
                                                                        <MapPin size={10} className="mr-1" />
                                                                        {user.uni_name}
                                                                    </span>
                                                                )}
                                                                {user.major && (
                                                                    <span className="flex items-center truncate">
                                                                        <GraduationCap size={10} className="mr-1" />
                                                                        {user.major}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Beiträge Section */}
                            {shouldSearchPosts && (
                                <div>
                                    <h2 className="text-lg font-semibold mb-4 px-1">Beiträge</h2>
                                    {postResults === undefined ? (
                                        <div className="py-4 text-center text-sm text-gray-400">Laden...</div>
                                    ) : postResults.length === 0 ? (
                                        <div className="py-2 px-1 text-sm text-gray-500">Keine Beiträge gefunden.</div>
                                    ) : (
                                        <div className="space-y-0">
                                            {postResults.map((post, index) => (
                                                <FeedCard
                                                    key={post._id}
                                                    post={post}
                                                    currentUserId={currentUserId}
                                                    showDivider={index < postResults.length - 1}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            <BottomNavigation />
        </main>
    );
}
