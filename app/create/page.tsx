"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LoadingScreen } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

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
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

                // Post erstellen
            await createPost({
                userId: currentUser._id,
                    content: postContent,
                imageUrl,
            });
        } catch (error) {
                console.error("Fehler beim Erstellen des Posts:", error);
        }
        })();
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
                <h2
                    className="text-2xl font-normal mb-6"
                    style={{ color: "#000000" }}
                >
                    Neuer Post
                </h2>

                <form onSubmit={handleSubmit}>
                    <div
                        className="backdrop-blur-sm p-5 mb-4"
                        style={{
                            borderRadius: "var(--border-radius-card)",
                            backgroundColor: "rgba(255, 255, 255, 0.1)"
                        }}
                    >
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Was möchtest du teilen?"
                            className="w-full bg-transparent border-none outline-none resize-none"
                            style={{
                                color: "#000000",
                                fontSize: "14px",
                                lineHeight: "1.6",
                                minHeight: "150px"
                            }}
                            maxLength={500}
                        />

                        {imagePreview && (
                            <div className="relative mt-4">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full rounded-lg"
                                    style={{ maxHeight: "300px", objectFit: "cover" }}
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                                >
                                    <X style={{ width: "20px", height: "20px", color: "white" }} />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F4CFAB]/20">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-white/10"
                                style={{ color: "var(--color-text-beige)" }}
                            >
                                <ImagePlus style={{ width: "20px", height: "20px" }} />
                                <span style={{ fontSize: "14px" }}>Bild hinzufügen</span>
                            </button>
                            <div
                                style={{
                                    fontSize: "12px",
                                    color: "rgba(244, 207, 171, 0.6)"
                                }}
                            >
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
                        className="w-full py-3 px-6 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: "linear-gradient(to right, #D08945 0%, #DCA067 33.226%, #F4CFAB 100%)",
                            color: "#FFFFFF"
                        }}
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
