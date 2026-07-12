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
        <div className="flex-shrink-0 border-b border-border px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Neue Gruppe erstellen
            </DialogTitle>
          </DialogHeader>
        </div>

        <DialogBody className="overflow-y-auto flex-1 px-6 py-4 min-h-0">
          <div className="space-y-4 pr-1">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Gruppenname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="z. B. Lerngruppe Mathe"
                className="w-full bg-background text-foreground border border-input rounded-2xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Beschreibung
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibe den Zweck dieser Gruppe…"
                rows={3}
                className="w-full bg-background text-foreground border border-input rounded-2xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Gruppentyp
              </label>
              <select
                value={groupType}
                onChange={(e) => {
                  setGroupType(e.target.value);
                  if (e.target.value !== "Other") {
                    setCustomGroupType("");
                  }
                }}
                className="w-full border border-input rounded-2xl px-3.5 py-2.5 text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
              >
                {GROUP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {GROUP_TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
            </div>

            {groupType === "Other" && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  Eigenen Gruppentyp
                </label>
                <input
                  type="text"
                  value={customGroupType}
                  onChange={(e) => setCustomGroupType(e.target.value)}
                  placeholder="Gib deinen Gruppentyp ein"
                  className="w-full bg-background text-foreground border border-input rounded-2xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Sichtbarkeit
              </label>
              <select
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as "private" | "public")
                }
                className="w-full border border-input rounded-2xl px-3.5 py-2.5 text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
              >
                <option value="private">Privat</option>
                <option value="public">Öffentlich</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Gruppensymbol
              </label>
              <div className="flex items-center gap-2">
                <div className="text-4xl select-none border border-border rounded-2xl p-2.5 bg-muted">{icon}</div>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="px-3.5 py-2.5 text-sm font-semibold border border-input bg-muted text-foreground rounded-2xl hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <Smile size={18} />
                  Ändern
                </button>
              </div>
              {showEmojiPicker && (
                <div className="flex flex-wrap gap-2 mt-2 p-2 bg-muted rounded-2xl border border-border">
                  {EMOJI_SUGGESTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setIcon(emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-2xl p-2 rounded-xl hover:bg-accent transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Aktuelles Ziel
              </label>
              <input
                type="text"
                value={currentGoal}
                onChange={(e) => setCurrentGoal(e.target.value)}
                placeholder="Woran arbeitet diese Gruppe zurzeit?"
                className="w-full bg-background text-foreground border border-input rounded-2xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Mitglieder hinzufügen <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute left-3.5 top-3 text-muted-foreground flex-shrink-0"
                  size={16}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Benutzer suchen..."
                  className="w-full bg-background text-foreground border border-input rounded-2xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
                />
              </div>
            </div>

            <div className="border border-border rounded-2xl overflow-y-auto max-h-[180px] min-h-0 bg-card">
              {filteredUsers.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-6">
                  Keine Benutzer gefunden.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <button
                      type="button"
                      key={user._id}
                      onClick={() => toggleUser(user._id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-accent cursor-pointer transition-colors text-left focus:outline-none focus:ring-2 focus:ring-[#D08945]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate font-medium">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${selectedUsers.includes(user._id) ? "bg-[#D08945] border-[#D08945]" : "border-border"}`}
                      >
                        {selectedUsers.includes(user._id) && (
                          <Check aria-hidden="true" size={12} className="text-white" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogBody>

        <div className="flex-shrink-0 border-t border-border px-6 py-4 bg-muted">
          <DialogFooter className="flex flex-row justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-2xl border border-border bg-background transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
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
