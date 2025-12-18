"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users } from "lucide-react";

interface ParticipantsDialogProps {
  postId: Id<"posts">;
  participantsCount: number;
  participantLimit?: number;
}

export function ParticipantsDialog({ postId, participantsCount, participantLimit }: ParticipantsDialogProps) {
  const participantsList = useQuery(
    api.queries.getParticipants,
    participantsCount > 0 ? { postId } : "skip"
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer transition-colors">
          <Users className="w-4 h-4" />
          <span>
            {participantsCount || 0}
            {participantLimit && ` / ${participantLimit}`} Teilnehmer
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] sm:w-[80vw] max-w-[600px] max-h-[60vh] sm:max-h-[70vh] flex flex-col p-6 sm:p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold">Teilnehmerliste</DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            {participantsCount || 0} {participantsCount === 1 ? "Person nimmt" : "Personen nehmen"} an diesem Event teil
            {participantLimit && ` (max. ${participantLimit})`}.
          </DialogDescription>
        </DialogHeader>
        <div 
          className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-0"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9'
          }}
        >
          {participantsList === undefined ? (
            <div className="text-center text-sm text-gray-500 py-8">
              Lade Teilnehmer...
            </div>
          ) : participantsList && participantsList.length > 0 ? (
            participantsList.map((participant) => (
              <div key={participant._id} className="flex items-center gap-4 py-2">
                {participant.username ? (
                  <Link
                    href={`/profile/${participant.username}`}
                    className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="w-10 h-10 rounded-full">
                      <AvatarImage src={participant.image} alt={participant.name} className="object-cover" />
                      <AvatarFallback
                        className="font-semibold rounded-full"
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.2)",
                          color: "#000000"
                        }}
                      >
                        {participant.name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">
                        {participant.name}
                      </div>
                      {participant.username && (
                        <div className="text-xs text-gray-500 truncate">
                          @{participant.username}
                        </div>
                      )}
                      {participant.uni_name && (
                        <div className="text-xs text-gray-500 truncate">
                          {participant.uni_name}
                          {participant.major && ` • ${participant.major}`}
                        </div>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="w-10 h-10 rounded-full">
                      <AvatarImage src={participant.image} alt={participant.name} className="object-cover" />
                      <AvatarFallback
                        className="font-semibold rounded-full"
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.2)",
                          color: "#000000"
                        }}
                      >
                        {participant.name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">
                        {participant.name}
                      </div>
                      {participant.uni_name && (
                        <div className="text-xs text-gray-500 truncate">
                          {participant.uni_name}
                          {participant.major && ` • ${participant.major}`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-sm text-gray-500 py-8">
              Noch keine Teilnehmer
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}




