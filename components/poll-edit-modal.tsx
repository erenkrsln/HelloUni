"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/toast";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { X } from "lucide-react";

interface PollEditModalProps {
  poll: Doc<"workspace_polls">;
  isOpen: boolean;
  onClose: () => void;
  userId: Id<"users">;
  hasVotes: boolean;
}

export function PollEditModal({
  poll,
  isOpen,
  onClose,
  userId,
  hasVotes,
}: PollEditModalProps) {
  const [question, setQuestion] = useState(poll.question);
  const [options, setOptions] = useState(poll.options);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updatePoll = useMutation(api.workspace.updatePoll);
  const deletePoll = useMutation(api.workspace.deletePoll);
  const toast = useToast();

  const handleSave = async () => {
    if (!question.trim()) {
      toast.error("Umfragefrage ist erforderlich");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      toast.error("Eine Umfrage benötigt mindestens zwei Optionen");
      return;
    }

    setIsLoading(true);
    try {
      await updatePoll({
        pollId: poll._id,
        userId,
        question,
        options: hasVotes ? undefined : validOptions,
      });

      toast.success("Umfrage erfolgreich aktualisiert");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Aktualisieren der Umfrage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsLoading(true);
    try {
      await deletePoll({
        pollId: poll._id,
        userId,
      });

      toast.success("Umfrage erfolgreich gelöscht");
      setShowDeleteConfirm(false);
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Löschen der Umfrage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent hideCloseButton={false} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-bold text-slate-900">
              Umfrage bearbeiten
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-5 py-4">
            {/* Question Field */}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Frage der Umfrage
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Was möchtest du fragen?"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20 text-sm text-slate-900"
              />
            </div>

            {/* Voting Status Warning */}
            {hasVotes && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>⚠️ Abstimmung läuft:</strong> Die Umfrageoptionen können nach dem Start der Abstimmung nicht mehr geändert werden. Du kannst nur noch die Frage bearbeiten.
                </p>
              </div>
            )}

            {/* Options Section */}
            {!hasVotes && (
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-3">
                  Umfrageoptionen
                </label>
                <div className="space-y-2">
                  {options.map((option, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) =>
                          handleOptionChange(idx, e.target.value)
                        }
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20 text-sm text-slate-900"
                      />
                      {options.length > 2 && (
                        <button
                          onClick={() => handleRemoveOption(idx)}
                          className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-colors flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center border border-transparent hover:border-red-100"
                          title="Option entfernen"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddOption}
                  className="mt-3 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  + Option hinzufügen
                </button>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 flex flex-col gap-3">
            <div className="flex gap-2 justify-end w-full">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-2xl text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 font-semibold min-h-[40px] transition-all active:scale-95 text-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-2xl bg-[#D08945] hover:bg-[#b07335] text-white font-bold min-h-[40px] transition-all active:scale-95 text-sm"
              >
                {isLoading ? "Wird gespeichert..." : "Änderungen speichern"}
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 w-full">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 rounded-2xl py-2.5 font-bold transition-all active:scale-95 min-h-[40px] text-sm"
              >
                Umfrage löschen
              </button>
              <p className="text-xs text-slate-500 text-center mt-2 font-medium">
                Dies kann nicht rückgängig gemacht werden.
              </p>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Umfrage löschen?"
        description="Bist du sicher, dass du diese Umfrage löschen möchtest? Alle bisherigen Stimmen werden unwiderruflich gelöscht und diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Umfrage löschen"
        cancelLabel="Abbrechen"
        isDangerous={true}
        isLoading={isLoading}
      />
    </>
  );
}
