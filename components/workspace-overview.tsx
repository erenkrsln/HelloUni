"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Id } from "@/convex/_generated/dataModel";
import {
  MessageSquare,
  ListTodo,
  Folder,
  BarChart2,
  Settings,
  Calendar,
  Plus,
  Zap,
  Users,
  Clock,
  MapPin,
  Lock,
  Globe,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";

const GROUP_TYPE_LABELS: Record<string, string> = {
  "Study Group": "Lerngruppe",
  "Project Team": "Projektteam",
  "Course Group": "Kursgruppe",
  "Event Team": "Eventteam",
  "Other": "Sonstiges",
};

interface WorkspaceOverviewProps {
  workspaceId: string;
  onTabChange?: (
    tab: "chat" | "tasks" | "files" | "polls" | "events" | "group-info" | "event-details",
  ) => void;
}

export function WorkspaceOverview({
  workspaceId,
  onTabChange,
}: WorkspaceOverviewProps) {
  const { currentUser } = useCurrentUser();
  const isGroup = workspaceId.startsWith("group_");
  const isEvent = workspaceId.startsWith("event_");
  const groupId = isGroup ? workspaceId.replace("group_", "") : "";
  const eventId = isEvent ? workspaceId.replace("event_", "") : "";

  // Fetch group data using getGroupById as the single source of truth for name, icon, description
  const groupData = useQuery(
    api.queries.getGroupById,
    isGroup ? { groupId: groupId as any } : "skip",
  );

  const groupMembers = useQuery(
    api.queries.getConversationMembers,
    isGroup ? { conversationId: groupId as any } : "skip",
  );

  const workspaceGroup = useQuery(
    api.queries.getWorkspaceGroup,
    isGroup ? { groupId: groupId as any } : "skip",
  );

  // Fetch Event details if event workspace
  const eventData = useQuery(
    api.events.getById,
    isEvent ? { eventId: eventId as any } : "skip",
  );

  const eventGroupId = eventData?.workspaceId?.replace("group_", "") as Id<"conversations"> | undefined;
  const eventGroup = useQuery(
    api.queries.getConversationDisplay,
    eventGroupId ? { conversationId: eventGroupId } : "skip"
  );

  const eventGroupMembers = useQuery(
    api.queries.getConversationMembers,
    eventGroupId ? { conversationId: eventGroupId } : "skip"
  );

  // Determine if user is owner or admin to manage settings/description
  const isOwner = currentUser && groupData && groupData.creatorId === currentUser._id;
  const isAdmin = currentUser && groupData && groupData.adminIds?.includes(currentUser._id);
  const canManage = isOwner || isAdmin;

  // Fetch counts for function boxes
  const taskStats = useQuery(
    api.workspace.getTaskStats,
    { workspaceId },
  );

  const eventStats = useQuery(
    api.workspace.getEventStats,
    isGroup ? { workspaceId } : "skip",
  );

  const fileStats = useQuery(
    api.workspace.getFileStats,
    { workspaceId },
  );

  const pollStats = useQuery(
    api.workspace.getPollStats,
    { workspaceId },
  );

  // Determine if user is owner or admin
  const visibilityLabels = {
    public: "Öffentlich",
    private: "Privat",
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Group Header */}
        {isGroup && (
          <div className="text-center pb-6 border-b border-gray-100">
            {groupData && (
              <>
                {/* 1. Group Icon */}
                <div className="text-5xl mb-3 opacity-90 select-none">
                  {groupData.icon || "👥"}
                </div>

                {/* 2. Large Group Name */}
                <h1 className="text-3xl font-bold text-gray-900 mb-3 break-words px-4">
                  {groupData.name || "Gruppe"}
                </h1>

                {/* 3. Metadata Badges */}
                <div className="flex flex-wrap justify-center gap-2 mb-4 text-xs">
                  {workspaceGroup?.groupType && (
                    <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-semibold shadow-sm">
                      {workspaceGroup.groupType === "Other" && workspaceGroup.customGroupType
                        ? workspaceGroup.customGroupType
                        : (GROUP_TYPE_LABELS[workspaceGroup.groupType] || workspaceGroup.groupType)}
                    </span>
                  )}
                  {workspaceGroup?.visibility && (
                    <span className="bg-gray-50 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-full font-semibold capitalize shadow-sm">
                      {visibilityLabels[workspaceGroup.visibility] || workspaceGroup.visibility}
                    </span>
                  )}
                  <span className="bg-gray-50 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-full font-semibold shadow-sm">
                    {groupMembers?.length || 0} {groupMembers?.length === 1 ? "Mitglied" : "Mitglieder"}
                  </span>
                </div>

                {/* 4. Description */}
                {groupData.description ? (
                  <p className="text-sm text-gray-600 max-w-sm mx-auto whitespace-pre-wrap break-words leading-relaxed italic px-4">
                    "{groupData.description}"
                  </p>
                ) : (
                  canManage && (
                    <button
                      onClick={() => onTabChange?.("group-info")}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors mt-1 font-medium"
                    >
                      + Beschreibung hinzufügen
                    </button>
                  )
                )}

                {/* 5. Current Goal */}
                {workspaceGroup?.currentGoal && (
                  <div className="mt-5 p-3.5 bg-blue-50/40 border border-blue-100/60 rounded-2xl text-xs text-gray-700 max-w-xs mx-auto shadow-sm">
                    <div className="font-semibold text-blue-800 mb-1 flex items-center justify-center gap-1 select-none">
                      🎯 Aktuelles Ziel
                    </div>
                    <p className="italic text-center break-words px-2 text-gray-600">
                      "{workspaceGroup.currentGoal}"
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Event Header */}
        {isEvent && eventData && (
          <div className="text-center pb-6 border-b border-slate-100 flex flex-col items-center">
            {/* Visual Date block */}
            <div className="flex flex-col items-center justify-center bg-[#D08945]/10 border border-[#D08945]/20 rounded-2xl w-16 h-16 shrink-0 shadow-sm mx-auto mb-3 select-none">
              <span className="text-xs font-extrabold text-[#953F0B] uppercase tracking-wider">
                {new Date(eventData.startTime).toLocaleString("de-DE", { month: "short" }).toUpperCase()}
              </span>
              <span className="text-2xl font-extrabold text-slate-800 leading-none mt-0.5">
                {new Date(eventData.startTime).getDate()}
              </span>
            </div>

            {/* Event Title */}
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2.5 break-words px-4">
              {eventData.title}
            </h1>

            {/* Date & Time / Location */}
            <div className="text-xs text-slate-500 font-semibold space-y-1 mb-4 select-none">
              <div className="flex items-center justify-center gap-1">
                <span>📅</span>
                <span>
                  {new Date(eventData.startTime).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })} · {new Date(eventData.startTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}–{new Date(eventData.endTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                </span>
              </div>
              {eventData.location && (
                <div className="flex items-center justify-center gap-1 text-slate-600">
                  <span>📍</span>
                  <span>{eventData.location}</span>
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap justify-center gap-2 mb-4 text-[11px] select-none">
              {eventData.workspaceId ? (
                <span className="bg-[#FEE3C1] text-[#953F0B] border border-[#FEE3C1]/80 px-3 py-1 rounded-full font-bold shadow-sm">
                  {eventGroup?.displayName || "Gruppe"}
                </span>
              ) : eventData.isPrivate ? (
                <span className="bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1 rounded-full font-bold shadow-sm">
                  Privat
                </span>
              ) : (
                <span className="bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full font-bold shadow-sm">
                  Öffentlich
                </span>
              )}
            </div>

            {/* Description */}
            {eventData.description ? (
              <p className="text-sm text-slate-600 max-w-sm mx-auto whitespace-pre-wrap break-words leading-relaxed italic px-4">
                "{eventData.description}"
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic select-none">
                Keine Beschreibung vorhanden.
              </p>
            )}
          </div>
        )}

        {/* Function Boxes - 2 column grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Chat */}
          <div
            onClick={() => onTabChange?.("chat")}
            className="border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:bg-slate-50/30 transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
          >
            <div>
              <MessageSquare size={24} className="text-[#D08945] mb-2" />
              <h3 className="font-bold text-sm text-slate-800 mb-1">Chat</h3>
            </div>
            <p className="text-xs text-gray-500 font-medium select-none">Chat öffnen</p>
          </div>

          {/* Tasks */}
          <div
            onClick={() => onTabChange?.("tasks")}
            className="border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:bg-slate-50/30 transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
          >
            <div>
              <ListTodo size={24} className="text-blue-600 mb-2" />
              <h3 className="font-bold text-sm text-slate-800 mb-1">Aufgaben</h3>
            </div>
            <p className="text-xs text-gray-500 font-medium select-none">
              {taskStats?.openCount || 0} offen
            </p>
          </div>

          {/* Files */}
          <div
            onClick={() => onTabChange?.("files")}
            className="border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:bg-slate-50/30 transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
          >
            <div>
              <Folder size={24} className="text-green-600 mb-2" />
              <h3 className="font-bold text-sm text-slate-800 mb-1">Dateien</h3>
            </div>
            <p className="text-xs text-gray-500 font-medium select-none">
              {fileStats?.count || 0} {fileStats?.count === 1 ? "Datei" : "Dateien"}
            </p>
          </div>

          {/* Polls */}
          <div
            onClick={() => onTabChange?.("polls")}
            className="border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:bg-slate-50/30 transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
          >
            <div>
              <BarChart2 size={24} className="text-purple-600 mb-2" />
              <h3 className="font-bold text-sm text-slate-800 mb-1">Umfragen</h3>
            </div>
            <p className="text-xs text-gray-500 font-medium select-none">
              {pollStats?.activeCount || 0} aktiv
            </p>
          </div>

          {isGroup ? (
            <>
              {/* Events (Group only) */}
              <div
                onClick={() => onTabChange?.("events")}
                className="border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:bg-slate-50/30 transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
              >
                <div>
                  <Calendar size={24} className="text-orange-600 mb-2" />
                  <h3 className="font-bold text-sm text-slate-800 mb-1">Events</h3>
                </div>
                <p className="text-xs text-gray-500 font-medium select-none">
                  {eventStats?.upcomingCount || 0} bevorstehend
                </p>
              </div>

              {/* Group Settings (Group only) -> renamed "Einstellungen" */}
              <div
                onClick={() => onTabChange?.("group-info")}
                className="border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:bg-slate-50/30 transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
              >
                <div>
                  <Settings size={24} className="text-slate-600 mb-2" />
                  <h3 className="font-bold text-sm text-slate-800 mb-1">Einstellungen</h3>
                </div>
                <p className="text-xs text-gray-500 font-medium select-none">
                  {groupMembers?.length || 0} {groupMembers?.length === 1 ? "Mitglied" : "Mitglieder"}
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Teilnehmende (Event only) */}
              <div
                onClick={() => onTabChange?.("group-info")}
                className="border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:bg-slate-50/30 transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
              >
                <div>
                  <Users size={24} className="text-orange-600 mb-2" />
                  <h3 className="font-bold text-sm text-slate-800 mb-1">Teilnehmende</h3>
                </div>
                <p className="text-xs text-gray-500 font-medium select-none">
                  {(eventGroupMembers?.length || 1)} {((eventGroupMembers?.length || 1) === 1 ? "Teilnehmer" : "Teilnehmende")}
                </p>
              </div>

              {/* Eventdetails (Event only) */}
              <div
                onClick={() => onTabChange?.("event-details")}
                className="border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:bg-slate-50/30 transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
              >
                <div>
                  <Settings size={24} className="text-slate-600 mb-2" />
                  <h3 className="font-bold text-sm text-slate-800 mb-1">Eventdetails</h3>
                </div>
                <p className="text-xs text-gray-500 font-medium select-none">Details & Optionen</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
