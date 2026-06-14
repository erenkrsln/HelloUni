"use client";

import { Phone, Video } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { useCall } from "@/lib/hooks/useCall";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface ChatHeaderCallButtonsProps {
  conversationId: Id<"conversations">;
}

/**
 * Voice- und Video-Call-Buttons für den Chat-Header.
 * Werden neben dem bestehenden Dateien-Button angezeigt.
 */
export function ChatHeaderCallButtons({ conversationId }: ChatHeaderCallButtonsProps) {
  const { currentUser } = useCurrentUser();
  const { startCall, activeCallId, callPhase } = useCall();

  const isInCall = !!activeCallId && callPhase !== "idle" && callPhase !== "ended";

  const handleVoiceCall = async () => {
    if (!currentUser || isInCall) return;
    await startCall(conversationId, "voice");
  };

  const handleVideoCall = async () => {
    if (!currentUser || isInCall) return;
    await startCall(conversationId, "video");
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleVoiceCall}
        disabled={isInCall}
        aria-label="Sprachanruf starten"
        title="Sprachanruf"
        className="p-2 rounded-full transition-all duration-150
          text-[#D08945] hover:bg-[#D08945]/10
          disabled:opacity-40 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-[#D08945]/50
          active:scale-95"
      >
        <Phone size={20} />
      </button>

      <button
        onClick={handleVideoCall}
        disabled={isInCall}
        aria-label="Videoanruf starten"
        title="Videoanruf"
        className="p-2 rounded-full transition-all duration-150
          text-[#D08945] hover:bg-[#D08945]/10
          disabled:opacity-40 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-[#D08945]/50
          active:scale-95"
      >
        <Video size={20} />
      </button>
    </div>
  );
}
