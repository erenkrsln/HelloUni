"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  MessageSquare,
  ListTodo,
  Folder,
  BarChart2,
  Info,
  Calendar,
  Plus,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface WorkspaceOverviewProps {
  workspaceId: string;
  onTabChange?: (
    tab: "chat" | "tasks" | "files" | "polls" | "events" | "group-info",
  ) => void;
}

export function WorkspaceOverview({
  workspaceId,
  onTabChange,
}: WorkspaceOverviewProps) {
  const { currentUser } = useCurrentUser();
  const isGroup = workspaceId.startsWith("group_");
  const groupId = workspaceId.replace("group_", "");

  // Fetch group data
  const groupDisplay = useQuery(
    api.queries.getConversationDisplay,
    isGroup ? { conversationId: groupId as any } : "skip",
  );

  const groupMembers = useQuery(
    api.queries.getConversationMembers,
    isGroup ? { conversationId: groupId as any } : "skip",
  );

  const workspaceGroup = useQuery(
    api.queries.getWorkspaceGroup,
    isGroup ? { groupId: groupId as any } : "skip",
  );

  // Fetch counts for function boxes
  const taskStats = useQuery(
    api.workspace.getTaskStats,
    isGroup ? { workspaceId } : "skip",
  );

  const eventStats = useQuery(
    api.workspace.getEventStats,
    isGroup ? { workspaceId } : "skip",
  );

  const fileStats = useQuery(
    api.workspace.getFileStats,
    isGroup ? { workspaceId } : "skip",
  );

  const pollStats = useQuery(
    api.workspace.getPollStats,
    isGroup ? { workspaceId } : "skip",
  );

  // Determine if user is owner or admin
  const isOwner =
    currentUser &&
    groupDisplay &&
    (groupDisplay as any).creatorId === currentUser._id;
  const isAdmin =
    currentUser &&
    groupDisplay &&
    (groupDisplay as any).adminIds?.includes(currentUser._id);
  const canManage = isOwner || isAdmin;

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Group Header */}
        <div className="text-center pb-6 border-b border-gray-100">
          {groupDisplay && (
            <>
              <div className="text-5xl mb-3 opacity-80">
                {(groupDisplay as any).icon || "👥"}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {groupDisplay?.displayName || "Group"}
              </h1>
              <div className="flex flex-wrap justify-center gap-2 mb-3 text-xs">
                {workspaceGroup?.groupType && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                    {workspaceGroup.groupType === "Other" &&
                    workspaceGroup.customGroupType
                      ? workspaceGroup.customGroupType
                      : workspaceGroup.groupType}
                  </span>
                )}
                {workspaceGroup?.visibility && (
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium capitalize">
                    {workspaceGroup.visibility}
                  </span>
                )}
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                  {groupMembers?.length || 0} members
                </span>
              </div>
              {(groupDisplay as any).description && (
                <p className="text-sm text-gray-600 mb-4 italic">
                  "{(groupDisplay as any).description}"
                </p>
              )}
              {workspaceGroup?.currentGoal && (
                <div className="text-xs text-gray-600 bg-blue-50 inline-block px-3 py-2 rounded-full mt-2">
                  🎯 {workspaceGroup.currentGoal}
                </div>
              )}
            </>
          )}
        </div>

        {/* Function Boxes - 2 column grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Chat */}
          <div
            onClick={() => onTabChange?.("chat")}
            className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <MessageSquare size={24} className="text-[#D08945] mb-2" />
            <h3 className="font-medium text-sm mb-2">Chat</h3>
            <p className="text-xs text-gray-500">Open chat</p>
          </div>

          {/* Tasks */}
          <div
            onClick={() => onTabChange?.("tasks")}
            className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <ListTodo size={24} className="text-blue-600 mb-2" />
            <h3 className="font-medium text-sm mb-2">Tasks</h3>
            <p className="text-xs text-gray-500">
              {taskStats?.openCount || 0} open
            </p>
          </div>

          {/* Files */}
          <div
            onClick={() => onTabChange?.("files")}
            className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <Folder size={24} className="text-green-600 mb-2" />
            <h3 className="font-medium text-sm mb-2">Files</h3>
            <p className="text-xs text-gray-500">
              {fileStats?.count || 0} files
            </p>
          </div>

          {/* Polls */}
          <div
            onClick={() => onTabChange?.("polls")}
            className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <BarChart2 size={24} className="text-purple-600 mb-2" />
            <h3 className="font-medium text-sm mb-2">Polls</h3>
            <p className="text-xs text-gray-500">
              {pollStats?.activeCount || 0} active
            </p>
          </div>

          {/* Events */}
          <div
            onClick={() => onTabChange?.("events")}
            className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <Calendar size={24} className="text-orange-600 mb-2" />
            <h3 className="font-medium text-sm mb-2">Events</h3>
            <p className="text-xs text-gray-500">
              {eventStats?.upcomingCount || 0} upcoming
            </p>
          </div>

          {/* Group Info - NEW */}
          <div
            onClick={() => onTabChange?.("group-info")}
            className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <Info size={24} className="text-slate-600 mb-2" />
            <h3 className="font-medium text-sm mb-2">Group Info</h3>
            <p className="text-xs text-gray-500">
              {groupMembers?.length || 0} members
              {workspaceGroup?.groupType &&
                ` · ${workspaceGroup.groupType === "Other" && workspaceGroup.customGroupType ? workspaceGroup.customGroupType : workspaceGroup.groupType}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
