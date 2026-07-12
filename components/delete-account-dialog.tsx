"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

const CONFIRMATION_WORD = "LÖSCHEN";

export function DeleteAccountDialog({
  isOpen,
  onOpenChange,
  userEmail,
}: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmText === CONFIRMATION_WORD;

  const resetState = useCallback(() => {
    setConfirmText("");
    setError(null);
    setIsDeleting(false);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!isDeleting) {
        if (!open) resetState();
        onOpenChange(open);
      }
    },
    [isDeleting, onOpenChange, resetState]
  );

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setError(null);

    try {
      // 1. API-Route aufrufen, die serverseitig die Löschung durchführt
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Account konnte nicht gelöscht werden.");
      }

      // 2. Session beenden und zur Startseite weiterleiten
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/";
          },
        },
      });

      // Fallback: Falls signOut-Callback nicht feuert
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } catch (err) {
      console.error("[DeleteAccountDialog] Fehler:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es erneut."
      );
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[95vw] sm:w-[90vw] max-w-[480px] p-0 gap-0 overflow-hidden"
        hideCloseButton={isDeleting}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground text-center">
            Account dauerhaft löschen
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-muted-foreground leading-relaxed text-center mt-2">
            Diese Aktion kann{" "}
            <span className="font-semibold text-red-600">
              nicht rückgängig
            </span>{" "}
            gemacht werden.
          </DialogDescription>
        </DialogHeader>

        {/* Inhalt */}
        <div className="px-5 sm:px-6 pb-4">
          {/* Was gelöscht wird */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 mb-4">
            <p className="text-xs sm:text-sm font-medium text-red-800 mb-2">
              Folgende Daten werden unwiderruflich gelöscht:
            </p>
            <ul className="text-xs sm:text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>Dein Profil und alle persönlichen Daten</li>
              <li>Alle deine Posts, Kommentare und Likes</li>
              <li>Deine Follower und Following-Listen</li>
              <li>Deine Direktnachrichten</li>
              <li>Deine Gruppenaktivitäten und Workspace-Daten</li>
              <li>Alle hochgeladenen Dateien und Bilder</li>
            </ul>
          </div>

          {/* Bestätigungseingabe */}
          <div className="space-y-2">
            <label
              htmlFor="delete-confirm-input"
              className="block text-xs sm:text-sm font-medium text-foreground"
            >
              Gib{" "}
              <span className="font-bold text-red-600 select-all">
                {CONFIRMATION_WORD}
              </span>{" "}
              ein, um zu bestätigen:
            </label>
            <Input
              id="delete-confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                if (error) setError(null);
              }}
              placeholder={CONFIRMATION_WORD}
              disabled={isDeleting}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="text-base border-gray-300 focus:ring-red-500 focus:border-red-500"
              style={{ fontSize: "16px" }} // Verhindert Auto-Zoom auf iOS
            />
          </div>

          {/* Fehlermeldung */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs sm:text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6 border-t border-border flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base"
          >
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base font-medium"
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Wird gelöscht...</span>
              </span>
            ) : (
              "Account endgültig löschen"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
