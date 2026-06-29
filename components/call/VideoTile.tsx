"use client";

import { useEffect, useRef } from "react";
import { useStreamTrackRevision } from "@/lib/hooks/useStreamTrackRevision";
import { Mic, MicOff } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

interface VideoTileProps {
  stream: MediaStream | null;
  user: Doc<"users"> | null;
  isLocal?: boolean;
  mirrored?: boolean;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  screenSharing?: boolean;
  isActive?: boolean;
  className?: string;
  compact?: boolean;
  noRound?: boolean;
  objectFit?: "cover" | "contain";
}

export function VideoTile({
  stream,
  user,
  isLocal = false,
  mirrored,
  micEnabled = true,
  cameraEnabled = true,
  screenSharing = false,
  isActive = false,
  className = "",
  compact = false,
  noRound = false,
  objectFit = "cover",
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useStreamTrackRevision(screenSharing ? null : stream);

  const videoTrackId =
    stream
      ?.getVideoTracks()
      .find((t) => t.readyState !== "ended")
      ?.id ?? "";
  const trackSignature = stream
    ?.getTracks()
    .map((t) => `${t.id}:${t.readyState}:${t.enabled}`)
    .join("|");
  const attachKey = screenSharing ? videoTrackId : trackSignature;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;

    const attach = () => {
      if (screenSharing) {
        const videoTrack = stream
          .getVideoTracks()
          .find((t) => t.readyState !== "ended");
        if (!videoTrack) return;
        const current = el.srcObject as MediaStream | null;
        if (current?.getVideoTracks()[0]?.id === videoTrack.id) {
          void el.play().catch(() => {});
          return;
        }
        const audio = stream
          .getAudioTracks()
          .filter((t) => t.readyState !== "ended");
        el.srcObject = new MediaStream([videoTrack, ...audio]);
      } else if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      void el.play().catch(() => {});
    };

    attach();
    stream.addEventListener("addtrack", attach);
    stream.addEventListener("removetrack", attach);
    return () => {
      stream.removeEventListener("addtrack", attach);
      stream.removeEventListener("removetrack", attach);
    };
  }, [stream, attachKey, screenSharing]);

  const displayName = user?.name ?? (isLocal ? "Du" : "Teilnehmer");
  const initial = displayName.charAt(0).toUpperCase();
  const hasVideo =
    stream !== null &&
    (screenSharing ||
      (cameraEnabled &&
        stream
          .getVideoTracks()
          .some((t) => t.readyState !== "ended" && t.enabled)));
  // Mirror when local (own webcam) unless explicitly overridden
  const shouldMirror = mirrored !== undefined ? mirrored : isLocal;

  return (
    <div
      className={`relative overflow-hidden bg-[#1a1209] flex items-center justify-center
        ${noRound ? "" : "rounded-2xl"}
        ${isActive ? "ring-2 ring-[#D08945]" : ""}
        ${className}`}
    >
      {/* Video element */}
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={shouldMirror ? { transform: "scaleX(-1)" } : undefined}
          className={`w-full h-full
            ${objectFit === "contain" ? "object-contain" : "object-cover"}
            ${hasVideo ? "opacity-100" : "opacity-0 absolute inset-0"}`}
        />
      )}

      {/* Avatar fallback when no video */}
      {!hasVideo && (
        <div className="flex flex-col items-center justify-center gap-2">
          {user?.image ? (
            <img
              src={user.image}
              alt={displayName}
              className={`rounded-full object-cover ${compact ? "w-10 h-10" : "w-16 h-16"}`}
            />
          ) : (
            <div
              className={`rounded-full flex items-center justify-center font-bold text-white
                ${compact ? "w-10 h-10 text-base" : "w-16 h-16 text-2xl"}`}
              style={{ background: "linear-gradient(135deg, #D08945, #8C531E)" }}
            >
              {initial}
            </div>
          )}
          {!compact && (
            <span className="text-white text-sm font-medium opacity-90">
              {displayName}
            </span>
          )}
        </div>
      )}

      {/* Name + mic bar */}
      {!compact && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-1.5 sm:px-2 pb-1.5 sm:pb-2 pt-4 sm:pt-6
          bg-gradient-to-t from-black/60 to-transparent">
          <span className="text-white text-[10px] sm:text-xs font-medium truncate pr-1">
            {displayName}
            {isLocal && " (Du)"}
          </span>
          <div className="flex-shrink-0 ml-0.5 sm:ml-1">
            {micEnabled ? (
              <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/80" />
            ) : (
              <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
            )}
          </div>
        </div>
      )}

      {/* Active speaker glow */}
      {isActive && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: "inset 0 0 0 2px #D08945" }} />
      )}
    </div>
  );
}
