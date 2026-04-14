"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { X, Search, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allUsers = useQuery(api.queries.getAllUsers);
  const createConversation = useMutation(api.mutations.createConversation);

  if (!isOpen || !currentUser) return null;

  const selectableUsers = allUsers?.filter((u) => u._id !== currentUser._id) || [];
  const filteredUsers = selectableUsers.filter((u) => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: Id<"users">) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      alert("Please provide a group name and select at least one member.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const participants = [currentUser._id, ...selectedUsers];
      const conversationId = await createConversation({
        participants,
        name: groupName.trim(),
        creatorId: currentUser._id,
      });
      onClose();
      router.push(`/workspace/group_${conversationId}`);
    } catch (error) {
      console.error(error);
      alert("Failed to create group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="font-semibold text-lg">Create New Group</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
            <input 
              type="text" 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="E.g. Study Group Math"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#D08945]"
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Add Members</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#D08945]"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl mt-2 p-1">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-4">No users found.</div>
            ) : (
              filteredUsers.map((user) => (
                <div 
                  key={user._id} 
                  onClick={() => toggleUser(user._id)}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {user.image ? <img src={user.image} alt={user.name} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div>
                      <div className="text-sm font-medium leading-none">{user.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">@{user.username}</div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedUsers.includes(user._id) ? 'bg-[#D08945] border-[#D08945]' : 'border-gray-300'}`}>
                    {selectedUsers.includes(user._id) && <Check size={12} className="text-white" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            disabled={isSubmitting || !groupName.trim() || selectedUsers.length === 0}
            className="bg-[#D08945] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[#b07335] disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
