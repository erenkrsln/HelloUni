"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DeletePostDialog } from "./delete-post-dialog";
import { Id } from "@/convex/_generated/dataModel";

interface PostMenuProps {
  postId: Id<"posts">;
  userId: Id<"users">;
}

export function PostMenu({ postId, userId }: PostMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Beitragsoptionen"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors flex-shrink-0"
          >
            <MoreHorizontal aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-40 p-1"
          align="end"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMenuOpen(false);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 aria-hidden="true" className="w-4 h-4" />
            <span>Löschen</span>
          </button>
        </PopoverContent>
      </Popover>
      <DeletePostDialog
        postId={postId}
        userId={userId}
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </>
  );
}












