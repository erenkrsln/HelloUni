"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, ChevronDown, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { HeaderImageCropModal, ImageCropModal } from "@/components/image-crop-modal";
import { getAllStudiengaenge } from "@/lib/studiengang-utils";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: Id<"users">;
  currentName: string;
  currentImage?: string;
  currentHeaderImage?: string;
  currentBio?: string;
  currentMajor?: string;
  currentSemester?: number;
  currentInterests?: string[];
  onUpdate: () => void;
}

// Liste der verfügbaren Interessen
const AVAILABLE_INTERESTS = [
  "Sport",
  "Musik",
  "Gaming",
  "Kunst",
  "Fotografie",
  "Reisen",
  "Kochen",
  "Lesen",
  "Filme",
  "Technologie",
  "Programmierung",
  "Design",
  "Nachhaltigkeit",
  "Politik",
  "Wissenschaft",
  "Medizin",
  "Wirtschaft",
  "Sprachen",
  "Tanz",
  "Theater",
  "Natur",
  "Tiere",
  "Fitness",
  "Yoga",
  "Essen",
  "Kaffee",
  "Bier",
  "Wein",
  "Kunsthandwerk",
  "DIY",
];

// Liste der Studiengänge - dynamisch von TH-Website
const STUDY_PROGRAMS = getAllStudiengaenge();

