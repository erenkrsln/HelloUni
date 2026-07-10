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
      toast.error("Poll question is required");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      toast.error("A poll needs at least two options");
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

      toast.success("Poll updated successfully");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update poll");
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

      toast.success("Poll deleted successfully");
      setShowDeleteConfirm(false);
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete poll");
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
        <DialogContent hideCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              Edit Poll
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5">
            {/* Question Field */}
            <div>
              <label className="text-sm font-semibold text-slate-800 block mb-2">
                Poll Question
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to ask?"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Voting Status Warning */}
            {hasVotes && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900">
                  <strong>⚠️ Voting in Progress:</strong> Poll options cannot be
                  changed after voting has started. You can only edit the
                  question.
                </p>
              </div>
            )}

            {/* Options Section */}
            {!hasVotes && (
              <div>
                <label className="text-sm font-semibold text-slate-800 block mb-3">
                  Poll Options
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
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      {options.length > 2 && (
                        <button
                          onClick={() => handleRemoveOption(idx)}
                          className="p-2 rounded-full hover:bg-red-50 text-red-600 transition-colors flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title="Remove option"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddOption}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  + Add Option
                </button>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-3">
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-6 py-2 rounded-lg text-slate-700 border border-slate-200 hover:bg-slate-50 min-h-[40px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold min-h-[40px]"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg py-2.5 font-semibold transition-colors disabled:opacity-50 min-h-[40px]"
              >
                Delete Poll
              </button>
              <p className="text-xs text-slate-500 text-center mt-2">
                This action cannot be undone.
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
        title="Delete Poll?"
        description="Are you sure you want to delete this poll? Existing votes will be permanently removed and this action cannot be undone."
        confirmLabel="Delete Poll"
        cancelLabel="Cancel"
        isDangerous={true}
        isLoading={isLoading}
      />
    </>
  );
}
