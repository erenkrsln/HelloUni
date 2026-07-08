"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

export function PersonalTodoModal({ isOpen, onClose, todo, onSuccess }: PersonalTodoModalProps) {
  const { currentUser } = useCurrentUser();
  const createTodo = useMutation(api.workspace.createPersonalTodo);
  const updateTodo = useMutation(api.workspace.updatePersonalTodo);

  const [title, setTitle] = useState(todo?.title || "");
  const [description, setDescription] = useState(todo?.description || "");
  const [dueDate, setDueDate] = useState(
    todo?.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : ""
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high">(todo?.priority || "medium");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleClose = () => {
    setTitle(todo?.title || "");
    setDescription(todo?.description || "");
    setDueDate(todo?.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "");
    setPriority(todo?.priority || "medium");
    setError("");
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!currentUser) {
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const dueDateTimestamp = dueDate ? new Date(dueDate).getTime() : undefined;

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
      setError(err instanceof Error ? err.message : "Failed to save to-do");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md rounded-3xl border border-slate-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {todo ? "Edit To-Do" : "Add Personal To-Do"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              placeholder="Enter to-do title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
            <textarea
              placeholder="Add details about this to-do"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 text-slate-900 placeholder-slate-400 resize-none"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date (optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 text-slate-900"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 px-3 py-2 rounded-2xl font-medium transition-colors ${
                    priority === p
                      ? "bg-[#D08945] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 pt-4">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-2xl bg-[#D08945] text-white font-medium hover:bg-[#b07335] transition-colors disabled:opacity-50"
          >
            {isLoading ? "Saving..." : todo ? "Update" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
