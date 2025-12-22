"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LoadingScreen } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { ImagePlus, X, ChevronDown } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";

export default function CreatePage() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { currentUser, currentUserId } = useCurrentUser();
    const [isFirstVisit, setIsFirstVisit] = useState(true);

    // Prüfe, ob Seite bereits besucht wurde
    useEffect(() => {
        const visited = sessionStorage.getItem("create_visited");
        if (visited) {
            setIsFirstVisit(false);
        } else {
            // Markiere Seite als besucht nach kurzer Verzögerung
            const timer = setTimeout(() => {
                sessionStorage.setItem("create_visited", "true");
                setIsFirstVisit(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, []);

    // Zeige Loading Spinner nur beim ersten Besuch, sonst warte auf gecachte Daten
    const isLoading = isFirstVisit && currentUser === undefined;
    const [postType, setPostType] = useState<"normal" | "spontaneous_meeting" | "recurring_meeting" | "announcement" | "poll">("normal");
    const [isPostTypeOpen, setIsPostTypeOpen] = useState(false);
    const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Mention autocomplete state
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionSearchTerm, setMentionSearchTerm] = useState("");
    const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(-1);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mentionDropdownRef = useRef<HTMLDivElement>(null);

    // Search users for mentions
    const mentionUsers = useQuery(
        api.queries.searchUsers,
        mentionSearchTerm ? { searchTerm: mentionSearchTerm } : "skip"
    );
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Event fields
    const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
    const [eventTime, setEventTime] = useState("");
    const [participantLimit, setParticipantLimit] = useState<number | undefined>(undefined);
    const [recurrencePattern, setRecurrencePattern] = useState("");

    // Schließe Dropdown wenn außerhalb geklickt wird
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isPostTypeOpen) {
                const target = event.target as HTMLElement;
                if (!target.closest('.post-type-dropdown')) {
                    setIsPostTypeOpen(false);
                }
            }
            if (isRecurrenceOpen) {
                const target = event.target as HTMLElement;
                if (!target.closest('.recurrence-dropdown')) {
                    setIsRecurrenceOpen(false);
                }
            }
        };

        if (isPostTypeOpen || isRecurrenceOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPostTypeOpen, isRecurrenceOpen]);

    // Poll fields
    const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

    // Mutations werden sofort initialisiert, blockieren nicht
    const createPost = useMutation(api.mutations.createPost);
    const generateUploadUrl = useMutation(api.mutations.generateUploadUrl);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUser || !content.trim() || isSubmitting) return;

        // Validierung je nach Post-Typ
        if ((postType === "spontaneous_meeting" || postType === "recurring_meeting") && !eventDate) {
            alert("Bitte gib ein Datum für das Treffen an.");
            return;
        }

        if (postType === "poll") {
            const validOptions = pollOptions.filter(opt => opt.trim() !== "");
            if (validOptions.length < 2) {
                alert("Bitte gib mindestens 2 Umfrage-Optionen an.");
                return;
            }
        }

        // Speichere die Daten, bevor wir die Weiterleitung machen
        const postContent = content.trim();
        const postImage = selectedImage;

        // Sofort zur /home weiterleiten
        router.push("/home");

        // Post im Hintergrund erstellen (ohne auf UI-Updates zu warten)
        (async () => {
            try {
                let imageUrl: string | undefined = undefined;

                // Bild hochladen, falls ausgewählt
                if (postImage) {
                    const uploadUrl = await generateUploadUrl();
                    const result = await fetch(uploadUrl, {
                        method: "POST",
                        headers: { "Content-Type": postImage.type },
                        body: postImage,
                    });
                    const { storageId } = await result.json();
                    imageUrl = storageId;
                }

                // Event-Datum konvertieren
                let eventDateTimestamp: number | undefined = undefined;
                if (eventDate) {
                    const dateStr = eventDate.toISOString().split('T')[0];
                    const dateTime = eventTime ? `${dateStr}T${eventTime}` : dateStr;
                    eventDateTimestamp = new Date(dateTime).getTime();
                }

                // Poll-Optionen filtern
                const validPollOptions = postType === "poll"
                    ? pollOptions.filter(opt => opt.trim() !== "")
                    : undefined;

                // Tags aus Content extrahieren
                const extractedTags = extractTags(postContent);
                const validTags = extractedTags.length > 0 ? extractedTags : undefined;

                // Mentions aus Content extrahieren
                const extractedMentions = extractMentions(postContent);
                const validMentions = extractedMentions.length > 0 ? extractedMentions : undefined;

                // Post erstellen
                await createPost({
                    userId: currentUser._id,
                    postType,
                    title: title.trim() || undefined,
                    content: postContent,
                    imageUrl,
                    eventDate: eventDateTimestamp,
                    eventTime: eventTime || undefined,
                    participantLimit: participantLimit || undefined,
                    recurrencePattern: recurrencePattern || undefined,
                    pollOptions: validPollOptions,
                    tags: validTags,
                    mentions: validMentions,
                });
            } catch (error) {
                console.error("Fehler beim Erstellen des Posts:", error);
            }
        })();
    };

    // Extract tags from content (words starting with #)
    const extractTags = (text: string): string[] => {
        const tagRegex = /#(\w+)/g;
        const matches = text.match(tagRegex);
        if (!matches) return [];
        // Remove # and return unique tags
        return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
    };

    // Extract mentions from content (format: @username)
    const extractMentions = (text: string): string[] => {
        const mentionRegex = /@(\w+)/g;
        const matches = text.matchAll(mentionRegex);
        const usernames: string[] = [];
        for (const match of matches) {
            usernames.push(match[1].toLowerCase());
        }
        // Return unique usernames
        return [...new Set(usernames)];
    };

    const addPollOption = () => {
        setPollOptions([...pollOptions, ""]);
    };

    const updatePollOption = (index: number, value: string) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    const removePollOption = (index: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, i) => i !== index));
        }
    };

    // Handle content change and detect @ mentions
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        const cursorPos = e.target.selectionStart;
        setContent(newContent);
        setMentionCursorPosition(cursorPos);

        // Check if we're typing after @
        const textBeforeCursor = newContent.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            // Check if there's a space or newline after @ (if so, don't show dropdown)
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            if (!textAfterAt.match(/[\s\n]/)) {
                const searchTerm = textAfterAt;
                setMentionSearchTerm(searchTerm);
                setShowMentionDropdown(true);
                setSelectedMentionIndex(-1);
                return;
            }
        }

        setShowMentionDropdown(false);
        setMentionSearchTerm("");
        setSelectedMentionIndex(-1);
    };

    // Handle keyboard navigation in mention dropdown
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showMentionDropdown || !mentionUsers || mentionUsers.length === 0) {
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedMentionIndex((prev) =>
                prev === -1 ? 0 : (prev < mentionUsers.length - 1 ? prev + 1 : prev)
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (selectedMentionIndex >= 0 && mentionUsers[selectedMentionIndex]) {
                insertMention(mentionUsers[selectedMentionIndex].username);
            }
        } else if (e.key === 'Escape') {
            setShowMentionDropdown(false);
            setSelectedMentionIndex(-1);
        }
    };

    // Insert mention into content
    const insertMention = (username: string) => {
        if (!textareaRef.current) return;

        const textBeforeCursor = content.substring(0, mentionCursorPosition);
        const textAfterCursor = content.substring(mentionCursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const beforeAt = content.substring(0, lastAtIndex);
            const newContent = `${beforeAt}@${username} ${textAfterCursor}`;
            setContent(newContent);

            // Close dropdown immediately so mention gets highlighted
            setShowMentionDropdown(false);
            setMentionSearchTerm("");
            setSelectedMentionIndex(-1);

            // Set cursor position after inserted mention
            const newCursorPos = lastAtIndex + username.length + 2; // +2 for @ and space
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                    textareaRef.current.focus();
                    // Update cursor position state
                    setMentionCursorPosition(newCursorPos);
                }
            }, 0);
        } else {
            setShowMentionDropdown(false);
            setMentionSearchTerm("");
            setSelectedMentionIndex(-1);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                mentionDropdownRef.current &&
                !mentionDropdownRef.current.contains(event.target as Node) &&
                textareaRef.current &&
                !textareaRef.current.contains(event.target as Node)
            ) {
                setShowMentionDropdown(false);
                setSelectedMentionIndex(-1);
            }
        };

        if (showMentionDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showMentionDropdown]);

    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden header-spacing">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            {/* Mobile Sidebar */}
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            {isLoading ? (
                <LoadingScreen text="Seite wird geladen..." />
            ) : (
                <div className="px-4 py-6">
                    <h2 className="text-2xl font-semibold mb-6 text-gray-900">
                        Neuer Post
                    </h2>

                    <form onSubmit={handleSubmit}>
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
                            {/* Post Type Selection */}
                            <div className="mb-4 relative post-type-dropdown">
                                <label htmlFor="postType" className="block text-sm font-medium text-gray-700 mb-2">
                                    Post-Typ
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsPostTypeOpen(!isPostTypeOpen);
                                        }}
                                        className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent"
                                    >
                                        <span>
                                            {postType === "normal" && "Normal"}
                                            {postType === "announcement" && "Ankündigung"}
                                            {postType === "spontaneous_meeting" && "Spontanes Treffen"}
                                            {postType === "recurring_meeting" && "Wiederkehrendes Treffen"}
                                            {postType === "poll" && "Umfrage"}
                                        </span>
                                        <ChevronDown
                                            className={`h-4 w-4 text-gray-500 transition-transform ${isPostTypeOpen ? "rotate-180" : ""}`}
                                        />
                                    </button>
                                    {isPostTypeOpen && (
                                        <div
                                            className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
                                        >
                                            <div className="py-1">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setPostType("normal");
                                                        setIsPostTypeOpen(false);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gradient-to-r hover:from-[#D08945] hover:via-[#DCA067] hover:to-[#F4CFAB] hover:text-white transition-all"
                                                >
                                                    Normal
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setPostType("announcement");
                                                        setIsPostTypeOpen(false);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gradient-to-r hover:from-[#D08945] hover:via-[#DCA067] hover:to-[#F4CFAB] hover:text-white transition-all"
                                                >
                                                    Ankündigung
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setPostType("spontaneous_meeting");
                                                        setIsPostTypeOpen(false);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gradient-to-r hover:from-[#D08945] hover:via-[#DCA067] hover:to-[#F4CFAB] hover:text-white transition-all"
                                                >
                                                    Spontanes Treffen
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setPostType("recurring_meeting");
                                                        setIsPostTypeOpen(false);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gradient-to-r hover:from-[#D08945] hover:via-[#DCA067] hover:to-[#F4CFAB] hover:text-white transition-all"
                                                >
                                                    Wiederkehrendes Treffen
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setPostType("poll");
                                                        setIsPostTypeOpen(false);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gradient-to-r hover:from-[#D08945] hover:via-[#DCA067] hover:to-[#F4CFAB] hover:text-white transition-all"
                                                >
                                                    Umfrage
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Title */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Titel (optional)"
                                    maxLength={100}
                                    className="w-full h-11 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-base md:text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent transition-colors"
                                />
                            </div>

                            <div className="relative">
                                {/* Overlay for highlighting mentions - render ALL text here since textarea is transparent */}
                                <div
                                    className="absolute inset-0 px-4 py-3 pointer-events-none text-base md:text-sm whitespace-pre-wrap break-words overflow-hidden rounded-lg text-gray-900 [&::selection]:bg-blue-200"
                                    style={{
                                        minHeight: "150px",
                                        zIndex: 1,
                                        lineHeight: '1.5',
                                        letterSpacing: 'normal',
                                        userSelect: 'none'
                                    }}
                                >
                                    {(() => {
                                        // Show placeholder if content is empty
                                        if (!content || content.trim() === '') {
                                            return <span className="text-gray-400">Was möchtest du teilen?</span>;
                                        }

                                        // Use same regex as FeedCard: /@(\w+)/g
                                        // Don't highlight if dropdown is open (user is still typing)
                                        const parts: React.ReactNode[] = [];
                                        let lastIndex = 0;
                                        let keyCounter = 0;

                                        // Same regex as FeedCard
                                        const mentionRegex = /@(\w+)/g;
                                        const matches = Array.from(content.matchAll(mentionRegex));

                                        if (matches.length === 0) {
                                            // No mentions, just render the content as normal text
                                            return <span>{content}</span>;
                                        }

                                        matches.forEach((match) => {
                                            if (match.index === undefined) return;

                                            // Check if this is the current incomplete mention (while typing)
                                            const isCurrentTyping = showMentionDropdown &&
                                                match.index <= mentionCursorPosition &&
                                                match.index + match[0].length >= mentionCursorPosition;

                                            // Add text before mention (visible normal text)
                                            if (match.index > lastIndex) {
                                                parts.push(
                                                    <span key={`text-${keyCounter++}`}>
                                                        {content.substring(lastIndex, match.index)}
                                                    </span>
                                                );
                                            }

                                            // Add mention - only color, no other styling
                                            // Only highlight if not currently typing (after selection from dropdown)
                                            if (!isCurrentTyping) {
                                                parts.push(
                                                    <span
                                                        key={`mention-${keyCounter++}`}
                                                        style={{
                                                            color: '#D08945',
                                                            fontWeight: 'normal',
                                                            fontStyle: 'normal',
                                                            textDecoration: 'none',
                                                            textShadow: 'none',
                                                            WebkitTextStroke: '0',
                                                            outline: 'none',
                                                            border: 'none',
                                                            boxShadow: 'none',
                                                            background: 'transparent'
                                                        }}
                                                    >
                                                        {match[0]}
                                                    </span>
                                                );
                                            } else {
                                                // While typing, show as normal text (not highlighted yet)
                                                parts.push(
                                                    <span key={`mention-${keyCounter++}`}>
                                                        {match[0]}
                                                    </span>
                                                );
                                            }

                                            lastIndex = match.index + match[0].length;
                                        });

                                        // Add remaining text (visible normal text)
                                        if (lastIndex < content.length) {
                                            parts.push(
                                                <span key={`text-${keyCounter++}`}>
                                                    {content.substring(lastIndex)}
                                                </span>
                                            );
                                        }

                                        return <>{parts}</>;
                                    })()}
                                </div>

                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={handleContentChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Was möchtest du teilen?"
                                    className="relative w-full px-4 py-3 rounded-lg border border-gray-300 bg-transparent text-base md:text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent resize-none transition-colors [&::selection]:bg-blue-200 [&::selection]:text-transparent"
                                    style={{
                                        minHeight: "150px",
                                        color: 'transparent',
                                        caretColor: '#111827',
                                        WebkitTextFillColor: 'transparent'
                                    }}
                                    maxLength={500}
                                />

                                {/* Mention Autocomplete Dropdown */}
                                {showMentionDropdown && mentionUsers && mentionUsers.length > 0 && (
                                    <div
                                        ref={mentionDropdownRef}
                                        className="absolute z-50 mt-1 w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                                    >
                                        {mentionUsers.map((user, index) => (
                                            <button
                                                key={user._id}
                                                type="button"
                                                onClick={() => insertMention(user.username)}
                                                className={`
                                                w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors flex items-center gap-3
                                                ${index === selectedMentionIndex && selectedMentionIndex >= 0 ? 'bg-gray-100' : ''}
                                            `}
                                            >
                                                {user.image ? (
                                                    <img
                                                        src={user.image}
                                                        alt={user.name}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-900 truncate">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate">
                                                        @{user.username}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Event Fields */}
                            {(postType === "spontaneous_meeting" || postType === "recurring_meeting") && (
                                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200" style={{ textAlign: "left" }}>
                                    <div>
                                        <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
                                            Datum *
                                        </label>
                                        <DatePicker
                                            value={eventDate}
                                            onChange={setEventDate}
                                            placeholder="Datum auswählen"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="eventTime" className="block text-sm font-medium text-gray-700 mb-1">
                                            Uhrzeit
                                        </label>
                                        <TimePicker
                                            value={eventTime}
                                            onChange={setEventTime}
                                            placeholder="Uhrzeit auswählen"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="participantLimit" className="block text-sm font-medium text-gray-700 mb-1">
                                            Teilnehmerlimit
                                        </label>
                                        <input
                                            id="participantLimit"
                                            type="number"
                                            value={participantLimit || ""}
                                            onChange={(e) => setParticipantLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                                            min="1"
                                            placeholder="Unbegrenzt"
                                            className="w-full h-11 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-base md:text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent transition-colors"
                                        />
                                    </div>
                                    {postType === "recurring_meeting" && (
                                        <div className="relative recurrence-dropdown">
                                            <label htmlFor="recurrencePattern" className="block text-sm font-medium text-gray-700 mb-1">
                                                Wiederholung
                                            </label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setIsRecurrenceOpen(!isRecurrenceOpen);
                                                    }}
                                                    className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent"
                                                >
                                                    <span>
                                                        {recurrencePattern === "" && "Keine Wiederholung"}
                                                        {recurrencePattern === "daily" && "Täglich"}
                                                        {recurrencePattern === "weekly" && "Wöchentlich"}
                                                        {recurrencePattern === "monthly" && "Monatlich"}
                                                    </span>
                                                    <ChevronDown
                                                        className={`h-4 w-4 text-gray-500 transition-transform ${isRecurrenceOpen ? "rotate-180" : ""}`}
                                                    />
                                                </button>
                                                {isRecurrenceOpen && (
                                                    <div
                                                        className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
                                                    >
                                                        <div className="py-1">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setRecurrencePattern("");
                                                                    setIsRecurrenceOpen(false);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gradient-to-r hover:from-[#D08945] hover:via-[#DCA067] hover:to-[#F4CFAB] hover:text-white transition-all"
                                                            >
                                                                Keine Wiederholung
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setRecurrencePattern("daily");
                                                                    setIsRecurrenceOpen(false);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gradient-to-r hover:from-[#D08945] hover:via-[#DCA067] hover:to-[#F4CFAB] hover:text-white transition-all"
                                                            >
                                                                Täglich
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setRecurrencePattern("weekly");
                                                                    setIsRecurrenceOpen(false);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gradient-to-r hover:from-[#D08945] hover:via-[#DCA067] hover:to-[#F4CFAB] hover:text-white transition-all"
                                                            >
                                                                Wöchentlich
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setRecurrencePattern("monthly");
                                                                    setIsRecurrenceOpen(false);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gradient-to-r hover:from-[#D08945] hover:via-[#DCA067] hover:to-[#F4CFAB] hover:text-white transition-all"
                                                            >
                                                                Monatlich
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Poll Options */}
                            {postType === "poll" && (
                                <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Umfrage-Optionen *
                                    </label>
                                    {pollOptions.map((option, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => updatePollOption(index, e.target.value)}
                                                placeholder={`Option ${index + 1}`}
                                                className="flex-1 h-11 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-base md:text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent transition-colors"
                                            />
                                            {pollOptions.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removePollOption(index)}
                                                    className="h-11 w-11 flex items-center justify-center rounded-lg border border-red-300 bg-white text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addPollOption}
                                        className="w-full h-11 px-4 py-2 rounded-lg bg-gradient-to-r from-[#D08945] via-[#DCA067] to-[#F4CFAB] text-white hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:ring-offset-2 transition-all shadow-md text-sm font-medium"
                                    >
                                        + Option hinzufügen
                                    </button>
                                </div>
                            )}

                            {imagePreview && (
                                <div className="relative mt-4">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full rounded-lg object-cover"
                                        style={{ maxHeight: "300px" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Bild hinzufügen"
                                    aria-label="Bild hinzufügen"
                                    className="flex items-center justify-center w-10 h-10 text-gray-600 rounded-lg focus:outline-none active:outline-none"
                                >
                                    <ImagePlus className="w-6 h-6" />
                                </button>
                                <div className="text-xs text-gray-500">
                                    {content.length}/500
                                </div>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!content.trim() || isSubmitting}
                            className="w-full h-12 px-6 py-3 bg-gradient-to-r from-[#D08945] via-[#DCA067] to-[#F4CFAB] text-white font-medium rounded-lg hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                        >
                            {isSubmitting ? "Wird gepostet..." : "Posten"}
                        </button>
                    </form>
                </div>
            )}
            <BottomNavigation />
        </main>
    );
}
