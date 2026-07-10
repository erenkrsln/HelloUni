"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  Edit2,
  Plus,
  LogOut,
  Crown,
  Star,
  ArrowLeft,
  Smile,
  Settings,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { AddMemberModal } from "@/components/add-member-modal";
import { useRouter } from "next/navigation";

interface WorkspaceGroupInfoEnhancedProps {
  workspaceId: string;
  onBackToOverview?: () => void;
}

const EMOJI_SUGGESTIONS = ["📚", "💻", "🎉", "🧪", "🏆", "🎓", "📊", "🤝"];
const GROUP_TYPES = [
  "Study Group",
  "Project Team",
  "Course Group",
  "Event Team",
  "Other",
];

const GROUP_TYPE_LABELS: Record<string, string> = {
  "Study Group": "Lerngruppe",
  "Project Team": "Projektteam",
  "Course Group": "Kursgruppe",
  "Event Team": "Eventteam",
  "Other": "Sonstiges",
};

const VISIBILITY_LABELS: Record<string, string> = {
  public: "Öffentlich",
  private: "Privat",
};

export function WorkspaceGroupInfoEnhanced({
  workspaceId,
  onBackToOverview,
}: WorkspaceGroupInfoEnhancedProps) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  // Unified Edit Modal States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editGroupType, setEditGroupType] = useState<"Study Group" | "Project Team" | "Course Group" | "Event Team" | "Other" | "">("");
  const [editCustomGroupType, setEditCustomGroupType] = useState("");
  const [editCurrentGoal, setEditCurrentGoal] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">("private");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    type: "remove" | "promote" | "demote" | "leave" | "delete";
    memberName?: string;
    memberId?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isGroup = workspaceId.startsWith("group_");
  const groupId = workspaceId.replace("group_", "") as Id<"conversations">;

  // Fetch group data
  const groupData = useQuery(
    api.queries.getGroupById,
    isGroup ? { groupId } : "skip",
  );

  // Fetch workspace group details
  const workspaceGroup = useQuery(
    api.queries.getWorkspaceGroup,
    isGroup ? { groupId } : "skip",
  );

  // Fetch members
  const members = useQuery(
    api.queries.getConversationMembers,
    isGroup ? { conversationId: groupId } : "skip",
  );

  // Mutations
  const updateGroupDetails = useMutation(api.mutations.updateGroupDetails);
  const promoteToAdmin = useMutation(api.workspace.promoteToAdmin);
  const demoteAdmin = useMutation(api.workspace.demoteAdmin);
  const removeMember = useMutation(api.workspace.removeMember);
  const leaveGroup = useMutation(api.workspace.leaveGroup);
  const deleteConversation = useMutation(api.mutations.deleteConversation);

  const toast = useToast();

  if (!members || !groupData) {
    return (
      <div className="text-center p-8 text-slate-500 font-medium">Einstellungen werden geladen...</div>
    );
  }

  // Determine current user's role
  let currentUserRole = "member";
  if (currentUser && groupData) {
    if (groupData.creatorId === currentUser._id) {
      currentUserRole = "creator";
    } else if (groupData.adminIds?.includes(currentUser._id)) {
      currentUserRole = "admin";
    }
  }

  const canManageGroup =
    isGroup && (currentUserRole === "creator" || currentUserRole === "admin");
  const canManageMembers = canManageGroup;
  const isCurrentUser = (memberId: string) =>
    currentUser && currentUser._id === memberId;

  // Get member role
  const getMemberRole = (memberId: string): string => {
    if (groupData?.creatorId?.toString() === memberId) return "creator";
    if (groupData?.adminIds?.some((id: any) => id.toString() === memberId))
      return "admin";
    return "member";
  };

  const handleBackToOverview = () => {
    if (onBackToOverview) {
      onBackToOverview();
    }
  };

  const handleSaveEdit = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await updateGroupDetails({
        conversationId: groupId,
        name: editName.trim(),
        description: editDescription,
        icon: editIcon,
        groupType: editGroupType || undefined,
        customGroupType:
          editGroupType === "Other" ? editCustomGroupType : undefined,
        currentGoal: editCurrentGoal,
        visibility: editVisibility,
        userId: currentUser._id,
      });
      setIsEditOpen(false);
      toast.success("Gruppendetails erfolgreich aktualisiert");
    } catch (error: any) {
      toast.error(error?.message || "Aktualisierung der Gruppendetails fehlgeschlagen");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState || !currentUser) return;

    setIsLoading(true);
    try {
      switch (confirmState.type) {
        case "remove":
          if (!confirmState.memberId) return;
          await removeMember({
            conversationId: groupId,
            userId: confirmState.memberId as any,
            actorId: currentUser._id,
          });
          toast.success(`${confirmState.memberName} wurde entfernt`);
          break;

        case "promote":
          if (!confirmState.memberId) return;
          await promoteToAdmin({
            conversationId: groupId,
            userId: confirmState.memberId as any,
            actorId: currentUser._id,
          });
          toast.success(`${confirmState.memberName} ist jetzt Admin`);
          break;

        case "demote":
          if (!confirmState.memberId) return;
          await demoteAdmin({
            conversationId: groupId,
            userId: confirmState.memberId as any,
            actorId: currentUser._id,
          });
          toast.success(`${confirmState.memberName} ist jetzt normales Mitglied`);
          break;

        case "leave":
          await leaveGroup({
            conversationId: groupId,
            userId: currentUser._id,
          });
          toast.success("Du hast die Gruppe verlassen");
          setTimeout(() => router.push("/workspace"), 500);
          break;

        case "delete":
          await deleteConversation({
            conversationId: groupId,
            userId: currentUser._id,
          });
          toast.success("Gruppe erfolgreich gelöscht");
          setTimeout(() => router.push("/workspace"), 500);
          break;
      }
      setConfirmState(null);
    } catch (error: any) {
      toast.error(error?.message || "Aktion fehlgeschlagen");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Back to Overview Button */}
        <button
          onClick={handleBackToOverview}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Zurück zur Übersicht
        </button>

        {/* Page Title */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-2">
          <Settings size={28} className="text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-900">Einstellungen</h1>
        </div>

        {/* Group Details Card */}
        <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h2 className="font-bold text-lg flex items-center text-slate-900">
              <span className="w-6 h-6 mr-2 select-none">📋</span>
              Gruppendetails
            </h2>
            {canManageGroup && (
              <button
                onClick={() => {
                  setEditName(groupData?.name || "");
                  setEditDescription(groupData?.description || "");
                  setEditIcon(groupData?.icon || "📚");
                  setEditGroupType(workspaceGroup?.groupType || "Study Group");
                  setEditCustomGroupType(workspaceGroup?.customGroupType || "");
                  setEditCurrentGoal(workspaceGroup?.currentGoal || "");
                  setEditVisibility(workspaceGroup?.visibility || "private");
                  setIsEditOpen(true);
                }}
                className="p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all"
                title="Gruppendetails bearbeiten"
              >
                <Edit2 size={16} className="text-slate-600" />
              </button>
            )}
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Name</span>
              <span className="sm:col-span-2 font-bold text-slate-900 break-words">{groupData?.name || "Nicht festgelegt"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Beschreibung</span>
              <p className="sm:col-span-2 text-slate-700 font-medium leading-relaxed whitespace-pre-wrap break-words">
                {groupData?.description || <span className="italic text-slate-400">Nicht festgelegt</span>}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Symbol</span>
              <span className="sm:col-span-2 text-2xl select-none">{groupData?.icon || "👥"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Typ</span>
              <span className="sm:col-span-2 font-bold text-slate-900">
                {workspaceGroup?.groupType === "Other" && workspaceGroup?.customGroupType
                  ? workspaceGroup.customGroupType
                  : (workspaceGroup?.groupType ? (GROUP_TYPE_LABELS[workspaceGroup.groupType] || workspaceGroup.groupType) : <span className="italic text-slate-400">Nicht festgelegt</span>)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Sichtbarkeit</span>
              <span className="sm:col-span-2 font-bold text-slate-900">
                {workspaceGroup?.visibility ? (VISIBILITY_LABELS[workspaceGroup.visibility] || workspaceGroup.visibility) : <span className="italic text-slate-400">Nicht festgelegt</span>}
              </span>
            </div>
            {workspaceGroup?.currentGoal && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
                <span className="text-slate-500 font-semibold">Aktuelles Ziel</span>
                <span className="sm:col-span-2 font-bold text-slate-900 break-words">{workspaceGroup.currentGoal}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Mitglieder</span>
              <span className="sm:col-span-2 font-bold text-slate-900">{members.length}</span>
            </div>
            {workspaceGroup?.createdAt && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2">
                <span className="text-slate-500 font-semibold">Erstellt am</span>
                <span className="sm:col-span-2 text-slate-900 font-bold">
                  {new Date(workspaceGroup.createdAt).toLocaleDateString("de-DE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Members Section */}
        <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h2 className="font-bold text-lg flex items-center text-slate-900">
              <span className="w-6 h-6 mr-2 select-none">👥</span>
              Mitglieder
            </h2>
            {canManageMembers && (
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all"
                title="Mitglied hinzufügen"
              >
                <Plus size={18} className="text-slate-600" />
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {members.map((member: any) => {
              const role = getMemberRole(member._id);
              const isCurrent = isCurrentUser(member._id);

              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {member.name || "Unbekannt"}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold bg-[#D08945]/10 text-[#D08945] px-2 py-0.5 rounded-full border border-[#D08945]/20">
                          Du
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {role === "creator" && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                          <Crown size={14} />
                          <span>Besitzer</span>
                        </div>
                      )}
                      {role === "admin" && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-purple-600">
                          <Star size={14} />
                          <span>Admin</span>
                        </div>
                      )}
                      {role === "member" && (
                        <span className="text-xs font-medium text-slate-500">Mitglied</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {canManageMembers && !isCurrent && role !== "creator" && (
                    <div className="flex items-center gap-1.5 ml-2">
                      {role === "member" && (
                        <button
                          onClick={() =>
                            setConfirmState({
                              type: "promote",
                              memberName: member.name || "Mitglied",
                              memberId: member._id,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 border border-purple-100/50 transition-colors active:scale-95"
                        >
                          Zum Admin machen
                        </button>
                      )}
                      {role === "admin" && (
                        <button
                          onClick={() =>
                            setConfirmState({
                              type: "demote",
                              memberName: member.name || "Mitglied",
                              memberId: member._id,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors active:scale-95"
                        >
                          Zum Mitglied machen
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setConfirmState({
                            type: "remove",
                            memberName: member.name || "Mitglied",
                            memberId: member._id,
                          })
                        }
                        className="px-2.5 py-1 text-xs font-bold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-100/50 transition-colors active:scale-95"
                      >
                        Entfernen
                      </button>
                    </div>
                  )}

                  {/* Leave button for current user (non-owner) */}
                  {isCurrent && currentUserRole !== "creator" && (
                    <button
                      onClick={() =>
                        setConfirmState({
                          type: "leave",
                        })
                      }
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-colors active:scale-95"
                      title="Gruppe verlassen"
                    >
                      <LogOut size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Danger Zone renamed to Gruppe löschen */}
        {currentUserRole === "creator" && (
          <div className="border border-red-200 rounded-2xl p-5 bg-red-50/20 shadow-sm">
            <h2 className="font-bold text-lg text-red-800 mb-2 flex items-center">
              <span className="w-6 h-6 mr-2 select-none">⚠️</span>
              Gruppe löschen
            </h2>
            <p className="text-xs text-red-600/80 mb-4 leading-relaxed font-medium">
              Wenn du diese Gruppe löschst, werden zugehörige Aufgaben, Dateien, Umfragen, Events und Nachrichten dauerhaft entfernt.
            </p>
            <button
              onClick={() => setConfirmState({ type: "delete" })}
              className="w-full px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-2xl transition-all shadow-sm active:scale-95"
            >
              Gruppe löschen
            </button>
          </div>
        )}
      </div>

      {/* Edit Group Details Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="font-bold text-lg border-b border-slate-100 pb-3 text-slate-900">Gruppendetails bearbeiten</h3>

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Gruppenname
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Gruppenname eingeben"
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Beschreibung
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Beschreibe den Zweck dieser Gruppe…"
                rows={3}
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] resize-none"
              />
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Gruppensymbol
              </label>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-4xl select-none border border-slate-100 rounded-2xl p-2.5 bg-slate-50/50">{editIcon}</div>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="px-3.5 py-2.5 text-sm font-semibold border border-slate-200 bg-slate-50 text-slate-700 rounded-2xl hover:bg-slate-100 transition-colors"
                >
                  <Smile size={18} />
                </button>
              </div>
              {showEmojiPicker && (
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {EMOJI_SUGGESTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setEditIcon(emoji);
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

            {/* Group Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Gruppentyp
              </label>
              <select
                value={editGroupType}
                onChange={(e) => {
                  setEditGroupType(e.target.value as any);
                  if (e.target.value !== "Other") {
                    setEditCustomGroupType("");
                  }
                }}
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
              >
                {GROUP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {GROUP_TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Group Type (if "Other" selected) */}
            {editGroupType === "Other" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Eigenen Gruppentyp
                </label>
                <input
                  type="text"
                  value={editCustomGroupType}
                  onChange={(e) => setEditCustomGroupType(e.target.value)}
                  placeholder="Eigenen Gruppentyp eingeben"
                  className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
                />
              </div>
            )}

            {/* Visibility */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Sichtbarkeit
              </label>
              <select
                value={editVisibility}
                onChange={(e) => setEditVisibility(e.target.value as "public" | "private")}
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945]"
              >
                <option value="private">Privat</option>
                <option value="public">Öffentlich</option>
              </select>
            </div>

            {/* Current Goal */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Aktuelles Ziel
              </label>
              <textarea
                value={editCurrentGoal}
                onChange={(e) => setEditCurrentGoal(e.target.value)}
                placeholder="Woran arbeitet diese Gruppe zurzeit?"
                rows={2}
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-2xl border border-slate-200 bg-white transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isLoading || !editName.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#D08945] hover:bg-[#b07335] disabled:opacity-50 rounded-2xl transition-colors shadow-sm"
              >
                {isLoading ? "Wird gespeichert..." : "Änderungen speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {members && (
        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          groupId={groupId}
          currentMembers={members}
          onMemberAdded={() => setIsAddMemberModalOpen(false)}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmState && (
        <ConfirmationDialog
          isOpen={!!confirmState}
          title={
            confirmState.type === "delete"
              ? "Gruppe löschen"
              : confirmState.type === "leave"
                ? "Gruppe verlassen"
                : confirmState.type === "promote"
                  ? "Zum Admin machen"
                  : confirmState.type === "demote"
                    ? "Zum Mitglied machen"
                    : "Mitglied entfernen"
          }
          description={
            confirmState.type === "delete"
              ? "Bist du sicher, dass du diese Gruppe löschen möchtest? Dies kann nicht rückgängig gemacht werden."
              : confirmState.type === "leave"
                ? "Bist du sicher, dass du diese Gruppe verlassen möchtest? Du kannst nur wieder beitreten, wenn du neu hinzugefügt wirst."
                : confirmState.type === "promote"
                  ? `Möchtest du ${confirmState.memberName} zum Admin machen? Sie erhalten damit volle Berechtigungen zur Mitgliederverwaltung.`
                  : confirmState.type === "demote"
                    ? `Möchtest du ${confirmState.memberName} zum normalen Mitglied machen?`
                    : `Möchtest du ${confirmState.memberName} aus der Gruppe entfernen? Dies kann nicht rückgängig gemacht werden.`
          }
          onConfirm={handleConfirmAction}
          onClose={() => setConfirmState(null)}
          isLoading={isLoading}
          isDangerous={
            confirmState.type === "remove" ||
            confirmState.type === "leave" ||
            confirmState.type === "delete"
          }
        />
      )}
    </div>
  );
}
