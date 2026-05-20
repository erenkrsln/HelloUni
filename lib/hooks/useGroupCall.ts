import { useMemo } from "react";
import { useCall } from "@/lib/hooks/useCall";
import type { CallPhase } from "@/components/call/CallProvider";

export type GroupCallType = "audio" | "video";

export interface GroupCallParticipantView {
  id: string;
  name: string;
  avatar?: string | null;
  isCameraOn: boolean;
  isMuted: boolean;
  stream: MediaStream | null;
}

/**
 * Abstrahiert den globalen Call-Kontext für Gruppen-UI und zukünftige Plug-in-Backends (WebRTC bleibt in CallProvider).
 */
export function useGroupCall() {
  const ctx = useCall();

  const callType: GroupCallType = ctx.activeCall?.type === "video" ? "video" : "audio";

  const isCallOpen =
    !!ctx.activeCallId &&
    ctx.callPhase !== "idle" &&
    ctx.callPhase !== "ended";

  const callStatus: CallPhase = ctx.callPhase;

  const participants: GroupCallParticipantView[] = useMemo(
    () =>
      ctx.participants
        .filter((p) => p.status === "joined")
        .map((p) => ({
          id: p.userId as string,
          name: p.user?.name ?? "Teilnehmer",
          avatar: p.user?.image ?? null,
          isCameraOn: p.cameraEnabled,
          isMuted: !p.micEnabled,
          stream:
            (p.userId as string) === (ctx.activeCall?.screenSharingUserId as string | undefined)
              ? null
              : ctx.remoteStreams.get(p.userId as string) ?? null,
        })),
    [ctx.participants, ctx.remoteStreams, ctx.activeCall?.screenSharingUserId],
  );

  return {
    isCallOpen,
    callType,
    isMuted: !ctx.micEnabled,
    isCameraOn: ctx.cameraEnabled,
    localStream: ctx.localStream,
    participants,
    callStatus,
    activeCall: ctx.activeCall,
    mediaError: ctx.mediaError,
    startCall: ctx.startCall,
    leaveCall: ctx.leaveCall,
    toggleMic: ctx.toggleMic,
    toggleCamera: ctx.toggleCamera,
    startScreenShare: ctx.startScreenShare,
    stopScreenShare: ctx.stopScreenShare,
  };
}
