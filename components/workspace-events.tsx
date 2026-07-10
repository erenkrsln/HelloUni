"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { CalendarDays, MapPin, Clock, Plus, Edit2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { EventFormModal } from "@/components/event-form-modal";
import { EventCard } from "@/components/event-card";
import { SectionHeader } from "@/components/section-header";

export function WorkspaceEvents({
  workspaceId,
  onBackToOverview,
}: {
  workspaceId: string;
  onBackToOverview?: () => void;
}) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const events = useQuery(
    api.events.listByUser,
    currentUser ? { userId: currentUser._id } : "skip",
  );
  const groupEvents =
    events?.filter((event) => event.workspaceId === workspaceId) || [];
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const handleCreateGroupEvent = () => {
    router.push(`/calendar?workspace=${workspaceId}`);
  };

  const editingEvent = editingEventId
    ? groupEvents.find((e) => e._id.toString() === editingEventId)
    : null;

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">
        {onBackToOverview && (
          <SectionHeader
            title="Events"
            subtitle="Gruppenevents und Treffen"
            onBackClick={onBackToOverview}
          />
        )}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
          <div>
            {!onBackToOverview && (
              <>
                <h2 className="text-xl font-bold text-slate-900">
                  Gruppenevents
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  Bevorstehende Events für diesen Gruppen-Workspace.
                </p>
              </>
            )}
          </div>
          <button
            onClick={handleCreateGroupEvent}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#D08945] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#b07335] transition-all active:scale-95"
          >
            <Plus size={16} /> Neues Gruppenevent
          </button>
        </div>

        {events === undefined ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm font-medium">
            Events werden geladen…
          </div>
        ) : groupEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            <CalendarDays size={34} className="mx-auto mb-3 text-[#D08945]" />
            <p className="text-sm font-bold text-slate-900">Noch keine Gruppenevents vorhanden.</p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Erstelle ein Gruppenevent, damit die Mitglieder informiert bleiben und am nächsten Treffen teilnehmen können.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupEvents.map((event) => {
              const editButton = currentUser && event.createdBy === currentUser._id ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingEventId(event._id.toString());
                  }}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                  title="Event bearbeiten"
                >
                  <Edit2 size={16} className="text-[#D08945]" />
                </button>
              ) : undefined;

              return (
                <EventCard
                  key={event._id.toString()}
                  title={event.title}
                  startTime={event.startTime}
                  endTime={event.endTime}
                  location={event.location}
                  description={event.description}
                  badgeText="Gruppe"
                  badgeType="group"
                  href={`/workspace/event_${event._id}`}
                  rightAction={editButton}
                />
              );
            })}
          </div>
        )}
      </div>

      {editingEvent && currentUser && (
        <EventFormModal
          event={editingEvent}
          isOpen={!!editingEventId}
          onClose={() => setEditingEventId(null)}
          mode="edit"
          userId={currentUser._id}
        />
      )}
    </div>
  );
}
