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

export function WorkspaceGroupInfoEnhanced({
  workspaceId,
  onBackToOverview,
}: WorkspaceGroupInfoEnhancedProps) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditAboutOpen, setIsEditAboutOpen] = useState(false);
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editGroupType, setEditGroupType] = useState<"Study Group" | "Project Team" | "Course Group" | "Event Team" | "Other" | "">("");
  const [editCustomGroupType, setEditCustomGroupType] = useState("");
  const [editCurrentGoal, setEditCurrentGoal] = useState("");
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

  const toast = useToast();

  if (!members || !groupData) {
    return (
      <div className="text-center p-8 text-gray-500">Loading group info...</div>
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

  const handleSaveAboutEdit = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await updateGroupDetails({
        conversationId: groupId,
        description: editDescription,
        userId: currentUser._id,
      });
      setIsEditAboutOpen(false);
      toast.success("Description updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update description");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDetailsEdit = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await updateGroupDetails({
        conversationId: groupId,
        icon: editIcon,
        groupType: editGroupType || undefined,
        customGroupType:
          editGroupType === "Other" ? editCustomGroupType : undefined,
        currentGoal: editCurrentGoal,
        userId: currentUser._id,
      });
      setIsEditDetailsOpen(false);
      toast.success("Group details updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update details");
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
          toast.success(`${confirmState.memberName} has been removed`);
          break;

        case "promote":
          if (!confirmState.memberId) return;
          await promoteToAdmin({
            conversationId: groupId,
            userId: confirmState.memberId as any,
            actorId: currentUser._id,
          });
          toast.success(`${confirmState.memberName} is now an admin`);
          break;

        case "demote":
          if (!confirmState.memberId) return;
          await demoteAdmin({
            conversationId: groupId,
            userId: confirmState.memberId as any,
            actorId: currentUser._id,
          });
          toast.success(`${confirmState.memberName} is now a member`);
          break;

        case "leave":
          await leaveGroup({
            conversationId: groupId,
            userId: currentUser._id,
          });
          toast.success("You have left the group");
          // Navigate back to workspace
          setTimeout(() => router.push("/workspace"), 500);
          break;
      }
      setConfirmState(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to perform action");
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
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={16} />
          Back to Overview
        </button>

        {/* About Section */}
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg flex items-center">
              <span className="w-6 h-6 mr-2">ℹ️</span>
              About
            </h2>
            {canManageGroup && (
              <button
                onClick={() => {
                  setEditDescription(groupData?.description || "");
                  setIsEditAboutOpen(true);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Edit description"
              >
                <Edit2 size={16} className="text-gray-600" />
              </button>
            )}
          </div>
          {groupData?.description ? (
            <p className="text-sm text-gray-600 leading-relaxed">
              {groupData.description}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">No description yet</p>
          )}
        </div>

        {/* Group Details Section */}
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg flex items-center">
              <span className="w-6 h-6 mr-2">📋</span>
              Details
            </h2>
            {canManageGroup && (
              <button
                onClick={() => {
                  setEditIcon(groupData?.icon || "📚");
                  setEditGroupType(workspaceGroup?.groupType || "Study Group");
                  setEditCurrentGoal(workspaceGroup?.currentGoal || "");
                  setIsEditDetailsOpen(true);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Edit details"
              >
                <Edit2 size={16} className="text-gray-600" />
              </button>
            )}
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Icon</span>
              <span className="text-2xl">{groupData?.icon || "👥"}</span>
            </div>
            {workspaceGroup?.groupType && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Type</span>
                <span className="font-medium text-gray-900">
                  {workspaceGroup.groupType === "Other" &&
                  workspaceGroup.customGroupType
                    ? workspaceGroup.customGroupType
                    : workspaceGroup.groupType}
                </span>
              </div>
            )}
            {workspaceGroup?.visibility && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Visibility</span>
                <span className="font-medium text-gray-900 capitalize">
                  {workspaceGroup.visibility}
                </span>
              </div>
            )}
            {workspaceGroup?.currentGoal && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Current Goal</span>
                <span className="font-medium text-gray-900 text-right max-w-xs">
                  {workspaceGroup.currentGoal}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Members</span>
              <span className="font-medium text-gray-900">
                {members.length}
              </span>
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg flex items-center">
              <span className="w-6 h-6 mr-2">👥</span>
              Members
            </h2>
            {canManageMembers && (
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Add member"
              >
                <Plus size={18} className="text-gray-600" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {members.map((member: any) => {
              const role = getMemberRole(member._id);
              const isCurrent = isCurrentUser(member._id);

              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">
                        {member.name || "Unknown"}
                      </span>
                      {isCurrent && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {role === "creator" && (
                        <div className="flex items-center gap-1 text-xs text-amber-600">
                          <Crown size={14} />
                          <span>Owner</span>
                        </div>
                      )}
                      {role === "admin" && (
                        <div className="flex items-center gap-1 text-xs text-purple-600">
                          <Star size={14} />
                          <span>Admin</span>
                        </div>
                      )}
                      {role === "member" && (
                        <span className="text-xs text-gray-500">Member</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {canManageMembers && !isCurrent && role !== "creator" && (
                    <div className="flex items-center gap-1 ml-2">
                      {role === "member" && (
                        <button
                          onClick={() =>
                            setConfirmState({
                              type: "promote",
                              memberName: member.name || "Member",
                              memberId: member._id,
                            })
                          }
                          className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors"
                        >
                          Promote
                        </button>
                      )}
                      {role === "admin" && (
                        <button
                          onClick={() =>
                            setConfirmState({
                              type: "demote",
                              memberName: member.name || "Member",
                              memberId: member._id,
                            })
                          }
                          className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                        >
                          Demote
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setConfirmState({
                            type: "remove",
                            memberName: member.name || "Member",
                            memberId: member._id,
                          })
                        }
                        className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                      >
                        Remove
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
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Leave group"
                    >
                      <LogOut size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Group Settings Section */}
        {canManageGroup && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <h2 className="font-semibold text-lg mb-3 flex items-center">
              <span className="w-6 h-6 mr-2">⚙️</span>
              Group Settings
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => {
                  // Initialize edit state with current values
                  setEditIcon(groupData?.icon || "👥");
                  setEditGroupType(workspaceGroup?.groupType || "Study Group");
                  setEditCustomGroupType(workspaceGroup?.customGroupType || "");
                  setEditCurrentGoal(workspaceGroup?.currentGoal || "");
                  setIsEditDetailsOpen(true);
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit Group Details
              </button>
              {currentUserRole === "creator" && (
                <button
                  onClick={() => setConfirmState({ type: "delete" })}
                  className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Delete Group
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit About Modal */}
      {isEditAboutOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold text-lg">Edit Description</h3>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Describe the purpose of this group…"
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsEditAboutOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAboutEdit}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {isEditDetailsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg">Edit Group Details</h3>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Icon
              </label>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-4xl">{editIcon}</div>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Smile size={16} />
                </button>
              </div>
              {showEmojiPicker && (
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  {EMOJI_SUGGESTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setEditIcon(emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-2xl p-2 rounded hover:bg-gray-200 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Group Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Type
              </label>
              <select
                value={editGroupType}
                onChange={(e) => {
                  setEditGroupType(e.target.value as "Study Group" | "Project Team" | "Course Group" | "Event Team" | "Other");
                  // Clear custom type if switching away from "Other"
                  if (e.target.value !== "Other") {
                    setEditCustomGroupType("");
                  }
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {GROUP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Group Type (if "Other" selected) */}
            {editGroupType === "Other" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Group Type
                </label>
                <input
                  type="text"
                  value={editCustomGroupType}
                  onChange={(e) => setEditCustomGroupType(e.target.value)}
                  placeholder="Enter your group type"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Current Goal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Goal
              </label>
              <textarea
                value={editCurrentGoal}
                onChange={(e) => setEditCurrentGoal(e.target.value)}
                placeholder="What is this group currently working toward?"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setIsEditDetailsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDetailsEdit}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isLoading ? "Saving..." : "Save Changes"}
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
              ? "Delete Group"
              : `${confirmState.type === "remove" ? "Remove" : confirmState.type === "promote" ? "Promote" : confirmState.type === "demote" ? "Demote" : "Leave"} ${confirmState.type === "leave" ? "Group" : "Member"}`
          }
          description={
            confirmState.type === "delete"
              ? "Are you sure you want to delete this group? This cannot be undone."
              : confirmState.type === "leave"
                ? "Are you sure you want to leave this group? You can rejoin by being added again."
                : confirmState.type === "promote"
                  ? `Make ${confirmState.memberName} an admin? They'll have full member management permissions.`
                  : confirmState.type === "demote"
                    ? `Demote ${confirmState.memberName} from admin? They'll become a regular member.`
                    : `Remove ${confirmState.memberName} from the group? This cannot be undone.`
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
