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
      <div className="text-center p-8 text-gray-500">Loading members...</div>
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
            `${confirmState.memberName} has been removed from the group`,
          );
          break;

        case "promote":
          await promoteToAdmin({
            conversationId: targetConversationId,
            userId: confirmState.memberId as any,
            actorId: currentUser._id,
          });
          toast.success(
            `${confirmState.memberName} has been promoted to Admin`,
          );
          break;

        case "demote":
          await demoteAdmin({
            conversationId: targetConversationId,
            userId: confirmState.memberId as any,
            actorId: currentUser._id,
          });
          toast.success(
            `${confirmState.memberName} has been demoted to Member`,
          );
          break;

        case "leave":
          await leaveGroup({
            conversationId: targetConversationId,
            userId: currentUser._id,
          });
          toast.success("You have left the group");
          break;
      }

      setConfirmState(null);
    } catch (error: any) {
      toast.error(error.message || "Action failed");
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
    return role === "creator" ? "Owner" : role === "admin" ? "Admin" : "Member";
  };

  return (
    <div className="p-4 animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-lg text-slate-900">
            {isEvent ? "Group Members" : "Members"}
          </h2>
          <p className="text-sm text-slate-500">
            {members?.length || 0} {isEvent ? "in the group" : "in this group"}
          </p>
        </div>
        {canManageMembers && (
          <button
            onClick={() => setIsAddMemberModalOpen(true)}
            className="p-2 rounded-full bg-[#D08945] text-white hover:bg-[#b07335] transition-colors"
            title="Add member"
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
                className={`p-3 flex items-center justify-between hover:bg-slate-50 transition-colors ${
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
                      <span className="font-bold text-slate-700 text-sm">
                        {member.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name & Username */}
                  <div className="flex-1">
                    <div className="font-medium text-sm text-slate-900">
                      {member.name}{" "}
                      {currentUser?._id === member._id && (
                        <span className="text-xs text-slate-400 font-normal">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      @{member.username || "student"}
                    </div>
                  </div>
                </div>

                {/* Role Badge & Menu */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getRoleBadgeColor(memberRole)}`}
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
                          title="Member actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMenuId === member._id.toString() && (
                          <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                            {memberRole !== "admin" &&
                              memberRole !== "creator" && (
                                <button
                                  onClick={() => {
                                    setConfirmState({
                                      type: "promote",
                                      memberName: member.name,
                                      memberId: member._id.toString(),
                                    });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                                >
                                  Make Admin
                                </button>
                              )}

                            {memberRole === "admin" && (
                              <button
                                onClick={() => {
                                  setConfirmState({
                                    type: "demote",
                                    memberName: member.name,
                                    memberId: member._id.toString(),
                                  });
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                              >
                                Make Member
                              </button>
                            )}

                            {memberRole !== "creator" && (
                              <>
                                <div className="border-t border-slate-100"></div>
                                <button
                                  onClick={() => {
                                    setConfirmState({
                                      type: "remove",
                                      memberName: member.name,
                                      memberId: member._id.toString(),
                                    });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                                >
                                  Remove from Group
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
                            memberName: "Group",
                            memberId: member._id.toString(),
                          });
                        }}
                        className="p-1.5 rounded-full hover:bg-red-100 transition-colors text-red-600"
                        title="Leave group"
                      >
                        <LogOut size={16} />
                      </button>
                    )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-slate-500">No members yet</div>
        )}

        {!isGroup && (
          <div className="p-3 text-xs text-slate-400 text-center bg-slate-50 border-t border-slate-100">
            Event members feature coming soon
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
            // Refresh members list by closing and reopening would trigger query re-fetch
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={handleConfirmAction}
        title={
          confirmState?.type === "remove"
            ? "Remove Member?"
            : confirmState?.type === "promote"
              ? "Promote to Admin?"
              : confirmState?.type === "demote"
                ? "Demote to Member?"
                : "Leave Group?"
        }
        description={
          confirmState?.type === "remove"
            ? `Remove ${confirmState.memberName} from this group? They will no longer have access to group content.`
            : confirmState?.type === "promote"
              ? `Promote ${confirmState.memberName} to Admin? They will have permission to manage members and group settings.`
              : confirmState?.type === "demote"
                ? `Demote ${confirmState.memberName} to regular Member? They will lose admin permissions.`
                : "Are you sure you want to leave this group? You can rejoin later if it's public."
        }
        confirmLabel={
          confirmState?.type === "remove"
            ? "Remove Member"
            : confirmState?.type === "promote"
              ? "Promote"
              : confirmState?.type === "demote"
                ? "Demote"
                : "Leave Group"
        }
        isDangerous={
          confirmState?.type === "remove" || confirmState?.type === "leave"
        }
        isLoading={isLoading}
      />
    </div>
  );
}
