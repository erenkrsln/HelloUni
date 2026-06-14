"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCall } from "@/lib/hooks/useCall";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Phone, Video, Users } from "lucide-react";

interface ActiveCallBannerProps {
  conversationId: Id<"conversations">;
}

/**
 * Zeigt einen Banner an, wenn ein aktiver Gruppenanruf läuft.
 * Nur sichtbar wenn der User noch nicht im Call ist.
 */
export function ActiveCallBanner({ conversationId }: ActiveCallBannerProps) {
  const { currentUser } = useCurrentUser();
  const { activeCallId, startCall } = useCall();

  const activeCall = useQuery(api.calls.getActiveCallForConversation, {
    conversationId,
  });

  // Kein aktiver Call
  if (!activeCall || activeCall.status === "ended") return null;

  // User ist bereits im Call (eigener CallOverlay kümmert sich)
  if (activeCallId === activeCall._id) return null;

  const isVideo = activeCall.type === "video";

  const handleJoin = async () => {
    if (!currentUser) return;
    // Wir starten den Call mit der gleichen conversationId – der bestehende Call wird zurückgegeben
    await startCall(conversationId, activeCall.type);
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 mx-3 mb-2 rounded-2xl"
      style={{ background: "linear-gradient(135deg, rgba(208,137,69,0.15), rgba(140,83,30,0.10))" ,
               border: "1px solid rgba(208,137,69,0.25)" }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #D08945, #8C531E)" }}
      >
        {isVideo
          ? <Video size={16} className="text-white" />
          : <Phone size={16} className="text-white" />
        }
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[#261708] text-sm font-semibold leading-tight">
          {isVideo ? "Aktiver Gruppen-Videoanruf" : "Aktiver Gruppenanruf"}
        </p>
        <p className="text-[#8C531E] text-xs">Klicke zum Beitreten</p>
      </div>

      {/* Join-Button */}
      <button
        onClick={handleJoin}
        aria-label="Gruppenanruf beitreten"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold
          transition-all duration-150 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:ring-offset-1"
        style={{ background: "linear-gradient(135deg, #D08945, #8C531E)" }}
      >
        <Users size={13} />
        Beitreten
      </button>
    </div>
  );
}