export function EditProfileModal({
  isOpen,
  onClose,
  userId,
  currentName,
  currentImage,
  currentHeaderImage,
  currentBio,
  currentMajor,
  currentSemester,
  currentInterests,
  onUpdate,
}: EditProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [bio, setBio] = useState(currentBio || "");
  // Prüfe ob currentMajor in der Liste der Studiengänge existiert
  const isValidMajor = currentMajor && STUDY_PROGRAMS.includes(currentMajor);
  const [major, setMajor] = useState(isValidMajor ? currentMajor : "");
  // Prüfe ob currentSemester gültig ist (zwischen 1 und 10)
  const isValidSemester = currentSemester && currentSemester >= 1 && currentSemester <= 10;
  const [semester, setSemester] = useState<number | undefined>(isValidSemester ? currentSemester : undefined);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(currentInterests || []);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(currentImage || null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedHeaderImage, setSelectedHeaderImage] = useState<File | null>(null);
  const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(currentHeaderImage || null);
  const [isHeaderImageRemoved, setIsHeaderImageRemoved] = useState(false);
  const headerImageInputRef = useRef<HTMLInputElement>(null);
  const [isHeaderCropModalOpen, setIsHeaderCropModalOpen] = useState(false);
  const [selectedHeaderImageSrc, setSelectedHeaderImageSrc] = useState<string>("");
  const [isHeaderUploading, setIsHeaderUploading] = useState(false);
  const [isAvatarCropModalOpen, setIsAvatarCropModalOpen] = useState(false);
  const [selectedAvatarImageSrc, setSelectedAvatarImageSrc] = useState<string>("");
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isMajorOpen, setIsMajorOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isInterestsOpen, setIsInterestsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Extrahiere dominante Farbe aus dem Header-Bild für Hintergrund
  const [extractedColor, setExtractedColor] = useState<string | null>(null);

  const updateUser = useMutation(api.mutations.updateUser);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMajorOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.major-dropdown')) {
          setIsMajorOpen(false);
        }
      }
      if (isSemesterOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.semester-dropdown')) {
          setIsSemesterOpen(false);
        }
      }
      if (isInterestsOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.interests-dropdown')) {
          setIsInterestsOpen(false);
        }
      }
    };

    if (isMajorOpen || isSemesterOpen || isInterestsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMajorOpen, isSemesterOpen, isInterestsOpen]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vorschau-URL für das Crop-Modal erzeugen
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedAvatarImageSrc(reader.result as string);
      setIsAvatarCropModalOpen(true);
    };
    reader.onerror = () => {
      alert("Fehler beim Lesen der Datei");
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarCropComplete = async (croppedBlob: Blob) => {
    setIsAvatarUploading(true);
    try {
      // Vorschau aus dem zugeschnittenen Blob erzeugen
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(croppedBlob);

      // Blob für späteren Upload speichern
      const file = new File([croppedBlob], "avatar-image.jpg", { type: "image/jpeg" });
      setSelectedImage(file);
      setIsImageRemoved(false);

      // Modal schließen
      setIsAvatarCropModalOpen(false);
      setSelectedAvatarImageSrc("");
    } catch (error) {
      console.error("Fehler beim Verarbeiten des Profilbilds:", error);
      alert("Fehler beim Verarbeiten des Profilbilds");
    } finally {
      setIsAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAvatarCropCancel = () => {
    if (isAvatarUploading) return; // Schließen während des Verarbeitens verhindern
    setIsAvatarCropModalOpen(false);
    setSelectedAvatarImageSrc("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleHeaderImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a preview URL for the crop modal
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedHeaderImageSrc(reader.result as string);
      setIsHeaderCropModalOpen(true);
    };
    reader.onerror = () => {
      alert("Fehler beim Lesen der Datei");
    };
    reader.readAsDataURL(file);
  };

  const handleHeaderCropComplete = async (croppedBlob: Blob) => {
    setIsHeaderUploading(true);
    try {
      // Create preview from cropped blob
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeaderImagePreview(reader.result as string);
      };
      reader.readAsDataURL(croppedBlob);

      // Store the blob for later upload
      const file = new File([croppedBlob], "header-image.jpg", { type: "image/jpeg" });
      setSelectedHeaderImage(file);
      setIsHeaderImageRemoved(false);

      // Close modal
      setIsHeaderCropModalOpen(false);
      setSelectedHeaderImageSrc("");
    } catch (error) {
      console.error("Fehler beim Verarbeiten des Header-Bilds:", error);
      alert("Fehler beim Verarbeiten des Header-Bilds");
    } finally {
      setIsHeaderUploading(false);
      if (headerImageInputRef.current) {
        headerImageInputRef.current.value = "";
      }
    }
  };

  const handleHeaderCropCancel = () => {
    if (isHeaderUploading) return; // Prevent closing during upload
    setIsHeaderCropModalOpen(false);
    setSelectedHeaderImageSrc("");
    if (headerImageInputRef.current) {
      headerImageInputRef.current.value = "";
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
      let headerImageUrl: string | undefined = undefined;

      if (selectedImage) {
        const { uploadUrl, publicUrl } = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: selectedImage.name,
            contentType: selectedImage.type,
            fileSize: selectedImage.size,
          }),
        }).then(r => r.json());

        await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": selectedImage.type },
          body: selectedImage,
        });

        imageUrl = publicUrl;
      } else if (isImageRemoved) {
        imageUrl = "";
      }

      if (selectedHeaderImage) {
        const { uploadUrl, publicUrl } = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: selectedHeaderImage.name,
            contentType: selectedHeaderImage.type,
            fileSize: selectedHeaderImage.size,
          }),
        }).then(r => r.json());

        await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": selectedHeaderImage.type },
          body: selectedHeaderImage,
        });

        headerImageUrl = publicUrl;
      } else if (isHeaderImageRemoved) {
        headerImageUrl = "";
      }

      await updateUser({
        userId,
        name: name.trim(),
        image: imageUrl,
        headerImage: headerImageUrl,
        bio: bio.trim() || "",
        major: major || undefined,
        semester: semester || undefined,
        interests: selectedInterests,
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
    setName(currentName);
    setBio(currentBio || "");
    const isValidMajor = currentMajor && STUDY_PROGRAMS.includes(currentMajor);
    setMajor(isValidMajor ? currentMajor : "");
    const isValidSemester = currentSemester && currentSemester >= 1 && currentSemester <= 10;
    setSemester(isValidSemester ? currentSemester : undefined);
    setSelectedInterests(currentInterests || []);
    setSelectedImage(null);
    setImagePreview(currentImage || null);
    setIsImageRemoved(false);
    setSelectedHeaderImage(null);
    setHeaderImagePreview(currentHeaderImage || null);
    setIsHeaderImageRemoved(false);
    setIsMajorOpen(false);
    setIsSemesterOpen(false);
    setIsInterestsOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (headerImageInputRef.current) {
      headerImageInputRef.current.value = "";
    }
    onClose();
  };

  useEffect(() => {
    const imageToExtract = headerImagePreview || currentHeaderImage;
    if (!imageToExtract) {
      setExtractedColor(null);
      return;
    }

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = ctx.getImageData(20, 15, 10, 10);
        const data = imageData.data;

        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        const pixelCount = data.length / 4;
        r = Math.floor(r / pixelCount);
        g = Math.floor(g / pixelCount);
        b = Math.floor(b / pixelCount);

        // Konvertiere zu Hex
        const hex = `#${[r, g, b].map(x => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        }).join('')}`;

        setExtractedColor(hex);
      } catch (e) {
        // Bei Fehler (z.B. CORS) verwende Fallback
        console.warn('Could not extract color from header image:', e);
        setExtractedColor(null);
      }
    };
    img.onerror = () => {
      setExtractedColor(null);
    };
    img.src = imageToExtract;
  }, [headerImagePreview, currentHeaderImage]);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={handleClose}
      />

      {/* Drawer / Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className={`fixed bg-card text-card-foreground z-[60] flex flex-col transition-all duration-300 ease-out overflow-hidden
          inset-0 w-full h-[100dvh] rounded-none
          ${isOpen ? "translate-y-0 opacity-100" : "translate-y-full md:translate-y-4 md:opacity-0 pointer-events-none"}
          md:fixed md:pointer-events-auto
          md:top-1/2 md:left-1/2 md:right-auto md:bottom-auto md:w-[540px] md:h-[85vh] md:max-h-[700px] md:rounded-2xl md:border md:border-border md:shadow-2xl
          ${isOpen 
            ? "md:-translate-x-1/2 md:-translate-y-1/2 md:scale-100 md:opacity-100" 
            : "md:-translate-x-1/2 md:-translate-y-[40%] md:scale-95 md:opacity-0"
          }
        `}
        style={{
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0 bg-card sticky top-0 z-[70] pt-[calc(1rem+env(safe-area-inset-top,0px))] min-h-[calc(3rem+env(safe-area-inset-top,0px))] md:pt-4 md:min-h-0"
        >
          <button
            type="button"
            onClick={handleClose}
            className="text-base font-medium text-foreground hover:opacity-70 transition-opacity"
          >
            Abbrechen
          </button>
          <h2 id="edit-profile-title" className="text-lg font-semibold text-foreground">Profil bearbeiten</h2>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e as any);
            }}
            disabled={isSubmitting || !name.trim()}
            className="text-base font-medium text-[#D08945] hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Speichern
          </button>
        </div>

        {/* Header Image */}
        <div
          className={`relative overflow-hidden ${!extractedColor ? 'bg-gradient-to-br from-[#D08945]/20 to-[#DCA067]/20' : ''
            }`}
          style={{
            aspectRatio: '3/1',
            minHeight: '120px',
            backgroundColor: extractedColor || undefined, // Sofort sichtbare Hintergrundfarbe (aus Bild extrahiert oder Gradient-Fallback)
            transition: extractedColor ? 'background-color 0.3s ease-in-out' : undefined, // Sanfter Übergang wenn Farbe extrahiert wird
          }}
        >
          {headerImagePreview ? (
            <img
              src={headerImagePreview}
              alt="Header"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#D08945]/20 to-[#DCA067]/20" />
          )}

          {/* Edit Header Image Button */}
          <input
            ref={headerImageInputRef}
            type="file"
            accept="image/*"
            onChange={handleHeaderImageSelect}
            className="hidden"
            id="header-image-upload"
          />
          <button
            type="button"
            aria-label="Hintergrundbild bearbeiten"
            onClick={() => headerImageInputRef.current?.click()}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 active:bg-black flex items-center justify-center transition-all duration-200 shadow-lg z-50 cursor-pointer"
            disabled={isSubmitting}
          >
            <Camera aria-hidden="true" className="w-4 h-4 text-white pointer-events-none" />
          </button>
        </div>

        {/* Profile Picture - overlapping header */}
        <div className="relative px-4 z-10 -mt-12 sm:-mt-20">
          <div className="flex flex-col items-start gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="profile-image-upload"
            />
            <button
              type="button"
              aria-label="Profilbild bearbeiten"
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer focus:outline-none rounded-full group"
              disabled={isSubmitting}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-background shadow-xl" style={{ backgroundColor: 'white' }}>
                <AvatarImage src={imagePreview || undefined} alt={name} className="object-cover" />
                <AvatarFallback className="text-xl sm:text-2xl bg-muted text-foreground font-semibold">
                  {name[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {/* Foto-Icon Overlay */}
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#D08945] rounded-full flex items-center justify-center shadow-md group-hover:bg-[#C07835] transition-colors">
                <Camera aria-hidden="true" className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 overscroll-contain">
          <form onSubmit={handleSubmit} className="space-y-6 flex-1">
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

            {/* Studiengang Dropdown */}
            <div className="relative major-dropdown">
              <label htmlFor="major" className="block text-sm font-medium mb-2">
                Studiengang
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMajorOpen(!isMajorOpen)}
                  disabled={isSubmitting}
                  className="flex h-11 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className={major ? "text-foreground" : "text-muted-foreground"}>
                    {major || "Studiengang auswählen"}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isMajorOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isMajorOpen && (
                  <div
                    className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-lg max-h-60 overflow-y-auto"
                  >
                    <div className="py-1">
                      {STUDY_PROGRAMS.map((program) => (
                        <button
                          key={program}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMajor(program);
                            setIsMajorOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition-all ${major === program ? "bg-accent/50 font-medium" : ""
                            }`}
                        >
                          {program}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Semester Dropdown */}
            <div className="relative semester-dropdown">
              <label htmlFor="semester" className="block text-sm font-medium mb-2">
                Semester
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSemesterOpen(!isSemesterOpen)}
                  disabled={isSubmitting}
                  className="flex h-11 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className={semester ? "text-foreground" : "text-muted-foreground"}>
                    {semester ? `${semester}. Fachsemester` : "Semester auswählen"}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isSemesterOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isSemesterOpen && (
                  <div
                    className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-lg max-h-60 overflow-y-auto"
                  >
                    <div className="py-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
                        <button
                          key={sem}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSemester(sem);
                            setIsSemesterOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition-all ${semester === sem ? "bg-accent/50 font-medium" : ""
                            }`}
                        >
                          {sem}. Semester
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Interessen Multi-Select */}
            <div className="relative interests-dropdown">
              <label htmlFor="interests" className="block text-sm font-medium mb-2">
                Interessen
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsInterestsOpen(!isInterestsOpen)}
                  disabled={isSubmitting}
                  className="flex h-11 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className={selectedInterests.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                    {selectedInterests.length > 0
                      ? `${selectedInterests.length} ausgewählt`
                      : "Interessen auswählen"}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isInterestsOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isInterestsOpen && (
                  <div
                    className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-lg max-h-60 overflow-y-auto"
                  >
                    <div className="p-2">
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_INTERESTS.map((interest) => {
                          const isSelected = selectedInterests.includes(interest);
                          return (
                            <button
                              key={interest}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleInterest(interest);
                              }}
                              className={`px-3 py-1.5 text-sm rounded-full border transition-all ${isSelected
                                ? "bg-[#D08945] text-white border-[#D08945]"
                                : "bg-background text-foreground border-border hover:border-[#D08945] hover:text-[#D08945]"
                                }`}
                            >
                              {interest}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                placeholder="Erzähl etwas über dich..."
                rows={3}
                maxLength={300}
                disabled={isSubmitting}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-base resize-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {bio.length}/150
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Header Image Crop Modal */}
      {isHeaderCropModalOpen && selectedHeaderImageSrc && (
        <HeaderImageCropModal
          isOpen={isHeaderCropModalOpen}
          onClose={handleHeaderCropCancel}
          imageSrc={selectedHeaderImageSrc}
          onCropComplete={handleHeaderCropComplete}
          isUploading={isHeaderUploading}
        />
      )}

      {/* Avatar Image Crop Modal */}
      {isAvatarCropModalOpen && selectedAvatarImageSrc && (
        <ImageCropModal
          isOpen={isAvatarCropModalOpen}
          onClose={handleAvatarCropCancel}
          imageSrc={selectedAvatarImageSrc}
          onCropComplete={handleAvatarCropComplete}
          isUploading={isAvatarUploading}
          aspect={1}
          cropShape="rect"
          title="Medien bearbeiten"
          variant="twitter"
        />
      )}
    </>
  );
}

