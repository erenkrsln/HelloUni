"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { CalendarDays, MapPin, Clock, Plus } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export function WorkspaceEvents({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const events = useQuery(api.events.listByUser, currentUser ? { userId: currentUser._id } : "skip");
  const groupEvents = events?.filter((event) => event.workspaceId === workspaceId) || [];

  const handleCreateGroupEvent = () => {
    router.push(`/calendar?workspace=${workspaceId}`);
  };

  return (
    <div className="p-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Group Events</h2>
          <p className="text-sm text-slate-500">Upcoming events created for this group workspace.</p>
        </div>
        <button
          onClick={handleCreateGroupEvent}
          className="inline-flex items-center gap-2 rounded-full bg-[#D08945] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#b07335] transition-colors"
        >
          <Plus size={16} /> New group event
        </button>
      </div>

      {events === undefined ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">Loading events…</div>
      ) : groupEvents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          <CalendarDays size={34} className="mx-auto mb-3 text-[#D08945]" />
          <p className="text-sm font-medium">No group events yet.</p>
          <p className="text-sm text-slate-400 mt-2">Create a group event so members can stay aligned and join the next study session.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupEvents.map((event) => (
            <Link
              key={event._id.toString()}
              href={`/workspace/event_${event._id}`}
              className="group block rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 truncate">{event.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                      <Clock size={12} />
                      {new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {' - '}
                      {new Date(event.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                      <CalendarDays size={12} />
                      {new Date(event.startTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D08945] bg-[#FEE3C1] rounded-full px-2 py-1">Group event</span>
              </div>
              {event.location && (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <MapPin size={14} />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
