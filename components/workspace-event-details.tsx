"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Settings, Edit2, Calendar, Clock, MapPin, Globe, Lock, ArrowLeft } from "lucide-react";
import { EventFormModal } from "@/components/event-form-modal";

interface WorkspaceEventDetailsProps {
  workspaceId: string;
  onBackToOverview: () => void;
}

export function WorkspaceEventDetails({
  workspaceId,
  onBackToOverview,
}: WorkspaceEventDetailsProps) {
  const { currentUser } = useCurrentUser();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const eventId = workspaceId.replace("event_", "") as Id<"events">;

  // Fetch Event details
  const eventData = useQuery(api.events.getById, { eventId });

  // Fetch linked group name if group event
  const isGroupEvent = !!eventData?.workspaceId;
  const groupId = eventData?.workspaceId?.replace("group_", "") as Id<"conversations"> | undefined;
  const groupDisplay = useQuery(
    api.queries.getConversationDisplay,
    groupId ? { conversationId: groupId } : "skip"
  );

  const isCreator = currentUser && eventData && eventData.createdBy === currentUser._id;

  const formatEventDate = (timestamp?: number) => {
    if (!timestamp) return "Nicht festgelegt";
    return new Date(timestamp).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatEventTime = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!eventData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500 font-medium">
        Lade Eventdetails...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={onBackToOverview}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors select-none"
        >
          <ArrowLeft size={16} />
          <span>Zurück zur Übersicht</span>
        </button>

        {/* Page Title */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-2 select-none">
          <Settings size={28} className="text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-900">Eventdetails</h1>
        </div>

        {/* Details Card */}
        <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 select-none">
            <h2 className="font-bold text-lg flex items-center text-slate-900">
              <span className="w-6 h-6 mr-2 select-none">📋</span>
              Details
            </h2>
            {isCreator && (
              <button
                onClick={() => setIsEditOpen(true)}
                className="p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all"
                title="Event bearbeiten"
              >
                <Edit2 size={16} className="text-slate-600" />
              </button>
            )}
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
              <span className="text-slate-500 font-semibold select-none">Titel</span>
              <span className="sm:col-span-2 font-bold text-slate-900 break-words">{eventData.title}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
              <span className="text-slate-500 font-semibold select-none">Beschreibung</span>
              <p className="sm:col-span-2 text-slate-700 font-medium leading-relaxed whitespace-pre-wrap break-words">
                {eventData.description || <span className="italic text-slate-400 select-none">Keine Beschreibung vorhanden.</span>}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
              <span className="text-slate-500 font-semibold select-none">Datum</span>
              <span className="sm:col-span-2 font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                {formatEventDate(eventData.startTime)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
              <span className="text-slate-500 font-semibold select-none">Uhrzeit</span>
              <span className="sm:col-span-2 font-bold text-slate-900 flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                {formatEventTime(eventData.startTime)} - {formatEventTime(eventData.endTime)} Uhr
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
              <span className="text-slate-500 font-semibold select-none">Ort</span>
              <span className="sm:col-span-2 font-bold text-slate-900 flex items-center gap-1.5 break-words">
                <MapPin size={14} className="text-slate-400" />
                {eventData.location || <span className="italic text-slate-400 font-medium select-none">Kein Ort angegeben</span>}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-50">
              <span className="text-slate-500 font-semibold select-none">Sichtbarkeit</span>
              <span className="sm:col-span-2 font-bold text-slate-900 flex items-center gap-1.5 select-none">
                {eventData.isPrivate ? (
                  <>
                    <Lock size={14} className="text-slate-400" /> Privat
                  </>
                ) : (
                  <>
                    <Globe size={14} className="text-slate-400" /> Öffentlich
                  </>
                )}
              </span>
            </div>

            {isGroupEvent && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2">
                <span className="text-slate-500 font-semibold select-none">Gruppe</span>
                <span className="sm:col-span-2 font-bold text-blue-600 break-words">
                  {groupDisplay?.displayName || "Gruppenevent"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isCreator && (
        <EventFormModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          mode="edit"
          event={eventData}
          userId={currentUser._id}
        />
      )}
    </div>
  );
}
