"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface EditGroupImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: Id<"conversations">;
    groupName: string;
    currentImage?: string;
    currentUserId: Id<"users">;
}

export function EditGroupImageModal({
    isOpen,
    onClose,
    conversationId,
    groupName,
    currentImage,
    currentUserId,
}: EditGroupImageModalProps) {
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(currentImage || null);
    const [isImageRemoved, setIsImageRemoved] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateGroupImage = useMutation(api.mutations.updateGroupImage);
    const generateUploadUrl = useMutation(api.mutations.generateUploadUrl);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            setIsImageRemoved(false);
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
        setIsImageRemoved(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;

        // Check if anything changed
        const hasChanged = selectedImage !== null || isImageRemoved;
        if (!hasChanged) {
            onClose();
            return;
        }

        setIsSubmitting(true);
        try {
            let imageUrl: string | undefined = undefined;

            if (selectedImage) {
                // Upload new image
                const uploadUrl = await generateUploadUrl();
                const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": selectedImage.type },
                    body: selectedImage,
                });
                const { storageId } = await result.json();
                imageUrl = storageId;
            } else if (isImageRemoved) {
                // Remove image
                imageUrl = "";
            }

            if (imageUrl !== undefined) {
                await updateGroupImage({
                    conversationId,
                    imageId: imageUrl,
                    userId: currentUserId,
                });
            }

            onClose();
        } catch (error) {
            console.error("Failed to update group image:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        // Reset state on close
        setTimeout(() => {
            setSelectedImage(null);
            setImagePreview(currentImage || null);
            setIsImageRemoved(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }, 100); // Small delay to avoid flickering during close animation
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent aria-describedby={undefined} className="w-[90vw] sm:w-[80vw] max-w-[400px] flex flex-col p-6 rounded-2xl">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-xl font-semibold text-center">Gruppenbild bearbeiten</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="relative group cursor-pointer active:scale-95 transition-transform"
                        disabled={isSubmitting}
                    >
                        <Avatar className="w-32 h-32">
                            <AvatarImage src={imagePreview || undefined} alt={groupName} className="object-cover" />
                            <AvatarFallback className=" bg-gray-100 text-gray-400">
                                {groupName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 w-10 h-10 bg-[#D08945] rounded-full flex items-center justify-center shadow-md group-hover:bg-[#C07835] transition-colors">
                            <Camera className="w-5 h-5 text-white" />
                        </div>
                    </button>

                    <div className="flex gap-2 w-full justify-center">
                        {(imagePreview || currentImage) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={isImageRemoved ? () => {
                                    setIsImageRemoved(false);
                                    setImagePreview(currentImage || null);
                                } : removeImage}

                                disabled={isSubmitting}
                            >
                                {isImageRemoved ? "Wiederherstellen" : "Entfernen"}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 justify-center mt-8">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="min-w-[100px]"
                        style={{
                            willChange: "transform",
                            transform: "translateZ(0)",
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden"
                        }}
                    >
                        Abbrechen
                    </Button>
                    <Button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="min-w-[100px]"
                        style={{
                            willChange: "transform",
                            transform: "translateZ(0)",
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden"
                        }}
                    >
                        <span style={{
                            display: "inline-block",
                            minWidth: "80px",
                            textAlign: "center"
                        }}>
                            {isSubmitting ? "Wird gespeichert..." : "Speichern"}
                        </span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
