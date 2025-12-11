"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Id } from "@/convex/_generated/dataModel";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: Id<"users">;
  currentName: string;
  currentImage?: string;
  currentBio?: string;
  onUpdate: () => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  userId,
  currentName,
  currentImage,
  currentBio,
  onUpdate,
}: EditProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [bio, setBio] = useState(currentBio || "");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(currentImage || null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateUser = useMutation(api.mutations.updateUser);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let imageUrl: string | undefined = undefined;

      // Bild hochladen, falls ein neues ausgewählt wurde
      if (selectedImage) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedImage.type },
          body: selectedImage,
        });
        const { storageId } = await result.json();
        imageUrl = storageId;
      } else if (isImageRemoved) {
        // Bild wurde entfernt, setze auf leeren String
        imageUrl = "";
      }
      // Wenn weder selectedImage noch isImageRemoved, bleibt imageUrl undefined
      // und das alte Bild wird beibehalten

      // User aktualisieren
      await updateUser({
        userId,
        name: name.trim(),
        image: imageUrl, // undefined = behalten, "" = löschen, string = neues Bild
        bio: bio.trim() || "", // Send empty string to delete bio
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Profils:", error);
      alert("Fehler beim Aktualisieren des Profils");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setName(currentName);
    setBio(currentBio || "");
    setSelectedImage(null);
    setImagePreview(currentImage || null);
    setIsImageRemoved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profil bearbeiten</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profilbild Upload */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={imagePreview || undefined} alt={name} />
              <AvatarFallback className="text-2xl bg-[#000000]/20 text-[#000000]">
                {name[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="profile-image-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                Bild auswählen
              </Button>
              {(imagePreview || currentImage) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={isImageRemoved ? () => {
                    setIsImageRemoved(false);
                    setImagePreview(currentImage || null);
                  } : removeImage}
                >
                  {isImageRemoved ? "Wiederherstellen" : "Entfernen"}
                </Button>
              )}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein Name"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Bio Input */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-2">
              Biografie
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Erzähle etwas über dich..."
              rows={4}
              maxLength={150}
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-lg border bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                borderColor: "rgba(208, 137, 69, 0.3)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#D08945";
                e.target.style.boxShadow = "0 0 0 2px rgba(208, 137, 69, 0.2)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(208, 137, 69, 0.3)";
                e.target.style.boxShadow = "none";
              }}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {bio.length}/150
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Wird gespeichert..." : "Speichern"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

