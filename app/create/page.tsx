"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
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

    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden">
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
                                    className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
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
                                className="w-full h-11 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent transition-colors"
                            />
                        </div>

                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Was möchtest du teilen?"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent resize-none transition-colors"
                            style={{ minHeight: "150px" }}
                            maxLength={500}
                        />

                        {/* Event Fields */}
                        {(postType === "spontaneous_meeting" || postType === "recurring_meeting") && (
                            <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
                                        className="w-full h-11 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent transition-colors"
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
                                                className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:ring-offset-2"
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
                                            className="flex-1 h-11 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#D08945] via-[#DCA067] to-[#F4CFAB] text-white rounded-lg hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:ring-offset-2 transition-all shadow-md text-sm font-medium"
                            >
                                <ImagePlus className="w-5 h-5" />
                                <span>Bild hinzufügen</span>
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
