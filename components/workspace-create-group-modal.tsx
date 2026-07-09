"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Search, Check, Smile } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from "@/components/ui/dialog";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_SUGGESTIONS = ["📚", "💻", "🎉", "🧪", "🏆", "🎓", "📊", "🤝"];
const GROUP_TYPES = ["Study Group", "Project Team", "Course Group", "Event Team", "Other"];

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType] = useState<string>("Study Group");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [icon, setIcon] = useState("📚");
  const [currentGoal, setCurrentGoal] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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
        description: description.trim() || undefined,
        icon: icon,
        groupType: groupType as "Study Group" | "Project Team" | "Course Group" | "Event Team" | "Other",
        currentGoal: currentGoal.trim() || undefined,
        visibility: visibility,
        creatorId: currentUser._id,
      });
      onClose();
      // Reset form
      setGroupName("");
      setDescription("");
      setGroupType("Study Group");
      setVisibility("private");
      setIcon("📚");
      setCurrentGoal("");
      setSearchQuery("");
      setSelectedUsers([]);
      router.push(`/workspace/group_${conversationId}`);
    } catch (error) {
      console.error(error);
      alert("Failed to create group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>

        <DialogBody className="overflow-y-auto flex-1">
          <div className="space-y-4 pr-2">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="E.g. Study Group Math"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this group…"
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Group Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Group Type</label>
              <select 
                value={groupType}
                onChange={(e) => setGroupType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {GROUP_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Visibility</label>
              <select 
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as "private" | "public")}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>

            {/* Group Icon */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Group Icon</label>
              <div className="flex items-center gap-2">
                <div className="text-4xl">{icon}</div>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="px-3 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <Smile size={16} />
                  Change
                </button>
              </div>
              {showEmojiPicker && (
                <div className="flex flex-wrap gap-2 mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {EMOJI_SUGGESTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setIcon(emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-2xl p-2 rounded hover:bg-slate-200 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Current Goal */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Goal</label>
              <input 
                type="text" 
                value={currentGoal}
                onChange={(e) => setCurrentGoal(e.target.value)}
                placeholder="What is this group currently working toward?"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Add Members */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Add Members <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400 flex-shrink-0" size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-y-auto max-h-[200px] min-h-0">
              {filteredUsers.length === 0 ? (
                <div className="text-center text-sm text-slate-400 py-4">No users found.</div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map((user) => (
                    <div 
                      key={user._id} 
                      onClick={() => toggleUser(user._id)}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                          {user.image ? <img src={user.image} alt={user.name} className="w-full h-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{user.name}</div>
                          <div className="text-xs text-slate-500 truncate">@{user.username}</div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${selectedUsers.includes(user._id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                        {selectedUsers.includes(user._id) && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            disabled={isSubmitting || !groupName.trim() || selectedUsers.length === 0}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[40px]"
          >
            {isSubmitting ? "Creating..." : "Create Group"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
