"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useToast } from "@/components/toast";
import { Search, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: Id<"conversations">;
  currentMembers: { _id: string }[];
  onMemberAdded?: () => void;
}

export function AddMemberModal({
  isOpen,
  onClose,
  groupId,
  currentMembers,
  onMemberAdded,
}: AddMemberModalProps) {
  const { currentUser } = useCurrentUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState<string | null>(null);

  const searchResults = useQuery(
    api.queries.searchUsers,
    searchTerm && searchTerm.length > 0 ? { searchTerm } : "skip",
  );

  const addMemberMutation = useMutation(api.workspace.addMemberToGroup);
  const toast = useToast();

  // Get current member IDs for quick lookup
  const memberIds = useMemo(
    () => new Set(currentMembers.map((m) => m._id.toString())),
    [currentMembers],
  );

  const handleAddMember = async (userId: string) => {
    if (!currentUser) return;

    setIsAdding(userId);
    try {
      await addMemberMutation({
        groupId,
        userId: userId as any,
        actorId: currentUser._id,
      });

      toast.success("Member added to group");
      setSearchTerm("");
      onMemberAdded?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to add member");
    } finally {
      setIsAdding(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex flex-col p-0">
        <div className="flex-shrink-0 border-b border-slate-200 px-6 py-4">
          <DialogHeader>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-slate-900">
                Add Member to Group
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-6 py-4">
          {/* Search Input */}
          <div className="flex-shrink-0 relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
              autoFocus
            />
          </div>

          {/* Results - Scrollable */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {searchTerm.length === 0 ? (
              <div className="text-center py-8 text-slate-500 flex items-center justify-center h-full">
                <p className="text-sm">Enter a name or username to search</p>
              </div>
            ) : searchResults === undefined ? (
              <div className="text-center py-8 flex flex-col items-center justify-center h-full">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#D08945]"></div>
                <p className="text-sm text-slate-500 mt-2">Searching...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-slate-500 flex items-center justify-center h-full">
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              searchResults.map((user) => {
                const isAlreadyMember = memberIds.has(user._id.toString());
                const isAdding_ = isAdding === user._id;

                return (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 border border-slate-300 flex items-center justify-center">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-slate-700 text-sm">
                            {user.name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          @{user.username}
                        </div>
                      </div>
                    </div>

                    {/* Status / Button */}
                    {isAlreadyMember ? (
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-500 px-3 py-1.5 rounded-full bg-slate-100 flex-shrink-0 whitespace-nowrap">
                        <Check size={14} />
                        <span className="hidden sm:inline">Already member</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddMember(user._id)}
                        disabled={isAdding_}
                        className="px-3 py-1.5 rounded-full bg-[#D08945] text-white text-xs font-medium hover:bg-[#b07335] disabled:opacity-50 transition-colors flex-shrink-0 whitespace-nowrap touch-target"
                      >
                        {isAdding_ ? "Adding..." : "Add"}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
