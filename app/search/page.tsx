"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LoadingScreen } from "@/components/ui/spinner";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Search, MapPin, X, ChevronDown, Filter, UserPlus, MessageCircle, FileText, LayoutGrid } from "lucide-react";
import { FeedCard } from "@/components/feed-card";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface StaticPageResult {
    title: string;
    description: string;
    href: string;
    keywords: string[];
    category: string;
}

const STATIC_PAGES: StaticPageResult[] = [
    {
        title: "Über Uns",
        description: "Lerne das Team hinter HelloUni und unsere Vision kennen.",
        href: "/about",
        keywords: ["ueber uns", "über uns", "about us", "team", "vision", "mitglieder", "wer sind wir", "projekt"],
        category: "Seite"
    },
    {
        title: "Impressum",
        description: "Rechtliches und Kontaktinformationen.",
        href: "/imprint",
        keywords: ["impressum", "imprint", "kontakt", "rechtliches", "anbieter", "adresse", "e-mail", "telefon"],
        category: "Seite"
    },
    {
        title: "Datenschutz",
        description: "Unsere Datenschutzerklärung.",
        href: "/privacy",
        keywords: ["datenschutz", "datenschutzerklaerung", "datenschutzerklärung", "privacy", "sicherheit", "daten", "cookies", "dsgvo"],
        category: "Seite"
    },
    {
        title: "Startseite",
        description: "Der Hauptfeed mit allen neuen Beiträgen deiner Mitstudierenden.",
        href: "/home",
        keywords: ["home", "startseite", "feed", "beitraege", "beiträge", "neuigkeiten", "campus"],
        category: "Bereich"
    },
    {
        title: "Post erstellen",
        description: "Erstelle einen neuen Post, ein Treffen oder eine Umfrage.",
        href: "/create",
        keywords: ["beitrag erstellen", "post erstellen", "treffen erstellen", "umfrage erstellen", "erstellen", "posten", "neuer beitrag", "umfrage erstellen", "treffen planen", "plus", "schreiben"],
        category: "Bereich"
    },
    {
        title: "Benachrichtigungen",
        description: "Bleibe auf dem Laufenden über Likes, Kommentare und Erwähnungen.",
        href: "/notifications",
        keywords: ["benachrichtigungen", "notifications", "glocke", "aktivitaeten", "aktivitäten", "mitteilungen", "erwaehnungen", "erwähnungen", "likes", "kommentare"],
        category: "Bereich"
    },
    {
        title: "Chats",
        description: "Unterhalte dich privat oder in Gruppen mit deinen Kommilitonen.",
        href: "/chat",
        keywords: ["chats", "nachrichten", "chat", "mitteilungen", "unterhaltungen", "direktnachrichten", "messenger", "schreiben", "nachricht"],
        category: "Bereich"
    },
    {
        title: "Kalender",
        description: "Deine anstehenden privaten und öffentlichen Events und wichtige Termine.",
        href: "/calendar",
        keywords: ["kalender", "calendar", "termine", "events", "veranstaltungen", "planer", "zeitplan"],
        category: "Bereich"
    },
    {
        title: "Mein Profil",
        description: "Zeige und bearbeite dein Profil, deine Interessen und Beiträge.",
        href: "/profile",
        keywords: ["profil", "profile", "mein profil", "account", "konto", "studiengang", "interessen", "avatar", "profilbild", "meine beitraege", "meine beiträge"],
        category: "Bereich"
    }
];

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .trim();
}

function searchStaticPages(query: string): StaticPageResult[] {
    if (!query || query.trim().length === 0) return [];

    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];

    return STATIC_PAGES.filter(page => {
        if (normalizeText(page.title).includes(normalizedQuery)) return true;
        if (normalizeText(page.description).includes(normalizedQuery)) return true;
        return page.keywords.some(keyword => {
            const normalizedKeyword = normalizeText(keyword);
            return normalizedKeyword.includes(normalizedQuery) || normalizedQuery.includes(normalizedKeyword);
        });
    });
}

