"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, ChevronDown, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { HeaderImageCropModal } from "@/components/header-image-crop-modal";

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
  const [isMajorOpen, setIsMajorOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isInterestsOpen, setIsInterestsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateUser = useMutation(api.mutations.updateUser);
  const generateUploadUrl = useMutation(api.mutations.generateUploadUrl);

  // Schließe Dropdowns wenn außerhalb geklickt wird
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

      // Profilbild hochladen, falls ein neues ausgewählt wurde
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

      // Header-Bild hochladen, falls ein neues ausgewählt wurde
      if (selectedHeaderImage) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedHeaderImage.type },
          body: selectedHeaderImage,
        });
        const { storageId } = await result.json();
        headerImageUrl = storageId;
      } else if (isHeaderImageRemoved) {
        // Header-Bild wurde entfernt, setze auf leeren String
        headerImageUrl = "";
      }

      // User aktualisieren
      await updateUser({
        userId,
        name: name.trim(),
        image: imageUrl, // undefined = behalten, "" = löschen, string = neues Bild
        headerImage: headerImageUrl, // undefined = behalten, "" = löschen, string = neues Bild
        bio: bio.trim() || "", // Send empty string to delete bio
        major: major || undefined, // Send undefined if empty
        semester: semester || undefined, // Send undefined if not set
        interests: selectedInterests, // Send array (empty array to clear all interests)
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
    // Prüfe ob currentMajor in der Liste der Studiengänge existiert
    const isValidMajor = currentMajor && STUDY_PROGRAMS.includes(currentMajor);
    setMajor(isValidMajor ? currentMajor : "");
    // Prüfe ob currentSemester gültig ist (zwischen 1 und 10)
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

  // Body-Lock: Verhindere Scrollen des Body, wenn Drawer offen ist
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
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[60] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          pointerEvents: isOpen ? "auto" : "none",
          height: "100dvh",
          height: "100vh", // Fallback für ältere Browser
          maxHeight: "-webkit-fill-available", // iOS Safari Fallback
        }}
      >
        {/* Header - Sticky mit Safe-Area Support */}
        <div 
          className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white flex-shrink-0"
          style={{ 
            paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
            paddingBottom: "1rem",
          }}
        >
          <button
            onClick={handleClose}
            className="text-base font-medium text-gray-900 hover:opacity-70 transition-opacity"
          >
            Abbrechen
          </button>
          <h2 className="text-lg font-semibold text-gray-900">Profil bearbeiten</h2>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e as any);
            }}
            disabled={isSubmitting || !name.trim()}
            className="text-base font-medium text-[#D08945] hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Wird gespeichert..." : "Speichern"}
          </button>
        </div>

        {/* Header Image */}
        <div 
          className="relative bg-[#0a0a0a] overflow-hidden"
          style={{ 
            aspectRatio: '3/1', 
            minHeight: '120px',
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
            onClick={() => headerImageInputRef.current?.click()}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 active:bg-black flex items-center justify-center transition-all duration-200 shadow-lg z-50 cursor-pointer"
            disabled={isSubmitting}
          >
            <Camera className="w-4 h-4 text-white pointer-events-none" />
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
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer focus:outline-none rounded-full group"
              disabled={isSubmitting}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white shadow-xl" style={{ backgroundColor: 'white' }}>
                <AvatarImage src={imagePreview || undefined} alt={name} className="object-cover" />
                <AvatarFallback className="text-xl sm:text-2xl bg-[#000000]/20 text-[#000000] font-semibold">
                  {name[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {/* Foto-Icon Overlay */}
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#D08945] rounded-full flex items-center justify-center shadow-md group-hover:bg-[#C07835] transition-colors">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
        </div>

        {/* Scrollable Content - Nur dieser Bereich scrollt */}
        <div 
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{
            WebkitOverflowScrolling: "touch",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="px-4 py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMajorOpen(!isMajorOpen);
                }}
                disabled={isSubmitting}
                className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className={major ? "text-gray-900" : "text-gray-500"}>
                  {major || "Studiengang auswählen"}
                </span>
                <ChevronDown 
                  className={`h-4 w-4 text-gray-500 transition-transform ${isMajorOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isMajorOpen && (
                <div 
                  className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto"
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
                        className={`w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 transition-all ${
                          major === program ? "" : ""
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSemesterOpen(!isSemesterOpen);
                }}
                disabled={isSubmitting}
                className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className={semester ? "text-gray-900" : "text-gray-500"}>
                  {semester ? `${semester}. Semester` : "Semester auswählen"}
                </span>
                <ChevronDown 
                  className={`h-4 w-4 text-gray-500 transition-transform ${isSemesterOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isSemesterOpen && (
                <div 
                  className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto"
                >
                  <div className="py-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((sem) => (
                      <button
                        key={sem}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSemester(sem);
                          setIsSemesterOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 transition-all ${
                          semester === sem ? "" : ""
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsInterestsOpen(!isInterestsOpen);
                }}
                disabled={isSubmitting}
                className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className={selectedInterests.length > 0 ? "text-gray-900" : "text-gray-500"}>
                  {selectedInterests.length > 0 
                    ? `${selectedInterests.length} ${selectedInterests.length === 1 ? 'Interesse' : 'Interessen'} ausgewählt`
                    : "Interessen auswählen"}
                </span>
                <ChevronDown 
                  className={`h-4 w-4 text-gray-500 transition-transform ${isInterestsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isInterestsOpen && (
                <div 
                  className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto"
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
                            className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                              isSelected
                                ? "bg-[#D08945] text-white border-[#D08945]"
                                : "bg-white text-gray-700 border-gray-300 hover:border-[#D08945] hover:text-[#D08945]"
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
            {selectedInterests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedInterests.map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[#D08945]/10 text-[#D08945] border border-[#D08945]/20"
                  >
                    {interest}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleInterest(interest);
                      }}
                      className="hover:text-[#C07835]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
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
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-base resize-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {bio.length}/150
            </p>
          </div>
            </form>
          </div>
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
          className="drawer-crop-modal"
        />
      )}
    </>
  );
}

