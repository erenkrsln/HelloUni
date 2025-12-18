"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeletePostDialogProps {
  postId: Id<"posts">;
  userId: Id<"users">;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeletePostDialog({ postId, userId, isOpen, onOpenChange }: DeletePostDialogProps) {
  const deletePost = useMutation(api.mutations.deletePost);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deletePost({ postId, userId });
      onOpenChange(false);
    } catch (error) {
      console.error("Fehler beim Löschen des Posts:", error);
      alert("Fehler beim Löschen des Posts");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:w-[80vw] max-w-[420px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900 m-0 mb-2 text-center">
            Beitrag löschen
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 leading-relaxed text-center">
            Möchtest du diesen Beitrag wirklich löschen?
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 pt-4 flex-row gap-3 justify-center border-t border-gray-100 flex">
          <DialogClose asChild>
            <Button 
              variant="outline" 
              disabled={isDeleting}
              className="min-w-[100px]"
            >
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="min-w-[100px] font-medium"
          >
            {isDeleting ? "Wird gelöscht..." : "Löschen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}







