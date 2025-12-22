"use client";

import { Calendar, Users } from "lucide-react";
import { ParticipantsDialog } from "./participants-dialog";
import { Id } from "@/convex/_generated/dataModel";

interface EventDetailsProps {
  postId: Id<"posts">;
  eventDate?: number;
  eventTime?: string;
  participantLimit?: number;
  participantsCount?: number;
  recurrencePattern?: string;
}

export function EventDetails({ 
  eventDate, 
  eventTime, 
  participantLimit, 
  participantsCount,
  recurrencePattern,
  postId
}: EventDetailsProps) {
  const formatEventDate = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="mb-3 space-y-1">
      {eventDate && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatEventDate(eventDate)}</span>
          {eventTime && <span>um {eventTime} Uhr</span>}
        </div>
      )}
      {(participantLimit || participantsCount !== undefined) && (
        <ParticipantsDialog
          postId={postId}
          participantsCount={participantsCount || 0}
          participantLimit={participantLimit}
        />
      )}
      {recurrencePattern && (
        <div className="text-sm text-gray-600">
          Wiederholung: {recurrencePattern}
        </div>
      )}
    </div>
  );
}












