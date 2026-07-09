"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

export function PollEditModal({ poll, isOpen, onClose, userId, hasVotes }: PollEditModalProps) {
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
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold text-slate-900">Edit Poll</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-1">
            {/* Question Field */}
            <div>
              <label className="text-sm font-semibold text-slate-800 block mb-2">Poll Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to ask?"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
              />
            </div>

            {/* Voting Status Warning */}
            {hasVotes && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-sm text-amber-900">
                  <strong>⚠️ Voting in Progress:</strong> Poll options cannot be changed after voting has started. You can only edit the question.
                </p>
              </div>
            )}

            {/* Options Section */}
            {!hasVotes && (
              <div>
                <label className="text-sm font-semibold text-slate-800 block mb-3">Poll Options</label>
                <div className="space-y-2">
                  {options.map((option, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                      />
                      {options.length > 2 && (
                        <button
                          onClick={() => handleRemoveOption(idx)}
                          className="p-2 rounded-full hover:bg-red-50 text-red-600 transition-colors flex-shrink-0"
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
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                >
                  + Add Option
                </button>
              </div>
            )}
          </div>

          {/* Modal Footer with Save/Cancel and Delete Separated */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            {/* Primary Actions: Cancel / Save Changes */}
            <div className="flex gap-3 justify-end mb-4">
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading}
                className="px-6 py-2 rounded-full text-slate-700 border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="px-6 py-2 rounded-full bg-[#D08945] hover:bg-[#b07335] text-white font-semibold"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            {/* Destructive Action: Delete Poll (Separated) */}
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-full py-2.5 font-semibold transition-colors disabled:opacity-50"
              >
                Delete Poll
              </button>
              <p className="text-xs text-slate-500 text-center mt-2">This action cannot be undone.</p>
            </div>
          </div>
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
