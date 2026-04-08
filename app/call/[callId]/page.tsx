"use client";

import { Suspense, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { VideoCall } from "@/components/video-call";
import { motion } from "framer-motion";
import { Phone, Video } from "lucide-react";

function CallWindowContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const callId = params.callId as Id<"callSessions">;
  const callType = (searchParams.get("type") ?? "voice") as "voice" | "video";

  const { currentUser } = useCurrentUser();

  const callSession = useQuery(
    api.calls.getCallSession,
    callId ? { callId } : "skip"
  );

  const callMembers = useQuery(
    api.queries.getConversationMembers,
    callSession ? { conversationId: callSession.conversationId } : "skip"
  );

  const joinCall = useMutation(api.calls.joinCall);
  const leaveCall = useMutation(api.calls.leaveCall);

  // Sicherstellen dass der Nutzer als Teilnehmer eingetragen ist
  useEffect(() => {
    if (!currentUser || !callSession) return;
    if (!callSession.activeParticipants.includes(currentUser._id)) {
      joinCall({ callId, userId: currentUser._id }).catch(() => {});
    }
  }, [callSession, currentUser, callId, joinCall]);

  // Fenstertitel
  useEffect(() => {
    document.title = callType === "video" ? "Videoanruf – HelloUni" : "Sprachanruf – HelloUni";
  }, [callType]);

  // Beim Schließen des Tabs leaveCall aufrufen, damit der Avatar sofort verschwindet
  useEffect(() => {
    if (!currentUser) return;
    const handleUnload = () => {
      leaveCall({ callId, userId: currentUser._id });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [currentUser, callId, leaveCall]);

  if (!currentUser || !callSession || !callMembers) {
    return <CallLoadingScreen callType={callType} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full h-full"
    >
      <VideoCall
        callId={callId}
        currentUserId={currentUser._id}
        callType={callType}
        mode="fullscreen"
        onEnd={() => window.close()}
        participants={callMembers.map((m) => ({
          _id: m._id,
          name: m.name,
          image: m.image,
        }))}
      />
    </motion.div>
  );
}

function CallLoadingScreen({ callType }: { callType: "voice" | "video" }) {
  return (
    <div className="w-screen h-screen bg-zinc-950 flex flex-col items-center justify-center gap-5">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
      >
        {callType === "video"
          ? <Video size={28} className="text-emerald-400" />
          : <Phone size={28} className="text-emerald-400" />
        }
      </motion.div>
      <p className="text-white/40 text-sm">Verbinde...</p>
    </div>
  );
}

export default function CallWindowPage() {
  return (
    <Suspense fallback={<CallLoadingScreen callType="voice" />}>
      <CallWindowContent />
    </Suspense>
  );
}
