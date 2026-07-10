"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { MoreVertical, Plus, LogOut } from "lucide-react";
import { useToast } from "@/components/toast";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { AddMemberModal } from "@/components/add-member-modal";

export function WorkspaceMembers({ workspaceId }: { workspaceId: string }) {
  const { currentUser } = useCurrentUser();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    type: "remove" | "promote" | "demote" | "leave";
    memberName: string;
    memberId: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isGroup = workspaceId.startsWith("group_");
  const isEvent = workspaceId.startsWith("event_");
  const groupId = workspaceId.replace("group_", "") as Id<"conversations">;
  const eventId = workspaceId.replace("event_", "") as Id<"events">;

  // For group events, fetch the event to get its group relationship
  const eventData = useQuery(
    api.events.getById,
    isEvent ? { eventId } : "skip",
  );

  const groupIdFromEvent =
    isEvent && eventData?.workspaceId
      ? (eventData.workspaceId.replace("group_", "") as Id<"conversations">)
      : null;

  // Fetch group data to determine roles
  const groupData = useQuery(
    api.queries.getGroupById,
    isGroup
      ? { groupId }
      : groupIdFromEvent
        ? { groupId: groupIdFromEvent }
        : "skip",
  );

  // Fetch members - for groups directly, for group events from the group
  const conversationMembers = useQuery(
    api.queries.getConversationMembers,
    isGroup
      ? { conversationId: groupId }
      : groupIdFromEvent
        ? { conversationId: groupIdFromEvent }
        : "skip",
  );

  const members = conversationMembers;

  // Mutations
  const promoteToAdmin = useMutation(api.workspace.promoteToAdmin);
  const demoteAdmin = useMutation(api.workspace.demoteAdmin);
  const removeMember = useMutation(api.workspace.removeMember);
  const leaveGroup = useMutation(api.workspace.leaveGroup);

  const toast = useToast();

  if (!members) {
    return (
      <div className="text-center p-8 text-slate-500 font-medium">
        {isEvent ? "Teilnehmende werden geladen..." : "Mitglieder werden geladen..."}
      </div>
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

  const canManageMembers =
    isGroup && (currentUserRole === "creator" || currentUserRole === "admin");

  // Get member role
  const getMemberRole = (memberId: string): string => {
    if (groupData?.creatorId?.toString() === memberId) return "creator";
    if (groupData?.adminIds?.some((id: any) => id.toString() === memberId))
      return "admin";
    return "member";
  };

  const handleConfirmAction = async () => {
    if (!confirmState || !currentUser) return;

    // Determine which group/conversation to use
    const targetConversationId = isGroup ? groupId : groupIdFromEvent;
    if (!targetConversationId) return;

    setIsLoading(true);
    try {
      switch (confirmState.type) {
        case "remove":
          await removeMember({
            conversationId: targetConversationId,
            userId: confirmState.memberId as any,
            actorId: currentUser._id,
          });
          toast.success(
            `${confirmState.memberName} wurde aus der Gruppe entfernt`,
          );
          break;

        case "promote":
          await promoteToAdmin({
            conversationId: targetConversationId,
            userId: confirmState.memberId as any,
            actorId: currentUser._id,
          });
          toast.success(
            `${confirmState.memberName} wurde zum Admin gemacht`,
          );
          break;

        case "demote":
          await demoteAdmin({
            conversationId: targetConversationId,
            userId: confirmState.memberId as any,
            actorId: currentUser._id,
          });
          toast.success(
            `${confirmState.memberName} wurde zum normalen Mitglied gemacht`,
          );
          break;

        case "leave":
          await leaveGroup({
            conversationId: targetConversationId,
            userId: currentUser._id,
          });
          toast.success("Du hast die Gruppe verlassen");
          break;
      }

      setConfirmState(null);
    } catch (error: any) {
      toast.error(error.message || "Aktion fehlgeschlagen");
    } finally {
      setIsLoading(false);
      setOpenMenuId(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "creator":
        return "bg-purple-100 text-purple-700";
      case "admin":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRoleName = (role: string) => {
    return role === "creator" ? "Besitzer" : role === "admin" ? "Admin" : "Mitglied";
  };

  return (
    <div className="p-4 animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center px-1">
        <div>
          <h2 className="font-bold text-lg text-slate-900">
            {isEvent ? "Gruppenmitglieder" : "Mitglieder"}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {members?.length || 0} {isEvent ? "in der Gruppe" : "in dieser Gruppe"}
          </p>
        </div>
        {canManageMembers && (
          <button
            onClick={() => setIsAddMemberModalOpen(true)}
            className="p-2 rounded-full bg-[#D08945] text-white hover:bg-[#b07335] transition-colors"
            title="Mitglied hinzufügen"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {members && members.length > 0 ? (
          members.map((member, idx) => {
            const memberRole = getMemberRole(member._id.toString());

            return (
              <div
                key={member._id || idx}
                className={`p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  idx !== members.length - 1 ? "border-b border-slate-100" : ""
                }`}
              >
                {/* Member Info */}
                <div className="flex items-center gap-3 flex-1">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 border border-slate-300 flex items-center justify-center">
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-slate-700 text-sm select-none">
                        {member.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name & Username */}
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      {member.name}{" "}
                      {currentUser?._id === member._id && (
                        <span className="text-[10px] bg-[#D08945]/10 text-[#D08945] px-1.5 py-0.5 rounded-full border border-[#D08945]/20 font-bold">
                          Du
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      @{member.username || "student"}
                    </div>
                  </div>
                </div>

                {/* Role Badge & Menu */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getRoleBadgeColor(memberRole)}`}
                  >
                    {getRoleName(memberRole)}
                  </span>

                  {/* Action Menu */}
                  {isGroup &&
                    currentUser?._id !== member._id &&
                    canManageMembers && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === member._id.toString()
                                ? null
                                : member._id.toString(),
                            )
                          }
                          className="p-1.5 rounded-full hover:bg-slate-200 transition-colors text-slate-600"
                          title="Mitgliederaktionen"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMenuId === member._id.toString() && (
                          <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-10 p-1">
                            {memberRole !== "admin" &&
                              memberRole !== "creator" && (
                                <button
                                  onClick={() => {
                                    setConfirmState({
                                      type: "promote",
                                      memberName: member.name || "Mitglied",
                                      memberId: member._id.toString(),
                                    });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-semibold"
                                >
                                  Zum Admin machen
                                </button>
                              )}

                            {memberRole === "admin" && (
                              <button
                                onClick={() => {
                                  setConfirmState({
                                    type: "demote",
                                    memberName: member.name || "Mitglied",
                                    memberId: member._id.toString(),
                                  });
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-semibold"
                              >
                                Zum Mitglied machen
                              </button>
                            )}

                            {memberRole !== "creator" && (
                              <>
                                <div className="border-t border-slate-100 my-1"></div>
                                <button
                                  onClick={() => {
                                    setConfirmState({
                                      type: "remove",
                                      memberName: member.name || "Mitglied",
                                      memberId: member._id.toString(),
                                    });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold"
                                >
                                  Aus Gruppe entfernen
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  {/* Leave Group Button (for current user) */}
                  {isGroup &&
                    currentUser?._id === member._id &&
                    memberRole !== "creator" && (
                      <button
                        onClick={() => {
                          setConfirmState({
                            type: "leave",
                            memberName: "Gruppe",
                            memberId: member._id.toString(),
                          });
                        }}
                        className="p-1.5 rounded-full hover:bg-red-100 transition-colors text-red-600"
                        title="Gruppe verlassen"
                      >
                        <LogOut size={16} />
                      </button>
                    )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-slate-500 font-medium">Noch keine Mitglieder</div>
        )}

        {!isGroup && (
          <div className="p-3 text-xs text-slate-400 text-center bg-slate-50 border-t border-slate-100 font-semibold">
            Mitglieder-Feature für Events folgt in Kürze
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {isGroup && (
        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          groupId={groupId}
          currentMembers={members || []}
          onMemberAdded={() => {
            setIsAddMemberModalOpen(false);
          }}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmState && (
        <ConfirmationDialog
          isOpen={!!confirmState}
          onClose={() => setConfirmState(null)}
          onConfirm={handleConfirmAction}
          title={
            confirmState.type === "remove"
              ? "Mitglied entfernen"
              : confirmState.type === "promote"
                ? "Zum Admin machen"
                : confirmState.type === "demote"
                  ? "Zum Mitglied machen"
                  : "Gruppe verlassen"
          }
          description={
            confirmState.type === "remove"
              ? `Möchtest du ${confirmState.memberName} aus der Gruppe entfernen? Sie verlieren den Zugriff auf alle Gruppeninhalte.`
              : confirmState.type === "promote"
                ? `Möchtest du ${confirmState.memberName} zum Admin machen? Sie erhalten damit volle Berechtigungen zur Mitgliederverwaltung.`
                : confirmState.type === "demote"
                  ? `Möchtest du ${confirmState.memberName} zum normalen Mitglied machen? Sie verlieren die Admin-Rechte.`
                  : "Bist du sicher, dass du diese Gruppe verlassen möchtest? Du kannst nur wieder beitreten, wenn du neu hinzugefügt wirst."
          }
          confirmLabel={
            confirmState.type === "remove"
              ? "Entfernen"
              : confirmState.type === "promote"
                ? "Zum Admin machen"
                : confirmState.type === "demote"
                  ? "Zum Mitglied machen"
                  : "Gruppe verlassen"
          }
          isDangerous={
            confirmState.type === "remove" || confirmState.type === "leave"
          }
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
