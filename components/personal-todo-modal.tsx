"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { X } from "lucide-react";

interface PersonalTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  todo?: {
    _id: Id<"personal_todos">;
    title: string;
    description?: string;
    dueDate?: number;
    priority?: "low" | "medium" | "high";
  };
  onSuccess?: () => void;
}

export function PersonalTodoModal({
  isOpen,
  onClose,
  todo,
  onSuccess,
}: PersonalTodoModalProps) {
  const { currentUser } = useCurrentUser();
  const createTodo = useMutation(api.workspace.createPersonalTodo);
  const updateTodo = useMutation(api.workspace.updatePersonalTodo);

  const [title, setTitle] = useState(todo?.title || "");
  const [description, setDescription] = useState(todo?.description || "");
  const [dueDate, setDueDate] = useState(
    todo?.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "",
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    todo?.priority || "medium",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setTitle(todo?.title || "");
      setDescription(todo?.description || "");
      setDueDate(
        todo?.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "",
      );
      setPriority(todo?.priority || "medium");
      setError("");
    }
  }, [isOpen, todo]);

  const handleClose = () => {
    setTitle(todo?.title || "");
    setDescription(todo?.description || "");
    setDueDate(
      todo?.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "",
    );
    setPriority(todo?.priority || "medium");
    setError("");
    onClose();
  };

  const priorityLabels = {
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch",
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Titel ist erforderlich");
      return;
    }

    if (!currentUser) {
      setError("Benutzer nicht authentifiziert");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const dueDateTimestamp = dueDate
        ? new Date(dueDate).getTime()
        : undefined;

      if (todo) {
        // Update existing
        await updateTodo({
          todoId: todo._id,
          userId: currentUser._id,
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDateTimestamp,
          priority,
        });
      } else {
        // Create new
        await createTodo({
          userId: currentUser._id,
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDateTimestamp,
          priority,
        });
      }

      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern des To-dos");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[calc(100vw-24px)] md:max-w-[560px] max-h-[calc(100dvh-24px)] p-0 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 border-b border-slate-100 px-6 py-4">
          <DialogHeader>
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold text-slate-900">
                {todo ? "To-do bearbeiten" : "Persönliches To-do hinzufügen"}
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Titel *
              </label>
              <input
                type="text"
                placeholder="Titel des To-dos eingeben"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] text-slate-900 placeholder-slate-400 text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Beschreibung (optional)
              </label>
              <textarea
                placeholder="Details zu diesem To-do hinzufügen"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] text-slate-900 placeholder-slate-400 text-sm resize-none"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Fälligkeitsdatum (optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] text-slate-900 text-sm"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Priorität
              </label>
              <div className="flex gap-2 flex-wrap">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 min-w-[80px] px-3.5 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-95 ${
                      priority === p
                        ? "bg-[#D08945] text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {priorityLabels[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-slate-100 px-6 py-4">
          <DialogFooter className="flex flex-row justify-end gap-2">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50 min-h-[40px]"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-2xl bg-[#D08945] text-white font-semibold hover:bg-[#b07335] transition-colors disabled:opacity-50 min-h-[40px] shadow-sm"
            >
              {isLoading ? "Wird gespeichert..." : todo ? "Speichern" : "Erstellen"}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