export default function SearchPage() {
    const router = useRouter();
    const [isFirstVisit, setIsFirstVisit] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [filterType, setFilterType] = useState<"all" | "groups" | "people" | "posts">("all");
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

    // Dropdown search query states
    const [userMajorSearch, setUserMajorSearch] = useState("");
    const [postAuthorMajorSearch, setPostAuthorMajorSearch] = useState("");
    const [postTypeSearch, setPostTypeSearch] = useState("");

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

    // Reset search queries when dropdowns close
    useEffect(() => {
        if (!isUserMajorOpen) setUserMajorSearch("");
    }, [isUserMajorOpen]);

    useEffect(() => {
        if (!isPostAuthorMajorOpen) setPostAuthorMajorSearch("");
    }, [isPostAuthorMajorOpen]);

    useEffect(() => {
        if (!isPostTypeOpen) setPostTypeSearch("");
    }, [isPostTypeOpen]);

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

    const POST_TYPES = [
        { value: "", label: "Alle Typen" },
        { value: "normal", label: "Beitrag" },
        { value: "spontaneous_meeting", label: "Spontanes Treffen" },
        { value: "recurring_meeting", label: "Regelmäßiges Treffen" },
        { value: "poll", label: "Umfrage" },
        { value: "announcement", label: "Ankündigung" }
    ];

    const filteredUserMajors = STUDY_PROGRAMS.filter((program) =>
        program.toLowerCase().includes(userMajorSearch.toLowerCase())
    );

    const filteredPostAuthorMajors = STUDY_PROGRAMS.filter((program) =>
        program.toLowerCase().includes(postAuthorMajorSearch.toLowerCase())
    );

    const filteredPostTypes = POST_TYPES.filter((type) =>
        type.label.toLowerCase().includes(postTypeSearch.toLowerCase())
    );

    // Simple debounce for search query
    const [debouncedQuery, setDebouncedQuery] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { currentUser, currentUserId } = useCurrentUser();
    const joinGroup = useMutation(api.mutations.joinPublicGroup);
    const requestToJoin = useMutation(api.mutations.requestToJoinPublicGroup);

    const isRecommendationMode = filterType === "people" && !debouncedQuery && !userMajor && !userInterests;

    // Queries - conditionally skip based on filter
    const shouldSearchGroups = filterType === "groups" || (filterType === "all" && !!debouncedQuery);
    const shouldSearchUsers = (filterType === "people" && !isRecommendationMode) || (filterType === "all" && !!debouncedQuery);
    const shouldSearchPosts = filterType === "posts" || (filterType === "all" && !!debouncedQuery);

    const pageResults = searchStaticPages(debouncedQuery);

    const groupResults = useQuery(
        api.queries.searchPublicGroups,
        shouldSearchGroups ? {
            searchTerm: debouncedQuery,
            sortBy,
            userId: currentUserId || undefined,
        } : "skip"
    );

    const userResults = useQuery(
        api.queries.searchProfiles,
        shouldSearchUsers ? {
            searchTerm: debouncedQuery,
            sortBy,
            // Only apply user filters if specifically in "people" tab
            major: filterType === "people" ? (userMajor || undefined) : undefined,
            interests: filterType === "people" && userInterests ? userInterests.split(",").map(i => i.trim()).filter(Boolean) : undefined
        } : "skip"
    );

    const compatibleUsers = useQuery(
        api.queries.getCompatibleUsers,
        isRecommendationMode ? {
            userId: currentUserId || undefined
        } : "skip"
    );

    const postResults = useQuery(
        api.queries.searchPosts,
        shouldSearchPosts ? {
            searchTerm: debouncedQuery,
            userId: currentUserId,
            sortBy,
            // Only apply post filters if specifically in "posts" tab
            postType: filterType === "posts" ? (postType || undefined) : undefined,
            major: filterType === "posts" ? (postAuthorMajor || undefined) : undefined
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
        <main className="min-h-screen w-full max-w-[428px] md:max-w-3xl mx-auto pb-24 overflow-x-hidden bg-white header-spacing">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {isFirstVisit ? (
                <div className="px-4">
                    <LoadingScreen text="Seite wird geladen..." />
                </div>
            ) : (
                <div className="px-4 py-6">
                    {/* Filters */}
                    <div className="flex flex-col gap-2 mb-6">
                        <button
                            onClick={() => setFilterType("all")}
                            className={`w-full px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "all"
                                ? "bg-[#d08945] text-white"
                                : "bg-gray-100 text-gray-700"
                                }`}
                        >
                            Gesamte App
                        </button>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => setFilterType("groups")}
                                className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "groups"
                                    ? "bg-[#d08945] text-white"
                                    : "bg-gray-100 text-gray-700"
                                    }`}
                            >
                                Gruppen
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
                                className={`p-2 rounded-full transition-colors flex-shrink-0 ${filterType === "groups" || filterType === "all" ? "invisible pointer-events-none" : ""
                                    } ${showAdvancedFilters || userMajor || userInterests || postType || postAuthorMajor
                                        ? "bg-[#d08945] text-white"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                            >
                                <Filter size={18} />
                            </button>
                        </div>

                        {/* Advanced Filters Panel */}
                        {showAdvancedFilters && filterType !== "groups" && filterType !== "all" && (
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
                                                    <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 flex flex-col">
                                                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                                                            <input
                                                                type="text"
                                                                placeholder="Studiengang suchen..."
                                                                value={userMajorSearch}
                                                                onChange={(e) => setUserMajorSearch(e.target.value)}
                                                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#D08945] focus:border-transparent"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="overflow-y-auto py-1 max-h-48">
                                                            {filteredUserMajors.length === 0 ? (
                                                                <div className="px-3 py-2 text-sm text-gray-500 italic">Keine Studiengänge gefunden</div>
                                                            ) : (
                                                                filteredUserMajors.map((program) => (
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
                                                                ))
                                                            )}
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
                                                    <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 flex flex-col">
                                                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                                                            <input
                                                                type="text"
                                                                placeholder="Studiengang suchen..."
                                                                value={postAuthorMajorSearch}
                                                                onChange={(e) => setPostAuthorMajorSearch(e.target.value)}
                                                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#D08945] focus:border-transparent"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="overflow-y-auto py-1 max-h-48">
                                                            {filteredPostAuthorMajors.length === 0 ? (
                                                                <div className="px-3 py-2 text-sm text-gray-500 italic">Keine Studiengänge gefunden</div>
                                                            ) : (
                                                                filteredPostAuthorMajors.map((program) => (
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
                                                                ))
                                                            )}
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
                                                    <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 flex flex-col">
                                                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                                                            <input
                                                                type="text"
                                                                placeholder="Typ suchen..."
                                                                value={postTypeSearch}
                                                                onChange={(e) => setPostTypeSearch(e.target.value)}
                                                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#D08945] focus:border-transparent"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="overflow-y-auto py-1 max-h-48">
                                                            {filteredPostTypes.length === 0 ? (
                                                                <div className="px-3 py-2 text-sm text-gray-500 italic">Keine Typen gefunden</div>
                                                            ) : (
                                                                filteredPostTypes.map((type) => (
                                                                    <button
                                                                        key={type.value}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setPostType(type.value);
                                                                            setIsPostTypeOpen(false);
                                                                        }}
                                                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${postType === type.value ? "bg-gray-50 text-[#D08945] font-medium" : "text-gray-700"}`}
                                                                    >
                                                                        {type.label}
                                                                    </button>
                                                                ))
                                                            )}
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

                    {
                        // Calculate if we should show results based on query and active filters
                        (() => {
                            const hasQuery = !!debouncedQuery;
                            const hasUserFilters = filterType === "people" && (!!userMajor || !!userInterests);
                            const hasPostFilters = filterType === "posts" && (!!postType || !!postAuthorMajor);
                            const shouldShowResults = filterType === "groups" || hasQuery || hasUserFilters || hasPostFilters || filterType === "people";

                            if (!shouldShowResults) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                        <Search className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="text-center px-4">
                                            {(filterType as string) === "people"
                                                ? "Suche nach Personen"
                                                : filterType === "posts"
                                                    ? "Suche nach Posts"
                                                    : filterType === "all"
                                                        ? "Suche in der gesamten App (Seiten, Gruppen, Personen, Beiträge)..."
                                                        : "Suche nach Gruppen"}
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-8">
                                    {/* Gruppen Section */}
                                    {filterType === "groups" && (
                                        <div>
                                            <h2 className="text-lg font-semibold mb-4 px-1">Öffentliche Gruppen</h2>
                                            {groupResults === undefined || !currentUserId ? (
                                                <div className="py-4 text-center text-sm text-gray-400 font-normal">Laden...</div>
                                            ) : groupResults.length === 0 ? (
                                                <div className="py-2 px-1 text-sm text-gray-500 font-normal">Keine öffentlichen Gruppen gefunden.</div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {groupResults.map((group) => {
                                                        const isMember = currentUserId ? group.participants.includes(currentUserId) : false;
                                                        return (
                                                            <div key={group._id} className="flex items-center p-3 rounded-xl hover:bg-gray-50">
                                                                <div className="w-12 h-12 rounded-full overflow-hidden mr-3 flex-shrink-0 relative bg-gray-200">
                                                                    {group.displayImage ? (
                                                                        <img src={group.displayImage} alt={group.displayName} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center font-bold ">
                                                                            {group.displayName?.charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0 mr-2">
                                                                    <h3 className="font-semibold text-gray-900 truncate">{group.displayName}</h3>
                                                                    <p className="text-xs text-gray-500 mt-0.5 font-normal">
                                                                        {group.participants.length} Mitglieder
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    {isMember ? (
                                                                        <Link
                                                                            href={`/chat/${group._id}`}
                                                                            className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-full transition-colors"
                                                                        >
                                                                            <MessageCircle size={13} />
                                                                            Öffnen
                                                                        </Link>
                                                                    ) : group.joinRequestStatus === "pending" ? (
                                                                        <button
                                                                            disabled
                                                                            className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 text-gray-400 text-xs font-semibold rounded-full cursor-not-allowed"
                                                                        >
                                                                            Angefragt
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={async () => {
                                                                                if (!currentUserId) return;
                                                                                try {
                                                                                    if (group.needsRequestToJoin) {
                                                                                        await requestToJoin({
                                                                                            conversationId: group._id,
                                                                                            userId: currentUserId,
                                                                                        });
                                                                                        alert("Beitrittsanfrage wurde gesendet!");
                                                                                    } else {
                                                                                        await joinGroup({
                                                                                            conversationId: group._id,
                                                                                            userId: currentUserId,
                                                                                        });
                                                                                        // Redirect to chat screen on join
                                                                                        router.push(`/chat/${group._id}`);
                                                                                    }
                                                                                } catch (err) {
                                                                                    console.error("Failed to perform join/request action:", err);
                                                                                    alert("Aktion fehlgeschlagen.");
                                                                                }
                                                                            }}
                                                                            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#D08945] hover:bg-[#b0733a] text-white text-xs font-semibold rounded-full transition-colors"
                                                                        >
                                                                            <UserPlus size={13} />
                                                                            {group.needsRequestToJoin ? "Anfragen" : "Beitreten"}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {/* Personen Section */}
                                    {filterType === "people" && (
                                        <div>
                                            {isRecommendationMode ? (
                                                <>
                                                    <h2 className="text-lg font-semibold mb-4 px-1">Vorschläge für dich</h2>
                                                    {compatibleUsers === undefined ? (
                                                        <div className="py-4 text-center text-sm text-gray-400">Laden...</div>
                                                    ) : compatibleUsers.length === 0 ? (
                                                        <div className="py-2 px-1 text-sm text-gray-500">Keine Vorschläge gefunden.</div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {compatibleUsers.map((user) => (
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
                                                </>
                                            ) : (
                                                <>
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
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Beiträge Section */}
                                    {filterType === "posts" && (
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

                                    {/* Gesamte App Section */}
                                    {filterType === "all" && (
                                        <div className="space-y-6">
                                            {/* Pages / Bereiche Section */}
                                            {pageResults.length > 0 && (
                                                <div>
                                                    <h2 className="text-lg font-semibold mb-4 px-1">Seiten & Bereiche</h2>
                                                    <div className="space-y-2">
                                                        {pageResults.map((page) => (
                                                            <Link
                                                                key={page.href}
                                                                href={page.href}
                                                                className="flex items-center p-3 rounded-xl hover:bg-gray-50 border border-gray-100 bg-white transition-colors"
                                                            >
                                                                <div className="w-10 h-10 rounded-full bg-[#D08945]/10 text-[#D08945] flex items-center justify-center mr-3 shrink-0">
                                                                    {page.category === "Seite" ? (
                                                                        <FileText size={20} />
                                                                    ) : (
                                                                        <LayoutGrid size={20} />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <h3 className="font-semibold text-gray-900 truncate">{page.title}</h3>

                                                                    </div>
                                                                    <p className="text-xs text-gray-500 mt-0.5 truncate">{page.description}</p>
                                                                </div>

                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Gruppen Section */}
                                            {groupResults !== undefined && groupResults.length > 0 && (
                                                <div>
                                                    <h2 className="text-lg font-semibold mb-4 px-1">Öffentliche Gruppen</h2>
                                                    <div className="space-y-3">
                                                        {groupResults.map((group) => {
                                                            const isMember = currentUserId ? group.participants.includes(currentUserId) : false;
                                                            return (
                                                                <div key={group._id} className="flex items-center p-3 rounded-xl hover:bg-gray-50 bg-white border border-gray-100">
                                                                    <div className="w-12 h-12 rounded-full overflow-hidden mr-3 flex-shrink-0 relative bg-gray-200">
                                                                        {group.displayImage ? (
                                                                            <img src={group.displayImage} alt={group.displayName} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center font-bold">
                                                                                {group.displayName?.charAt(0).toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 mr-2">
                                                                        <h3 className="font-semibold text-gray-900 truncate">{group.displayName}</h3>
                                                                        <p className="text-xs text-gray-500 mt-0.5 font-normal">
                                                                            {group.participants.length} Mitglieder
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        {isMember ? (
                                                                            <Link
                                                                                href={`/chat/${group._id}`}
                                                                                className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-full transition-colors"
                                                                            >
                                                                                <MessageCircle size={13} />
                                                                                Öffnen
                                                                            </Link>
                                                                        ) : group.joinRequestStatus === "pending" ? (
                                                                            <button
                                                                                disabled
                                                                                className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 text-gray-400 text-xs font-semibold rounded-full cursor-not-allowed"
                                                                            >
                                                                                Angefragt
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={async () => {
                                                                                    if (!currentUserId) return;
                                                                                    try {
                                                                                        if (group.needsRequestToJoin) {
                                                                                            await requestToJoin({
                                                                                                conversationId: group._id,
                                                                                                userId: currentUserId,
                                                                                            });
                                                                                            alert("Beitrittsanfrage wurde gesendet!");
                                                                                        } else {
                                                                                            await joinGroup({
                                                                                                conversationId: group._id,
                                                                                                userId: currentUserId,
                                                                                            });
                                                                                            router.push(`/chat/${group._id}`);
                                                                                        }
                                                                                    } catch (err) {
                                                                                        console.error("Failed to perform join/request action:", err);
                                                                                        alert("Aktion fehlgeschlagen.");
                                                                                    }
                                                                                }}
                                                                                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#D08945] hover:bg-[#b0733a] text-white text-xs font-semibold rounded-full transition-colors"
                                                                            >
                                                                                <UserPlus size={13} />
                                                                                {group.needsRequestToJoin ? "Anfragen" : "Beitreten"}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Personen Section */}
                                            {userResults !== undefined && userResults.length > 0 && (
                                                <div>
                                                    <h2 className="text-lg font-semibold mb-4 px-1">Personen</h2>
                                                    <div className="space-y-3">
                                                        {userResults.map((user) => (
                                                            <Link href={`/profile/${user.username}`} key={user._id} className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-colors bg-white">
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
                                                </div>
                                            )}

                                            {/* Beiträge Section */}
                                            {postResults !== undefined && postResults.length > 0 && (
                                                <div>
                                                    <h2 className="text-lg font-semibold mb-4 px-1">Beiträge</h2>
                                                    <div className="space-y-0 bg-white overflow-hidden pt-2">
                                                        {postResults.map((post, index) => (
                                                            <FeedCard
                                                                key={post._id}
                                                                post={post}
                                                                currentUserId={currentUserId}
                                                                showDivider={index < postResults.length - 1}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* General loading state while querying the database */}
                                            {(groupResults === undefined || userResults === undefined || postResults === undefined) && (
                                                <div className="py-8 text-center text-sm text-gray-400">
                                                    Suchen...
                                                </div>
                                            )}

                                            {/* Consolidated empty state */}
                                            {groupResults !== undefined &&
                                                userResults !== undefined &&
                                                postResults !== undefined &&
                                                pageResults.length === 0 &&
                                                groupResults.length === 0 &&
                                                userResults.length === 0 &&
                                                postResults.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                                        <Search className="w-12 h-12 mb-4 opacity-20" />
                                                        <p>Keine Ergebnisse für "{debouncedQuery}" gefunden.</p>
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    }
                </div>
            )}
            <BottomNavigation />
        </main>
    );
}
