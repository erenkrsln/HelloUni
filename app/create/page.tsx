"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
    const [uploadProgress, setUploadProgress] = useState(0);

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
    // Multi-Image Support: Array für bis zu 4 Bilder
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Begrenze auf max 4 Bilder (Twitter-Limit)
        const remainingSlots = 4 - selectedImages.length;
        const filesToAdd = files.slice(0, remainingSlots);
        
        if (filesToAdd.length === 0) {
            alert("Du kannst maximal 4 Bilder hochladen.");
            return;
        }

        // Neue Dateien hinzufügen
        const newImages = [...selectedImages, ...filesToAdd];
        setSelectedImages(newImages);

        // Previews für neue Bilder erstellen
        filesToAdd.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews((prev) => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
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

        // Nur bei Bild-Upload: Progress initialisieren
        if (selectedImages.length > 0) {
            sessionStorage.setItem("uploadProgress", "0");
        }

        // Sofort zur Home navigieren
        router.push("/home");

        // Upload im Hintergrund durchführen
        (async () => {
            try {
                let imageIds: string[] = [];

                // Mehrere Bilder hochladen mit Progress-Tracking über sessionStorage
                if (selectedImages.length > 0) {
                    const totalImages = selectedImages.length;
                    sessionStorage.setItem("uploadProgress", "10");
                    
                    // Lade alle Bilder parallel hoch
                    const uploadPromises = selectedImages.map(async (image, index) => {
                        const uploadUrl = await generateUploadUrl();
                        const progressStart = 10 + (index * 70 / totalImages);
                        const progressEnd = 10 + ((index + 1) * 70 / totalImages);
                        
                        sessionStorage.setItem("uploadProgress", progressStart.toString());
                        
                        const result = await fetch(uploadUrl, {
                            method: "POST",
                            headers: { "Content-Type": image.type },
                            body: image,
                        });
                        
                        sessionStorage.setItem("uploadProgress", progressEnd.toString());
                        
                        const { storageId } = await result.json();
                        return storageId;
                    });

                    imageIds = await Promise.all(uploadPromises);
                    sessionStorage.setItem("uploadProgress", "80");
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
                const extractedTags = extractTags(content.trim());
                const validTags = extractedTags.length > 0 ? extractedTags : undefined;

                // Mentions aus Content extrahieren
                const extractedMentions = extractMentions(content.trim());
                const validMentions = extractedMentions.length > 0 ? extractedMentions : undefined;

                if (selectedImages.length > 0) {
                    sessionStorage.setItem("uploadProgress", "90");
                }

                // Post erstellen mit imageIds Array (neuer Standard)
                await createPost({
                    userId: currentUser._id,
                    postType,
                    title: title.trim() || undefined,
                    content: content.trim(),
                    imageIds: imageIds.length > 0 ? imageIds as any : undefined, // Array von Storage IDs (Id<"_storage">[])
                    eventDate: eventDateTimestamp,
                    eventTime: eventTime || undefined,
                    participantLimit: participantLimit || undefined,
                    recurrencePattern: recurrencePattern || undefined,
                    pollOptions: validPollOptions,
                    tags: validTags,
                    mentions: validMentions,
                });

                if (selectedImages.length > 0) {
                    sessionStorage.setItem("uploadProgress", "100");
                    // Kurze Verzögerung damit User den vollen Progress sieht
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Upload abgeschlossen
                sessionStorage.removeItem("uploadProgress");
            } catch (error) {
                console.error("Fehler beim Erstellen des Posts:", error);
                sessionStorage.removeItem("uploadProgress");
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
        <div className="fixed inset-0 w-full max-w-[428px] mx-auto flex flex-col bg-white">
            {/* Mobile Sidebar */}
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            {/* Custom Header - Fixed am oberen Rand */}
            <header 
                className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200" 
                style={{ 
                    maxWidth: "428px", 
                    margin: "0 auto",
                    paddingTop: "env(safe-area-inset-top)",
                }}
            >
                <div className="flex items-center justify-between px-4 h-16">
                    <button
                        type="button"
                        onClick={() => router.push("/home")}
                        className="text-base font-medium text-gray-900 hover:opacity-70 transition-opacity cursor-pointer touch-manipulation"
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        form="create-post-form"
                        disabled={!content.trim()}
                        className="text-base font-medium text-[#D08945] hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-manipulation"
                    >
                        Posten
                    </button>
                </div>
            </header>

            {/* Scrollbarer Content-Bereich */}
            <main 
                className="flex-1 overflow-y-auto"
                style={{ 
                    marginTop: `calc(4rem + env(safe-area-inset-top))`,
                    paddingBottom: `calc(6rem + env(safe-area-inset-bottom))`,
                    WebkitOverflowScrolling: "touch",
                }}
            >
                {isLoading ? (
                    <LoadingScreen text="Seite wird geladen..." />
                ) : (
                    <div className="px-4 py-6">
                        <form id="create-post-form" onSubmit={handleSubmit}>
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4 overflow-hidden">
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
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-900"
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
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-900"
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
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-900"
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
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-900"
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
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-900"
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

                            {/* Text and Image Container - Vertical Flexbox */}
                            <div className="flex flex-col border border-gray-300 rounded-lg pb-4">
                                <div className="relative flex-shrink-0">
                                {/* Overlay for highlighting mentions - render ALL text here since textarea is transparent */}
                                <div
                                        className="absolute inset-0 px-4 py-3 pointer-events-none text-base md:text-sm whitespace-pre-wrap break-words overflow-hidden text-gray-900 [&::selection]:bg-blue-200"
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
                                        className="relative w-full px-4 pt-3 pb-0 bg-transparent text-base md:text-sm placeholder-gray-400 focus:outline-none focus:ring-0 border-none resize-none transition-colors [&::selection]:bg-blue-200 [&::selection]:text-transparent"
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

                                {/* Image Preview - direct sibling of textarea */}
                                {/* Multi-Image Preview Grid */}
                                {imagePreviews.length > 0 && (
                                    <div className="relative flex-shrink-0 px-4 -mt-28 pb-4">
                                        <div className={`grid gap-2 ${imagePreviews.length === 1 ? 'grid-cols-1' : imagePreviews.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                                            {imagePreviews.map((preview, index) => (
                                                <div key={index} className="relative group">
                                                    <img
                                                        src={preview}
                                                        alt={`Preview ${index + 1}`}
                                                        className={`w-full rounded-xl object-cover ${
                                                            imagePreviews.length === 1 
                                                                ? 'max-h-[600px] h-auto' 
                                                                : 'aspect-square'
                                                        }`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index)}
                                                        className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-red-500 text-white focus:outline-none shadow-md hover:bg-red-600 transition-colors"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                    {imagePreviews.length === 3 && index === 0 && (
                                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-xl" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {imagePreviews.length >= 4 && (
                                            <div className="mt-2 text-xs text-gray-500 text-center">
                                                Max. 4 Bilder (Twitter-Limit)
                                            </div>
                                        )}
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
                                                                className="w-full px-3 py-2 text-left text-sm text-gray-900"
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
                                                                className="w-full px-3 py-2 text-left text-sm text-gray-900"
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
                                                                className="w-full px-3 py-2 text-left text-sm text-gray-900"
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
                                                                className="w-full px-3 py-2 text-left text-sm text-gray-900"
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

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        title={selectedImages.length >= 4 ? "Max. 4 Bilder erreicht" : "Bilder hinzufügen"}
                                        aria-label="Bilder hinzufügen"
                                        disabled={selectedImages.length >= 4}
                                        className={`flex items-center justify-center w-10 h-10 text-gray-600 rounded-lg focus:outline-none active:outline-none ${
                                            selectedImages.length >= 4 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                                        }`}
                                    >
                                        <ImagePlus className="w-6 h-6" />
                                    </button>
                                    {selectedImages.length > 0 && (
                                        <span className="text-xs text-gray-500">
                                            {selectedImages.length}/4 Bilder
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {content.length}/500
                                </div>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                        </div>
                        </form>
                    </div>
                )}
            </main>
            
            {/* Bottom Navigation - Fixed am unteren Rand */}
            <BottomNavigation />
        </div>
    );
}
