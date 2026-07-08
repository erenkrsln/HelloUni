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
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this poll? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      await deletePoll({
        pollId: poll._id,
        userId,
      });

      toast.success("Poll deleted successfully");
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Poll</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Poll question"
              className="w-full mt-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
            />
          </div>

          {hasVotes ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> Poll options cannot be changed after voting has started. You can only edit the question.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Options</label>
              <div className="space-y-2">
                {options.map((option, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(idx)}
                        className="p-2 rounded-full hover:bg-red-50 text-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddOption}
                className="mt-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                + Add Option
              </button>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2 pt-6">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Poll
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-[#D08945] hover:bg-[#b07335] text-white"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
