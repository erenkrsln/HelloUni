"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { PhoneOff, Phone, Video } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { VideoCall } from "@/components/video-call";
import { isDesktop } from "@/lib/call-window";

export function IncomingCallListener() {
  const { currentUser } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();

  // Mobile-Fallback: Vollbild-VideoCall in der App
  const [mobileCallId, setMobileCallId] = useState<Id<"callSessions"> | null>(null);
  const [mobileCallType, setMobileCallType] = useState<"voice" | "video">("voice");

  const joinCall = useMutation(api.calls.joinCall);
  const declineCall = useMutation(api.calls.declineCall);

  const incomingCalls = useQuery(
    api.calls.getIncomingCalls,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  const mobileCallSession = useQuery(
    api.calls.getCallSession,
    mobileCallId ? { callId: mobileCallId } : "skip"
  );
  const mobileCallMembers = useQuery(
    api.queries.getConversationMembers,
    mobileCallSession ? { conversationId: mobileCallSession.conversationId } : "skip"
  );

  // Nicht im Call-Fenster selbst anzeigen (verhindert endlose Popup-Schleifen)
  if (pathname?.startsWith("/call/")) return null;
  if (!currentUser) return null;

  const incoming = incomingCalls?.[0];
  const callerName = incoming?.initiatorName ?? "Unbekannt";

  const handleAccept = async () => {
    if (!incoming || !currentUser) return;
    // Desktop-Tab direkt im Click-Event öffnen, damit Browser ihn nicht blockt
    const desktopTab = isDesktop() ? window.open("about:blank", "_blank") : null;
    await joinCall({ callId: incoming._id, userId: currentUser._id });
    if (isDesktop()) {
      if (desktopTab) {
        desktopTab.location.href = `/call/${incoming._id}?type=${incoming.type}`;
      } else {
        // Fallback falls Popup-Blocker trotzdem greift
        router.push(`/call/${incoming._id}?type=${incoming.type}`);
      }
      return;
    }

    setMobileCallType(incoming.type as "voice" | "video");
    setMobileCallId(incoming._id);
    router.push(`/chat/${incoming.conversationId}`);
  };

  const handleDecline = async () => {
    if (!incoming || !currentUser) return;
    await declineCall({ callId: incoming._id, userId: currentUser._id });
  };

  return (
    <>
      {/* Mobile: Vollbild-VideoCall nach Annehmen */}
      {mobileCallId && currentUser && mobileCallMembers && (
        <VideoCall
          callId={mobileCallId}
          currentUserId={currentUser._id}
          callType={mobileCallType}
          onEnd={() => setMobileCallId(null)}
          participants={mobileCallMembers.map((m) => ({
            _id: m._id,
            name: m.name,
            image: m.image,
          }))}
        />
      )}

    <AnimatePresence>
      {incoming && !mobileCallId && (
        <motion.div
          key={incoming._id}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="fixed inset-0 z-[300] flex items-center justify-center"
        >
          <div className="w-80 bg-zinc-900 rounded-2xl shadow-2xl border border-white/8 overflow-hidden">
            {/* Klingel-Indikator */}
            <motion.div
              className="h-1 bg-emerald-500"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />

            <div className="p-5">
              <div className="flex flex-col items-center gap-4">
                {/* Avatar mit pulsierendem Ring */}
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-emerald-500/20"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    style={{ borderRadius: "9999px" }}
                  />
                  <div className="relative w-20 h-20 rounded-full bg-zinc-800 ring-4 ring-emerald-500/30 flex items-center justify-center overflow-hidden">
                    <span className="text-3xl font-bold text-white/60">
                      {callerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Name + Anruftyp */}
                <div className="text-center">
                  <p className="text-white font-semibold text-base">{callerName}</p>
                  <p className="text-zinc-400 text-sm mt-0.5 flex items-center justify-center gap-1.5">
                    {incoming.type === "video"
                      ? <><Video size={13} className="text-zinc-400" /> Eingehender Videoanruf</>
                      : <><Phone size={13} className="text-zinc-400" /> Eingehender Sprachanruf</>
                    }
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-10 mt-1">
                  <div className="flex flex-col items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={handleDecline}
                      className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/25"
                    >
                      <PhoneOff size={22} className="text-white" />
                    </motion.button>
                    <span className="text-zinc-500 text-xs">Ablehnen</span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={handleAccept}
                      className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"
                    >
                      {incoming.type === "video"
                        ? <Video size={22} className="text-white" />
                        : <Phone size={22} className="text-white" />
                      }
                    </motion.button>
                    <span className="text-zinc-500 text-xs">Annehmen</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
