"use client";

import React, { useState, useRef } from "react";
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
import { Camera, ChevronDown } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

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
  onUpdate: () => void;
}

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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(currentImage || null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMajorOpen, setIsMajorOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
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
    };

    if (isMajorOpen || isSemesterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMajorOpen, isSemesterOpen]);

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

      // User aktualisieren
      await updateUser({
        userId,
        name: name.trim(),
        image: imageUrl, // undefined = behalten, "" = löschen, string = neues Bild
        bio: bio.trim() || "", // Send empty string to delete bio
        major: major || undefined, // Send undefined if empty
        semester: semester || undefined, // Send undefined if not set
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
    setSelectedImage(null);
    setImagePreview(currentImage || null);
    setIsImageRemoved(false);
    setIsMajorOpen(false);
    setIsSemesterOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] sm:w-[80vw] max-w-[500px] max-h-[85vh] overflow-y-auto flex flex-col p-6 sm:p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold">Profil bearbeiten</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 flex-1">
          {/* Profilbild Upload */}
          <div className="flex flex-col items-center gap-4">
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
              className="relative cursor-pointer hover:opacity-80 transition-opacity focus:outline-none rounded-full group"
              disabled={isSubmitting}
            >
              <Avatar className="w-24 h-24">
                <AvatarImage src={imagePreview || undefined} alt={name} />
                <AvatarFallback className="text-2xl bg-[#000000]/20 text-[#000000]">
                  {name[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {/* Foto-Icon Overlay */}
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#D08945] rounded-full flex items-center justify-center shadow-md group-hover:bg-[#C07835] transition-colors">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>
            {(imagePreview || currentImage) && (
              <Button
                type="button"
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

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
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
              disabled={isSubmitting || !name.trim()}
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
        </form>
      </DialogContent>
    </Dialog>
  );
}

