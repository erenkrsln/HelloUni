"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LoadingScreen } from "@/components/ui/spinner";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Search, MapPin, GraduationCap, X, ChevronDown, Filter, FileText, Calendar, Link as LinkIcon, BarChart2, Bell } from "lucide-react";
import { FeedCard } from "@/components/feed-card";
import Link from "next/link";

export default function SearchPage() {
    const [isFirstVisit, setIsFirstVisit] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [filterType, setFilterType] = useState<"all" | "people" | "posts">("all");
    const [sortBy, setSortBy] = useState<"recent" | "alphabetical">("alphabetical");

    // Advanced Filters State
    const [userMajor, setUserMajor] = useState("");
    const [userInterests, setUserInterests] = useState(""); // Comma separated
    const [postType, setPostType] = useState("");
    const [postAuthorMajor, setPostAuthorMajor] = useState("");

    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Dropdown open states
    const [isUserMajorOpen, setIsUserMajorOpen] = useState(false);
    const [isPostTypeOpen, setIsPostTypeOpen] = useState(false);
    const [isPostAuthorMajorOpen, setIsPostAuthorMajorOpen] = useState(false);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isUserMajorOpen) {
                const target = event.target as HTMLElement;
                if (!target.closest('.user-major-dropdown')) {
                    setIsUserMajorOpen(false);
                }
            }
            if (isPostTypeOpen) {
                const target = event.target as HTMLElement;
                if (!target.closest('.post-type-dropdown')) {
                    setIsPostTypeOpen(false);
                }
            }
            if (isPostAuthorMajorOpen) {
                const target = event.target as HTMLElement;
                if (!target.closest('.post-author-major-dropdown')) {
                    setIsPostAuthorMajorOpen(false);
                }
            }
        };

        if (isUserMajorOpen || isPostTypeOpen || isPostAuthorMajorOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isUserMajorOpen, isPostTypeOpen, isPostAuthorMajorOpen]);

    // Liste der Studiengänge (alphabetisch sortiert)
    const STUDY_PROGRAMS = [
        "Angewandte Chemie (B.Sc.)",
        "Angewandte Materialwissenschaften (B.Eng.)",
        "Angewandte Mathematik und Physik (B.Sc.)",
        "Architektur (B.A.)",
        "Bauingenieurwesen (B.Eng.)",
        "Betriebswirtschaft (B.A.)",
        "Betriebswirtschaft berufsbegleitend (B.A.)",
        "Computational Materials Engineering mit KI (B.Eng.)",
        "Design (B.A.)",
        "Digitales Gesundheitsmanagement (B.Sc.)",
        "Elektrotechnik und Informationstechnik (B.Eng.)",
        "Energie- und Gebäudetechnik (B.Eng.)",
        "Energie- und regenerative Technik (B.Eng.)",
        "Energie- und Wasserstofftechnik (B.Eng.)",
        "Fahrzeugtechnik (B.Eng.)",
        "Hebammenwissenschaft (B.Sc.)",
        "Informatik (B.Sc.)",
        "Ingenieurpädagogik (B.Sc.)",
        "International Business (B.A.)",
        "International Business and Technology (B.Eng.)",
        "Maschinenbau (B.Eng.)",
        "Management in der Ökobranche (B.A.)",
        "Mechanical Engineering (B.Eng.)",
        "Media Engineering (B.Eng.)",
        "Medieninformatik (B.Sc.)",
        "Medizintechnik (B.Eng.)",
        "Mechatronik / Feinwerktechnik (B.Eng.)",
        "Prozessingenieurwesen (B.Eng.)",
        "Public Management (B.A.)",
        "Social Data Science & Communication (B.Sc.)",
        "Soziale Arbeit (B.A.)",
        "Soziale Arbeit: Erziehung und Bildung im Lebenslauf (B.A.)",
        "Technikjournalismus / Technik-PR (B.A.)",
        "Wirtschaftsinformatik (B.Sc.)",
    ];

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
        shouldSearchUsers ? {
            searchTerm: debouncedQuery,
            sortBy,
            major: userMajor || undefined,
            interests: userInterests ? userInterests.split(",").map(i => i.trim()).filter(Boolean) : undefined
        } : "skip"
    );

    const postResults = useQuery(
        api.queries.searchPosts,
        shouldSearchPosts ? {
            searchTerm: debouncedQuery,
            userId: currentUserId,
            sortBy,
            postType: postType || undefined,
            major: postAuthorMajor || undefined
        } : "skip"
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
                    <div className="relative mb-4">
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

                    {/* Sorting & Filter Controls */}
                    <div className="mb-8">
                        {/* Primary Controls Row */}
                        <div className="flex items-center justify-between gap-3 mb-4 px-1">
                            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar flex-1">
                                <span className="text-sm text-gray-500 whitespace-nowrap">Sortieren nach:</span>
                                <button
                                    onClick={() => setSortBy("alphabetical")}
                                    className={`text-sm px-3 py-1 rounded-full transition-colors whitespace-nowrap font-medium ${sortBy === "alphabetical"
                                        ? "bg-gray-100 text-gray-700"
                                        : "text-gray-500 hover:bg-gray-100"
                                        }`}
                                >
                                    Alphabetisch
                                </button>
                                <button
                                    onClick={() => setSortBy("recent")}
                                    className={`text-sm px-3 py-1 rounded-full transition-colors whitespace-nowrap font-medium ${sortBy === "recent"
                                        ? "bg-gray-100 text-gray-700"
                                        : "text-gray-500 hover:bg-gray-100"
                                        }`}
                                >
                                    Neueste
                                </button>
                            </div>

                            <button
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className={`p-2 rounded-full transition-colors flex-shrink-0 ${filterType === "all" ? "invisible pointer-events-none" : ""
                                    } ${showAdvancedFilters || userMajor || userInterests || postType || postAuthorMajor
                                        ? "bg-[#d08945] text-white"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                            >
                                <Filter size={18} />
                            </button>
                        </div>

                        {/* Advanced Filters Panel */}
                        {showAdvancedFilters && filterType !== "all" && (
                            <div className="bg-gray-50 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 text-sm border border-gray-100 shadow-sm">
                                {filterType === "people" && (
                                    <>
                                        <div className="space-y-1 user-major-dropdown relative">
                                            <label className="text-xs font-medium text-gray-500 ml-1">Studiengang</label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsUserMajorOpen(!isUserMajorOpen)}
                                                    className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent"
                                                >
                                                    <span className={userMajor ? "text-gray-900" : "text-gray-400"}>
                                                        {userMajor || "Wähle einen Studiengang"}
                                                    </span>
                                                    {userMajor ? (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setUserMajor("");
                                                            }}
                                                            className="mr-1 p-0.5 rounded-full hover:bg-gray-100 text-gray-400"
                                                        >
                                                            <X size={14} />
                                                        </div>
                                                    ) : (
                                                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isUserMajorOpen ? "rotate-180" : ""}`} />
                                                    )}
                                                </button>

                                                {isUserMajorOpen && (
                                                    <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                                                        <div className="py-1">
                                                            {STUDY_PROGRAMS.map((program) => (
                                                                <button
                                                                    key={program}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setUserMajor(program);
                                                                        setIsUserMajorOpen(false);
                                                                    }}
                                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${userMajor === program ? "bg-gray-50 text-[#D08945] font-medium" : "text-gray-700"}`}
                                                                >
                                                                    {program}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </>
                                )}

                                {filterType === "posts" && (
                                    <>
                                        <div className="space-y-1 post-author-major-dropdown relative">
                                            <label className="text-xs font-medium text-gray-500 ml-1">Studiengang</label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPostAuthorMajorOpen(!isPostAuthorMajorOpen)}
                                                    className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent"
                                                >
                                                    <span className={postAuthorMajor ? "text-gray-900" : "text-gray-400"}>
                                                        {postAuthorMajor || "Wähle einen Studiengang"}
                                                    </span>
                                                    {postAuthorMajor ? (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPostAuthorMajor("");
                                                            }}
                                                            className="mr-1 p-0.5 rounded-full hover:bg-gray-100 text-gray-400"
                                                        >
                                                            <X size={14} />
                                                        </div>
                                                    ) : (
                                                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isPostAuthorMajorOpen ? "rotate-180" : ""}`} />
                                                    )}
                                                </button>

                                                {isPostAuthorMajorOpen && (
                                                    <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                                                        <div className="py-1">
                                                            {STUDY_PROGRAMS.map((program) => (
                                                                <button
                                                                    key={program}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setPostAuthorMajor(program);
                                                                        setIsPostAuthorMajorOpen(false);
                                                                    }}
                                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${postAuthorMajor === program ? "bg-gray-50 text-[#D08945] font-medium" : "text-gray-700"}`}
                                                                >
                                                                    {program}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1 post-type-dropdown relative">
                                            <label className="text-xs font-medium text-gray-500 ml-1">Post Typ</label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPostTypeOpen(!isPostTypeOpen)}
                                                    className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent"
                                                >
                                                    <div className="flex items-center gap-2 text-gray-900">
                                                        {postType === "" && <span className="text-gray-400">Alle Typen</span>}
                                                        {postType === "normal" && <>Beitrag</>}
                                                        {postType === "spontaneous_meeting" && <>Spontanes Treffen</>}
                                                        {postType === "recurring_meeting" && <>Regelmäßiges Treffen</>}
                                                        {postType === "poll" && <>Umfrage</>}
                                                        {postType === "announcement" && <>Ankündigung</>}
                                                    </div>
                                                    {postType ? (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPostType("");
                                                            }}
                                                            className="mr-1 p-0.5 rounded-full hover:bg-gray-100 text-gray-400"
                                                        >
                                                            <X size={14} />
                                                        </div>
                                                    ) : (
                                                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isPostTypeOpen ? "rotate-180" : ""}`} />
                                                    )}
                                                </button>

                                                {isPostTypeOpen && (
                                                    <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                                                        <div className="py-1">
                                                            <button onClick={() => { setPostType(""); setIsPostTypeOpen(false); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${postType === "" ? "bg-gray-50 text-[#D08945] font-medium" : "text-gray-700"}`}>Alle Typen</button>
                                                            <button onClick={() => { setPostType("normal"); setIsPostTypeOpen(false); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${postType === "normal" ? "bg-gray-50 text-[#D08945] font-medium" : "text-gray-700"}`}> Beitrag</button>
                                                            <button onClick={() => { setPostType("spontaneous_meeting"); setIsPostTypeOpen(false); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${postType === "spontaneous_meeting" ? "bg-gray-50 text-[#D08945] font-medium" : "text-gray-700"}`}> Spontanes Treffen</button>
                                                            <button onClick={() => { setPostType("recurring_meeting"); setIsPostTypeOpen(false); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${postType === "recurring_meeting" ? "bg-gray-50 text-[#D08945] font-medium" : "text-gray-700"}`}> Regelmäßiges Treffen</button>
                                                            <button onClick={() => { setPostType("poll"); setIsPostTypeOpen(false); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${postType === "poll" ? "bg-gray-50 text-[#D08945] font-medium" : "text-gray-700"}`}> Umfrage</button>
                                                            <button onClick={() => { setPostType("announcement"); setIsPostTypeOpen(false); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${postType === "announcement" ? "bg-gray-50 text-[#D08945] font-medium" : "text-gray-700"}`}> Ankündigung</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>


                                    </>
                                )}
                            </div>
                        )}
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
