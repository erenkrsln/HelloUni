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
      <div className="text-center p-8 text-gray-500">Loading group settings...</div>
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
      toast.success("Group details updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update group details");
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
          setTimeout(() => router.push("/workspace"), 500);
          break;

        case "delete":
          await deleteConversation({
            conversationId: groupId,
            userId: currentUser._id,
          });
          toast.success("Group deleted successfully");
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

        {/* Page Title */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-2">
          <Settings size={28} className="text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Group Settings</h1>
        </div>

        {/* Group Details Card */}
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
            <h2 className="font-semibold text-lg flex items-center">
              <span className="w-6 h-6 mr-2">📋</span>
              Group Details
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
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit group details"
              >
                <Edit2 size={16} className="text-gray-600" />
              </button>
            )}
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Name</span>
              <span className="sm:col-span-2 font-semibold text-gray-900 break-words">{groupData?.name || "Not set"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Description</span>
              <p className="sm:col-span-2 text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                {groupData?.description || <span className="italic text-gray-400">Not set</span>}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Icon</span>
              <span className="sm:col-span-2 text-2xl select-none">{groupData?.icon || "👥"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Type</span>
              <span className="sm:col-span-2 font-medium text-gray-900">
                {workspaceGroup?.groupType === "Other" && workspaceGroup?.customGroupType
                  ? workspaceGroup.customGroupType
                  : workspaceGroup?.groupType || <span className="italic text-gray-400">Not set</span>}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Visibility</span>
              <span className="sm:col-span-2 font-medium text-gray-900 capitalize">
                {workspaceGroup?.visibility || <span className="italic text-gray-400">Not set</span>}
              </span>
            </div>
            {workspaceGroup?.currentGoal && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Current Goal</span>
                <span className="sm:col-span-2 font-medium text-gray-900 break-words">{workspaceGroup.currentGoal}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Members</span>
              <span className="sm:col-span-2 font-medium text-gray-900">{members.length}</span>
            </div>
            {workspaceGroup?.createdAt && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2">
                <span className="text-gray-500 font-medium">Created</span>
                <span className="sm:col-span-2 text-gray-900">
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
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
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

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
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

        {/* Danger Zone */}
        {currentUserRole === "creator" && (
          <div className="border border-red-200 rounded-xl p-4 bg-red-50/20">
            <h2 className="font-semibold text-lg text-red-800 mb-2 flex items-center">
              <span className="w-6 h-6 mr-2">⚠️</span>
              Danger Zone
            </h2>
            <p className="text-xs text-red-600/80 mb-4 leading-relaxed">
              Once you delete a group, all data, messages, tasks, and files will be permanently deleted and cannot be undone.
            </p>
            <button
              onClick={() => setConfirmState({ type: "delete" })}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-colors shadow-sm"
            >
              Delete Group
            </button>
          </div>
        )}
      </div>

      {/* Edit Group Details Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg border-b border-gray-100 pb-2">Edit Group Details</h3>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter group name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe the purpose of this group…"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Icon
              </label>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-4xl select-none">{editIcon}</div>
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
                  setEditGroupType(e.target.value as any);
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
                  placeholder="Enter your custom group type"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visibility
              </label>
              <select
                value={editVisibility}
                onChange={(e) => setEditVisibility(e.target.value as "public" | "private")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>

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

            {/* Buttons */}
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isLoading || !editName.trim()}
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
