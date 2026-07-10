"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Search, Check, Smile } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_SUGGESTIONS = ["📚", "💻", "🎉", "🧪", "🏆", "🎓", "📊", "🤝"];
const GROUP_TYPE_LABELS: Record<string, string> = {
  "Study Group": "Lerngruppe",
  "Project Team": "Projektteam",
  "Course Group": "Kursgruppe",
  "Event Team": "Eventteam",
  "Other": "Sonstiges",
};

const GROUP_TYPES = [
  "Study Group",
  "Project Team",
  "Course Group",
  "Event Team",
  "Other",
];

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType] = useState<string>("Study Group");
  const [customGroupType, setCustomGroupType] = useState("");
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

  const selectableUsers =
    allUsers?.filter((u) => u._id !== currentUser._id) || [];
  const filteredUsers = selectableUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleUser = (userId: Id<"users">) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      alert("Bitte gib einen Gruppennamen ein und wähle mindestens ein Mitglied aus.");
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
        groupType: groupType as
          | "Study Group"
          | "Project Team"
          | "Course Group"
          | "Event Team"
          | "Other",
        customGroupType:
          groupType === "Other"
            ? customGroupType.trim() || undefined
            : undefined,
        currentGoal: currentGoal.trim() || undefined,
        visibility: visibility,
        creatorId: currentUser._id,
      });
      onClose();
      // Reset form
      setGroupName("");
      setDescription("");
      setGroupType("Study Group");
      setCustomGroupType("");
      setVisibility("private");
      setIcon("📚");
      setCurrentGoal("");
      setSearchQuery("");
      setSelectedUsers([]);
      router.push(`/workspace/group_${conversationId}`);
    } catch (error) {
      console.error(error);
      alert("Fehler beim Erstellen der Gruppe.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex flex-col max-h-[90vh] p-0">
        <div className="flex-shrink-0 border-b border-slate-100 px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Neue Gruppe erstellen
            </DialogTitle>
          </DialogHeader>
        </div>

        <DialogBody className="overflow-y-auto flex-1 px-6 py-4 min-h-0">
          <div className="space-y-4 pr-1">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Gruppenname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="z. B. Lerngruppe Mathe"
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Beschreibung
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibe den Zweck dieser Gruppe…"
                rows={3}
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] resize-none"
              />
            </div>

            {/* Group Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Gruppentyp
              </label>
              <select
                value={groupType}
                onChange={(e) => {
                  setGroupType(e.target.value);
                  // Clear custom type if switching away from "Other"
                  if (e.target.value !== "Other") {
                    setCustomGroupType("");
                  }
                }}
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
              >
                {GROUP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {GROUP_TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Group Type (if "Other" selected) */}
            {groupType === "Other" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Eigenen Gruppentyp
                </label>
                <input
                  type="text"
                  value={customGroupType}
                  onChange={(e) => setCustomGroupType(e.target.value)}
                  placeholder="Gib deinen Gruppentyp ein"
                  className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
                />
              </div>
            )}

            {/* Visibility */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Sichtbarkeit
              </label>
              <select
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as "private" | "public")
                }
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
              >
                <option value="private">Privat</option>
                <option value="public">Öffentlich</option>
              </select>
            </div>

            {/* Group Icon */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Gruppensymbol
              </label>
              <div className="flex items-center gap-2">
                <div className="text-4xl select-none border border-slate-100 rounded-2xl p-2.5 bg-slate-50/50">{icon}</div>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="px-3.5 py-2.5 text-sm font-semibold border border-slate-200 bg-slate-50 text-slate-700 rounded-2xl hover:bg-slate-100 transition-colors flex items-center gap-2"
                >
                  <Smile size={18} />
                  Ändern
                </button>
              </div>
              {showEmojiPicker && (
                <div className="flex flex-wrap gap-2 mt-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {EMOJI_SUGGESTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setIcon(emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-2xl p-2 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Current Goal */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Aktuelles Ziel
              </label>
              <input
                type="text"
                value={currentGoal}
                onChange={(e) => setCurrentGoal(e.target.value)}
                placeholder="Woran arbeitet diese Gruppe zurzeit?"
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
              />
            </div>

            {/* Add Members */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Mitglieder hinzufügen <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-3 text-slate-400 flex-shrink-0"
                  size={16}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Benutzer suchen..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-y-auto max-h-[180px] min-h-0 bg-white">
              {filteredUsers.length === 0 ? (
                <div className="text-center text-sm text-slate-400 py-6">
                  Keine Benutzer gefunden.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => toggleUser(user._id)}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate font-medium">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${selectedUsers.includes(user._id) ? "bg-[#D08945] border-[#D08945]" : "border-slate-300"}`}
                      >
                        {selectedUsers.includes(user._id) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogBody>

        <div className="flex-shrink-0 border-t border-slate-100 px-6 py-4">
          <DialogFooter className="flex flex-row justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-2xl border border-slate-200 bg-white transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={
                isSubmitting || !groupName.trim() || selectedUsers.length === 0
              }
              className="bg-[#D08945] text-white px-5 py-2 rounded-2xl text-sm font-semibold hover:bg-[#b07335] disabled:opacity-50 transition-colors min-h-[40px]"
            >
              {isSubmitting ? "Wird erstellt..." : "Gruppe erstellen"}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
