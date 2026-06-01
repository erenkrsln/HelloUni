"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { useCall } from "@/lib/hooks/useCall";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  hasActiveVideoTrack,
  useStreamTrackRevision,
} from "@/lib/hooks/useStreamTrackRevision";
import { CallControls } from "./CallControls";
import { VideoTile } from "./VideoTile";
import { ParticipantGrid } from "./ParticipantGrid";
import { AlertCircle, ChevronLeft, ChevronRight, Maximize2, Minimize2, MicOff, Settings, SwitchCamera, Users, X } from "lucide-react";
import type { ParticipantWithUser } from "./CallProvider";
import type { Doc } from "@/convex/_generated/dataModel";
import { getStreamForScreenShare, isScreenShareTrack } from "@/lib/webrtc/callMedia";

// ─── Remote Audio ─────────────────────────────────────────────────────────────
function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
}

// ─── Laufzeit-Hook ────────────────────────────────────────────────────────────
function useDuration(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) { setSeconds(0); return; }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ─── Phase-Labels ─────────────────────────────────────────────────────────────
const PHASE_LABELS: Record<string, string> = {
  outgoing:     "Anruf …",
  incoming:     "Eingehender Anruf",
  connecting:   "Verbindet …",
  connected:    "Verbunden",
  reconnecting: "Verbindung wiederherstellen …",
  ended:        "Anruf beendet",
  rejected:     "Anruf abgelehnt",
  failed:       "Verbindung fehlgeschlagen",
};

// ─── Avatar (groß, für Voice/Ende-Screen) ─────────────────────────────────────
function BigAvatar({
  user,
  imageUrl,
  name: nameOverride,
  size = "md",
}: {
  user?: Doc<"users"> | null;
  imageUrl?: string | null;
  name?: string;
  size?: "md" | "lg";
}) {
  const name = nameOverride ?? user?.name ?? "?";
  const image = imageUrl ?? user?.image;
  const sizeClass = size === "lg" ? "w-32 h-32 md:w-40 md:h-40" : "w-24 h-24 md:w-32 md:h-32";
  const textClass = size === "lg" ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl";
  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 ring-4 ring-white/10 ${sizeClass}`}
      style={{ background: "linear-gradient(135deg, #D08945 0%, #8C531E 100%)" }}
    >
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center font-bold text-white ${textClass}`}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

// ─── Kleiner Avatar-Kreis (Top-Bar) ───────────────────────────────────────────
function SmallAvatar({ user }: { user: Doc<"users"> | null }) {
  const name = user?.name ?? "?";
  return (
    <div
      className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
      style={{ background: "linear-gradient(135deg, #D08945, #8C531E)" }}
    >
      {user?.image ? (
        <img src={user.image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// ─── Haupt-Remote-Video (Fullscreen, object-contain) ─────────────────────────
function RemoteVideoMain({
  stream, user, statusLabel, isConnected, duration, participantCount, videoEnabled = true,
}: {
  stream: MediaStream | null;
  user: Doc<"users"> | null;
  statusLabel: string;
  isConnected: boolean;
  duration: string;
  participantCount: number;
  videoEnabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayStream = useMemo(
    () => getStreamForScreenShare(stream) ?? stream,
    [
      stream,
      stream
        ?.getVideoTracks()
        .map((t) => `${t.id}:${t.readyState}`)
        .join("|"),
    ],
  );
  const videoTrackId =
    displayStream
      ?.getVideoTracks()
      .find((t) => t.readyState !== "ended")
      ?.id ?? "";

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !displayStream) return;

    const videoTrack = displayStream
      .getVideoTracks()
      .find((t) => t.readyState !== "ended");
    if (!videoTrack) return;

    const current = el.srcObject as MediaStream | null;
    if (current?.getVideoTracks()[0]?.id === videoTrack.id) {
      void el.play().catch(() => {});
      return;
    }

    el.srcObject = displayStream;
    void el.play().catch(() => {});
  }, [displayStream, videoTrackId]);

  const hasScreenVideo =
    !!displayStream &&
    displayStream
      .getVideoTracks()
      .some((t) => isScreenShareTrack(t) && t.readyState !== "ended");
  const hasVideo =
    hasActiveVideoTrack(displayStream, videoEnabled) || hasScreenVideo;

  return (
    <div className="absolute inset-0 bg-[#0e0906] flex items-center justify-center">
      {/* Video mit schwarzen Rändern wenn Seitenverhältnis nicht passt */}
      {displayStream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          className={`${hasVideo ? "opacity-100" : "opacity-0 absolute inset-0"}`}
        />
      )}
      {/* Kein Video → Avatar zentriert */}
      {!hasVideo && (
        <div className="flex flex-col items-center justify-center gap-5 px-8 select-none z-10">
          <BigAvatar user={user} size="lg" />
          <div className="text-center space-y-1.5">
            <p className="text-white text-2xl md:text-3xl font-semibold leading-tight">
              {user?.name ?? "…"}
            </p>
            <p className="text-white/55 text-sm font-mono tracking-wider">
              {isConnected ? duration : statusLabel}
            </p>
            {isConnected && (
              <p className="text-white/35 text-xs">
                {participantCount} Person{participantCount !== 1 ? "en" : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Eigenes PiP-Video (gespiegelt) ──────────────────────────────────────────
function LocalVideoPiP({
  stream, user, micEnabled, cameraEnabled, mirrored = true, objectFit = "cover",
  /** Mobil: Kamera aus → nur Profilbild im quadratischen PiP */
  pipProfileFill = false,
}: {
  stream: MediaStream | null;
  user: Doc<"users"> | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  mirrored?: boolean;
  objectFit?: "cover" | "contain";
  pipProfileFill?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  /** Nur Video-Tracks — sonst flackert PiP bei Mic mute/unmute (Audio `enabled` ändert sich). */
  const videoTrackSignature = stream
    ?.getVideoTracks()
    .map((t) => `${t.id}:${t.readyState}:${t.enabled}`)
    .join("|");

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const attach = () => {
      if (el.srcObject === stream) return;
      el.srcObject = stream ?? null;
      void el.play().catch(() => {});
    };

    attach();
    if (!stream) return;
    const onTrackChange = () => attach();
    stream.addEventListener("addtrack", onTrackChange);
    stream.addEventListener("removetrack", onTrackChange);
    return () => {
      stream.removeEventListener("addtrack", onTrackChange);
      stream.removeEventListener("removetrack", onTrackChange);
    };
  }, [stream, videoTrackSignature]);

  const name = user?.name ?? "Du";
  const hasVideo =
    !!stream &&
    cameraEnabled &&
    stream.getVideoTracks().some((t) => t.readyState !== "ended" && t.enabled);

  return (
    <div className="w-full h-full bg-[#1a1209] relative overflow-hidden">
      {stream && (
        <video
          ref={videoRef}
          autoPlay playsInline muted
          style={{ transform: mirrored ? "scaleX(-1)" : "none", width: "100%", height: "100%", objectFit }}
          className={`${hasVideo ? "opacity-100" : "opacity-0 absolute inset-0"} transition-opacity duration-300`}
        />
      )}
      {!hasVideo && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-[#1a1209] ${
            pipProfileFill ? "" : "flex-col gap-2"
          }`}
        >
          {user?.image ? (
            <img
              src={user.image}
              alt={name}
              className={
                pipProfileFill
                  ? "h-full w-full object-cover rounded-xl"
                  : "w-12 h-12 md:w-16 md:h-16 rounded-full object-cover"
              }
            />
          ) : (
            <div
              className={
                pipProfileFill
                  ? "flex aspect-square w-[76%] shrink-0 items-center justify-center rounded-xl text-white font-bold text-3xl"
                  : "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl"
              }
              style={{ background: "linear-gradient(135deg, #D08945, #8C531E)" }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          {!pipProfileFill && (
            <span className="text-white/60 text-xs hidden md:block">{name}</span>
          )}
        </div>
      )}
      {!micEnabled && (
        <div className="absolute bottom-2 right-2 bg-black/60 rounded-full p-1">
          <MicOff size={11} className="text-red-400" />
        </div>
      )}
    </div>
  );
}

/** Mobil: Selfie/Rückkamera — unten links im PiP */
function PipSwitchCameraOverlay({
  show,
  facingMode,
  onSwitch,
}: {
  show: boolean;
  facingMode: "user" | "environment";
  onSwitch: () => void | Promise<void>;
}) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void onSwitch();
      }}
      aria-label={facingMode === "user" ? "Rückkamera" : "Frontkamera"}
      title="Kamera drehen"
      className="pointer-events-auto absolute bottom-1 left-1 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/40 bg-black/55 text-white shadow-sm backdrop-blur-sm outline-none focus-visible:ring-1 focus-visible:ring-white/45 active:scale-90"
    >
      <SwitchCamera className="h-3 w-3" strokeWidth={2.25} />
    </button>
  );
}

// ─── Voice-Call 1:1 ───────────────────────────────────────────────────────────
function VoiceCallView({
  remoteParticipant, statusLabel, duration, isConnected,
}: {
  remoteParticipant: ParticipantWithUser | null | undefined;
  statusLabel: string; duration: string; isConnected: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 select-none relative z-[2]">
      <BigAvatar user={remoteParticipant?.user ?? null} size="lg" />
      <div className="text-center space-y-1">
        <p className="text-white text-2xl md:text-3xl font-semibold leading-tight">
          {remoteParticipant?.user?.name ?? "…"}
        </p>
        <p className="text-white/45 text-sm font-mono tracking-widest">
          {isConnected ? duration : statusLabel}
        </p>
      </div>
    </div>
  );
}

// ─── Voice-Call Gruppe (wie 1:1, mehrere Avatare) ─────────────────────────────
function VoiceGroupCallView({
  participants,
  currentUserId,
  statusLabel,
  duration,
  isConnected,
}: {
  participants: ParticipantWithUser[];
  currentUserId: string | undefined;
  statusLabel: string;
  duration: string;
  isConnected: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 min-h-0 overflow-y-auto select-none relative z-[2]">
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-8 max-w-xl">
        {participants.map((p) => {
          const isSelf = currentUserId !== undefined && (p.userId as string) === currentUserId;
          return (
            <div
              key={p._id}
              className="flex flex-col items-center gap-2 flex-shrink-0 min-w-[6.5rem] md:min-w-[9rem] px-1"
            >
              <BigAvatar user={p.user ?? null} size="md" />
              <span className="text-white/85 text-xs font-medium truncate max-w-full text-center">
                {isSelf ? "Du" : (p.user?.name ?? "?")}
              </span>
            </div>
          );
        })}
      </div>
      <div className="text-center">
        <p className="text-white/45 text-sm font-mono tracking-widest">
          {isConnected ? duration : statusLabel}
        </p>
      </div>
    </div>
  );
}


// ─── Icon-Button (Top-Bar) ────────────────────────────────────────────────────
function TopIconButton({
  onClick, label, children,
}: {
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-full flex items-center justify-center
        bg-black/35 hover:bg-black/55 text-white
        backdrop-blur-sm transition-all duration-150
        outline-none focus:outline-none active:scale-90"
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HAUPT-OVERLAY
// ═══════════════════════════════════════════════════════════════════════════════
export function CallOverlay() {
  const { currentUser } = useCurrentUser();
  const {
    activeCall, callPhase,
    localStream, screenShareStream, remoteStreams, participants,
    micEnabled, cameraEnabled, screenSharingActive, mediaError,
    leaveCall, toggleMic, toggleCamera, switchCameraFacing, cameraFacingMode,
    startScreenShare, stopScreenShare,
  } = useCall();

  const [showParticipants, setShowParticipants] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pipCollapsed, setPipCollapsed] = useState(false);
  /** Hochformat-PiP & Kamera-Constraints passen zu max. 639px (Tailwind sm). */
  const [narrowViewport, setNarrowViewport] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const groupDisplaySnapshot = useRef<{
    displayName: string;
    displayImage?: string;
  } | null>(null);

  const groupConversationDisplay = useQuery(
    api.queries.getConversationDisplay,
    activeCall?.conversationId && activeCall.scope === "group"
      ? { conversationId: activeCall.conversationId }
      : "skip",
  );

  useEffect(() => {
    if (groupConversationDisplay) {
      groupDisplaySnapshot.current = groupConversationDisplay;
    }
  }, [groupConversationDisplay]);

  const groupDisplay =
    groupConversationDisplay ?? groupDisplaySnapshot.current;
  const groupTitle = groupDisplay?.displayName ?? "Gruppenanruf";

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setNarrowViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await overlayRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const fn = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  useEffect(() => {
    if (!showParticipants || !activeCall || callPhase === "idle") return;
    const isGroupSidebar =
      activeCall.scope === "group" &&
      callPhase !== "ended" &&
      callPhase !== "rejected" &&
      callPhase !== "failed";
    if (!isGroupSidebar) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowParticipants(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showParticipants, activeCall, callPhase]);

  /** Mobil: PiP nicht ein-/ausklappen (keine ><-Leiste), Zustand zurücksetzen */
  useEffect(() => {
    if (narrowViewport) setPipCollapsed(false);
  }, [narrowViewport]);

  const isConnected = callPhase === "connected";
  const duration = useDuration(isConnected);

  const joinedParticipants = participants.filter((p) => p.status === "joined");
  const isGroupEarly = activeCall?.scope === "group";
  const remoteParticipantEarly = !isGroupEarly
    ? joinedParticipants.find(
        (p) => (p.userId as string) !== (currentUser?._id as string),
      )
    : null;
  const remoteStreamEarly = remoteParticipantEarly
    ? (remoteStreams.get(remoteParticipantEarly.userId as string) ?? null)
    : null;
  useStreamTrackRevision(remoteStreamEarly);

  if (!activeCall || callPhase === "idle") return null;

  const isEnding   = callPhase === "ended" || callPhase === "rejected" || callPhase === "failed";
  const isVoiceOnly = activeCall.type === "voice";
  const isGroup     = activeCall.scope === "group";

  // Remote-Teilnehmer (für 1:1)
  const remoteParticipant = !isGroup
    ? participants.find((p) => (p.userId as string) !== (currentUser?._id as string))
    : null;

  const statusLabel = PHASE_LABELS[callPhase] ?? callPhase;

  const remoteStream = remoteParticipant
    ? (remoteStreams.get(remoteParticipant.userId as string) ?? null)
    : null;

  const remoteCameraEnabled = remoteParticipant?.cameraEnabled ?? false;
  const remoteHasCamera = hasActiveVideoTrack(remoteStream, remoteCameraEnabled);

  const screenSharingUserId = activeCall.screenSharingUserId as string | undefined;
  const localSharing = screenSharingActive;
  /** Lokal teilen, bevor Convex screenSharingUserId gesetzt hat */
  const effectiveScreenSharingUserId =
    screenSharingUserId ??
    (localSharing && currentUser ? (currentUser._id as string) : undefined);
  const remoteSharing =
    !!effectiveScreenSharingUserId &&
    (effectiveScreenSharingUserId as string) !== (currentUser?._id as string);
  const groupScreenShareActive =
    isGroup && !isEnding && !!effectiveScreenSharingUserId;
  /** Gruppe: Zuschauer — wie 1:1-Sprachanruf (Vollbild RemoteVideoMain) */
  const groupScreenShareViewerMode = groupScreenShareActive && remoteSharing;
  const groupSharerParticipant = effectiveScreenSharingUserId
    ? joinedParticipants.find(
        (p) => (p.userId as string) === effectiveScreenSharingUserId,
      )
    : undefined;

  const rawGroupSharerStream = effectiveScreenSharingUserId
    ? localSharing
      ? screenShareStream
      : (remoteStreams.get(effectiveScreenSharingUserId as string) ?? null)
    : null;
  const groupSharerStream = getStreamForScreenShare(rawGroupSharerStream);
  const groupSharerName = groupSharerParticipant?.user?.name ?? "Teilnehmer";
  const groupSharerUser = groupSharerParticipant?.user ?? null;

  // Instagram-Video-Chrome: 1:1 und Gruppe – auch bei Sprachanruf (kein Video → Avatar-Fallback)
  const isPrivateInstagramVideo = !isGroup && !isEnding;

  const isGroupInstagramVideo = isGroup && !isEnding;
  /** Gruppen-Galerie (Teams-Raster): eigenes Bild ist eine Kachel → kein schwebendes PiP. */
  const isGroupGallery = isGroupInstagramVideo && !groupScreenShareActive;

  const showInstagramVideoChrome =
    isPrivateInstagramVideo ||
    (isGroupInstagramVideo && !groupScreenShareActive) ||
    groupScreenShareViewerMode;

  // Wie viele Personen inkl. eigener
  const totalParticipants = joinedParticipants.length || 2;

  // Haupt-Video (nur 1:1): IMMER der Remote-Stream
  const mainStream = remoteStream;
  const mainUser   = remoteParticipant?.user ?? null;

  // PiP (1:1 + Gruppe gleich):
  const pipStream     = localSharing ? screenShareStream : localStream;
  const pipUser       = currentUser ?? null;
  const pipMic        = micEnabled;
  const pipCamera     = localSharing ? true : cameraEnabled;
  const pipMirrored   = !localSharing && cameraFacingMode === "user";
  const pipObjectFit  = localSharing ? "contain" as const : "cover" as const;
  /** PiP unten rechts: bei fremder Bildschirmübertragung nur mit eigener Kamera.
   *  In der Gruppen-Galerie nie (eigenes Bild ist dort eine Raster-Kachel). */
  const showLocalPreviewPip = isGroupGallery
    ? false
    : remoteSharing
      ? cameraEnabled && Boolean(localStream)
      : localSharing ||
        (Boolean(pipStream) && (cameraEnabled || !narrowViewport)) ||
        (narrowViewport &&
          !localSharing &&
          !cameraEnabled &&
          !!currentUser &&
          showInstagramVideoChrome);
  const pipAllowCollapse = !narrowViewport;
  /** Mobil: Kamera aus → quadratisches PiP nur mit Profilbild */
  const mobilePipSquareProfile =
    narrowViewport && !localSharing && !cameraEnabled && showInstagramVideoChrome;

  return (
    <>
      {/* Hintergrund-Verdunkelung */}
      <div className="fixed inset-0 z-[9998] bg-black/60" />

      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label="Anruf"
        className="fixed z-[9999] inset-0 overflow-hidden bg-[#0e0906]"
      >
        {/* Remote-Audio (unsichtbar für alle Streams) */}
        {Array.from(remoteStreams.entries()).map(([uid, s]) => (
          <RemoteAudio key={uid} stream={s} />
        ))}

        {/* ══════════════════════════════════════════════════════════════════
            INSTAGRAM VIDEO-CHROME (1:1 oder Gruppen-Video)
        ══════════════════════════════════════════════════════════════════ */}
        {showInstagramVideoChrome && (
          <div className="absolute inset-0 bg-[#0e0906]">

            {/* ── Hauptfläche: 1:1 Remote-Video oder Gruppen-Raster ───────── */}
            {isPrivateInstagramVideo || groupScreenShareViewerMode ? (
              <RemoteVideoMain
                stream={groupScreenShareViewerMode ? groupSharerStream : mainStream}
                user={groupScreenShareViewerMode ? groupSharerUser : mainUser}
                statusLabel={statusLabel}
                isConnected={isConnected}
                duration={duration}
                participantCount={totalParticipants}
                videoEnabled={
                  remoteSharing || groupScreenShareViewerMode
                    ? true
                    : (remoteParticipant?.cameraEnabled ?? true)
                }
              />
            ) : (
              currentUser && (
                <div
                  className="absolute inset-0 z-0 box-border flex flex-col min-h-0
                    pt-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(5.25rem+env(safe-area-inset-top,0px))]
                    pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(8rem+env(safe-area-inset-bottom,0px))]
                    px-2 sm:px-3 md:px-5"
                >
                  <ParticipantGrid
                    localStream={localStream}
                    screenShareStream={screenShareStream}
                    remoteStreams={remoteStreams}
                    participants={joinedParticipants}
                    currentUser={currentUser}
                    localMicEnabled={micEnabled}
                    localCameraEnabled={cameraEnabled}
                    localScreenSharing={screenSharingActive}
                    localMirrored={cameraFacingMode === "user"}
                    screenSharingUserId={screenSharingUserId}
                    embedMode
                  />
                </div>
              )
            )}

            {/* ── Gradient oben */}
            <div
              className="absolute inset-x-0 top-0 h-44 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)" }}
            />

            {/* ── Gradient unten */}
            <div
              className="absolute inset-x-0 bottom-0 h-56 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)" }}
            />

            {/* ── TOP-BAR (über Raster; nur Icon + rechte Icons fangen Klicks) ─ */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-[30] flex items-start justify-between px-4 md:px-6"
              style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }}
            >
              <div className="pointer-events-auto flex min-w-0 items-center gap-3">
                {isGroupInstagramVideo && !groupScreenShareViewerMode ? (
                  <>
                    <button
                      type="button"
                      aria-expanded={showParticipants}
                      aria-controls="call-participants-sidebar"
                      aria-label="Teilnehmerliste öffnen"
                      title="Wer ist im Anruf"
                      onClick={() => setShowParticipants((v) => !v)}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/40 active:scale-95"
                    >
                      <Users size={18} aria-hidden />
                    </button>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm md:text-base leading-tight drop-shadow truncate">
                        {groupTitle}
                      </p>
                      {isConnected && (
                        <p className="text-white/65 text-xs drop-shadow">
                          {`${totalParticipants} Person${totalParticipants !== 1 ? "en" : ""}`}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <SmallAvatar
                      user={
                        groupScreenShareViewerMode
                          ? groupSharerUser
                          : (remoteParticipant?.user ?? null)
                      }
                    />
                    <div>
                      <p className="text-white font-semibold text-sm md:text-base leading-tight drop-shadow">
                        {groupScreenShareViewerMode
                          ? groupSharerName
                          : (remoteParticipant?.user?.name ?? "…")}
                      </p>
                      {isConnected && (
                        <p className="text-white/65 text-xs drop-shadow">
                          {`${totalParticipants} Person${totalParticipants !== 1 ? "en" : ""}`}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="pointer-events-auto flex flex-shrink-0 items-center gap-2">
                <TopIconButton label="Einstellungen">
                  <Settings size={15} />
                </TopIconButton>
                <TopIconButton
                  onClick={toggleFullscreen}
                  label={isFullscreen ? "Vollbild beenden" : "Vollbild"}
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </TopIconButton>
              </div>
            </div>

            {/* ── Fehler-Banner */}
            {mediaError && (
              <div className="absolute left-4 right-4 top-24 flex items-center gap-2 bg-amber-900/85 rounded-xl px-3 py-2">
                <AlertCircle size={16} className="text-amber-300 flex-shrink-0" />
                <span className="text-amber-200 text-xs">{mediaError}</span>
              </div>
            )}

            {/* ── PiP: Desktop unten rechts · Mobil oben rechts ───────────── */}
            {showLocalPreviewPip && (
              <>
                {/* Eingeklappt: Pill exakt so hoch wie die PiP-Kachel → selbe vertikale Mitte */}
                {pipCollapsed && pipAllowCollapse && (
                  <button
                    onClick={() => setPipCollapsed(false)}
                    aria-label="Vorschau einblenden"
                    className="absolute z-[50] pointer-events-auto flex items-center justify-center
                      rounded-l-2xl text-white outline-none
                      transition-colors duration-150"
                    style={{
                      right: 0,
                      ...(narrowViewport
                        ? {
                            top: "calc(0.375rem + env(safe-area-inset-top, 0px))",
                          }
                        : {
                            bottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
                          }),
                      width: "1.75rem",
                      height: narrowViewport
                        ? "clamp(180px, min(56vw, 300px), 320px)"
                        : isGroupInstagramVideo
                          ? "clamp(56px, min(28vw, 132px), 148px)"
                          : "clamp(62px, 11.25vw, 158px)",
                      background: "rgba(30,30,30, 0.85)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}

                {/* Ausgeklappt: PiP mit transparentem > Tab auf der linken Kante (Mobil: oben rechts) */}
                <div
                  className={`absolute overflow-hidden ${narrowViewport ? "z-[45]" : "z-[35]"}${pipCollapsed ? " pointer-events-none" : ""}`}
                  style={
                    narrowViewport
                      ? {
                          top: "calc(0.375rem + env(safe-area-inset-top, 0px))",
                          right: 0,
                        }
                      : {
                          bottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
                          right: 0,
                        }
                  }
                >
                  <div
                    className={`relative flex flex-row gap-2 transition-transform duration-300 ease-in-out ${
                      narrowViewport ? "items-start" : "items-end"
                    }`}
                    style={{
                      paddingRight: isGroupInstagramVideo
                        ? "clamp(0.375rem, 1.5vw, 1.25rem)"
                        : "clamp(0.5rem, 2vw, 2rem)",
                      transform: pipAllowCollapse && pipCollapsed ? "translateX(100%)" : "translateX(0)",
                    }}
                  >
                    {pipAllowCollapse && (
                    <button
                      onClick={() => setPipCollapsed(true)}
                      aria-label="Vorschau ausblenden"
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10
                        flex items-center justify-center
                        text-white drop-shadow outline-none"
                      style={{
                        width: "1.75rem",
                        height: narrowViewport
                          ? "clamp(180px, min(56vw, 300px), 320px)"
                          : isGroupInstagramVideo
                            ? "clamp(56px, min(28vw, 132px), 148px)"
                            : "clamp(62px, 11.25vw, 158px)",
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                    )}

                    {/* Kamera-PiP (nur wenn lokal teilt + Kamera an) */}
                    {localSharing && cameraEnabled && localStream && (
                      <div
                        className={`relative rounded-2xl overflow-hidden shadow-2xl border border-white/15 flex-shrink-0 ${
                          pipAllowCollapse ? "cursor-pointer" : ""
                        } ${
                          narrowViewport
                            ? "aspect-[9/16] w-[min(30vw,108px)]"
                            : `aspect-video ${
                                isGroupInstagramVideo
                                  ? "w-[min(42vw,156px)] sm:w-[clamp(110px,16vw,200px)]"
                                  : "w-[clamp(96px,34vw,200px)] sm:w-[clamp(110px,16vw,200px)]"
                              }`
                        }`}
                        onClick={pipAllowCollapse ? () => setPipCollapsed(true) : undefined}
                      >
                        <LocalVideoPiP
                          stream={localStream}
                          user={currentUser ?? null}
                          micEnabled={micEnabled}
                          cameraEnabled={cameraEnabled}
                          mirrored={cameraFacingMode === "user"}
                          objectFit="cover"
                        />
                        <PipSwitchCameraOverlay
                          show={narrowViewport && cameraEnabled && localSharing}
                          facingMode={cameraFacingMode}
                          onSwitch={switchCameraFacing}
                        />
                      </div>
                    )}

                    {/* Haupt-PiP */}
                    <div
                      className={`relative rounded-2xl overflow-hidden shadow-2xl border border-white/15 flex-shrink-0 ${
                        pipAllowCollapse ? "cursor-pointer" : ""
                      } ${
                        narrowViewport
                          ? mobilePipSquareProfile
                            ? "aspect-square w-[min(30vw,108px)]"
                            : "aspect-[9/16] w-[min(34vw,120px)]"
                          : `aspect-video ${
                              localSharing && cameraEnabled
                                ? isGroupInstagramVideo
                                  ? "w-[min(42vw,156px)] sm:w-[clamp(110px,16vw,200px)]"
                                  : "w-[clamp(96px,34vw,200px)] sm:w-[clamp(110px,16vw,200px)]"
                                : isGroupInstagramVideo
                                  ? "w-[min(46vw,172px)] sm:w-[clamp(110px,20vw,280px)]"
                                  : "w-[clamp(96px,38vw,260px)] sm:w-[clamp(110px,20vw,280px)]"
                            }`
                      }`}
                      onClick={pipAllowCollapse ? () => setPipCollapsed(true) : undefined}
                    >
                      <LocalVideoPiP
                        stream={pipStream}
                        user={pipUser}
                        micEnabled={pipMic}
                        cameraEnabled={pipCamera}
                        mirrored={pipMirrored}
                        objectFit={pipObjectFit}
                        pipProfileFill={mobilePipSquareProfile}
                      />
                      <PipSwitchCameraOverlay
                        show={
                          narrowViewport &&
                          cameraEnabled &&
                          !localSharing &&
                          !mobilePipSquareProfile
                        }
                        facingMode={cameraFacingMode}
                        onSwitch={switchCameraFacing}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Controls (floating, zentriert, unten) ─────────────────── */}
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-0"
              style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <CallControls
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
                screenSharingActive={screenSharingActive}
                isVoiceOnly={false}
                onToggleMic={toggleMic}
                onToggleCamera={toggleCamera}
                onStartScreenShare={startScreenShare}
                onStopScreenShare={stopScreenShare}
                onLeave={leaveCall}
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ALLE ANDEREN LAYOUTS (Voice, Gruppe, Ende-Screen)
        ══════════════════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════════
            SPRACHANRUF & ENDE (1:1 + Gruppe – gleiche Optik wie bisher 1:1 Voice)
        ══════════════════════════════════════════════════════════════════ */}
        {!showInstagramVideoChrome && (
          <div className="absolute inset-0 flex flex-col bg-[#0e0906]">

            <div
              className="absolute inset-x-0 top-0 h-44 pointer-events-none z-[1]"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)" }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-56 pointer-events-none z-[1]"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)" }}
            />

            {/* Top-Bar */}
            <div
              className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 relative z-[2]"
              style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))", paddingBottom: "0.5rem" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isGroup ? (
                  <>
                    <button
                      type="button"
                      aria-expanded={showParticipants}
                      aria-controls="call-participants-sidebar"
                      aria-label="Teilnehmerliste öffnen"
                      title="Wer ist im Anruf"
                      onClick={() => setShowParticipants((v) => !v)}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/40 active:scale-95"
                    >
                      <Users size={18} aria-hidden />
                    </button>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm leading-tight truncate">
                        {groupTitle}
                      </p>
                      {isConnected && (
                        <p className="text-white/65 text-xs">
                          {`${joinedParticipants.length} Person${joinedParticipants.length !== 1 ? "en" : ""}`}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-white/50 text-sm">Sprachanruf</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isConnected && (
                  <span className="text-white/45 text-sm font-mono">{duration}</span>
                )}
                <TopIconButton label="Einstellungen">
                  <Settings size={15} />
                </TopIconButton>
                <TopIconButton
                  onClick={toggleFullscreen}
                  label={isFullscreen ? "Vollbild beenden" : "Vollbild"}
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </TopIconButton>
              </div>
            </div>

            {/* Fehler-Banner */}
            {mediaError && (
              <div className="flex-shrink-0 mx-4 mb-2 flex items-center gap-2 bg-amber-900/60 rounded-xl px-3 py-2 relative z-[2]">
                <AlertCircle size={16} className="text-amber-300 flex-shrink-0" />
                <span className="text-amber-200 text-xs">{mediaError}</span>
              </div>
            )}

            {/* Inhalt */}
            {isEnding ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 relative z-[2]">
                <BigAvatar
                  user={!isGroup ? (remoteParticipant?.user ?? null) : null}
                  imageUrl={isGroup ? groupDisplay?.displayImage : undefined}
                  name={isGroup ? groupTitle : undefined}
                  size="lg"
                />
                <div className="text-center space-y-1">
                  <p className="text-white font-semibold text-xl">
                    {!isGroup ? (remoteParticipant?.user?.name ?? "…") : groupTitle}
                  </p>
                  <p className="text-white/50 text-sm">{statusLabel}</p>
                </div>
              </div>
            ) : !isGroup ? (
              <VoiceCallView
                remoteParticipant={remoteParticipant}
                statusLabel={statusLabel}
                duration={duration}
                isConnected={isConnected}
              />
            ) : (
              <VoiceGroupCallView
                participants={joinedParticipants}
                currentUserId={currentUser?._id as string | undefined}
                statusLabel={statusLabel}
                duration={duration}
                isConnected={isConnected}
              />
            )}

            {/* Controls */}
            {!isEnding && (
              <div
                className="flex-shrink-0 relative z-[2]"
                style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
              >
                <CallControls
                  micEnabled={micEnabled}
                  cameraEnabled={cameraEnabled}
                  screenSharingActive={screenSharingActive}
                  isVoiceOnly={isVoiceOnly}
                  onToggleMic={toggleMic}
                  onToggleCamera={toggleCamera}
                  onStartScreenShare={startScreenShare}
                  onStopScreenShare={stopScreenShare}
                  onLeave={leaveCall}
                />
              </div>
            )}

            {/* PiP: Sprachanruf / Gruppen-Teiler — eigene Kamera unten rechts */}
            {!showInstagramVideoChrome && showLocalPreviewPip && (
              <>
                {/* Eingeklappt: Pill exakt so hoch wie die PiP-Kachel → selbe vertikale Mitte */}
                {pipCollapsed && pipAllowCollapse && (
                  <button
                    onClick={() => setPipCollapsed(false)}
                    aria-label="Vorschau einblenden"
                    className="absolute z-[50] pointer-events-auto flex items-center justify-center
                      rounded-l-2xl text-white outline-none
                      transition-colors duration-150"
                    style={{
                      right: 0,
                      ...(narrowViewport
                        ? {
                            top: "calc(0.375rem + env(safe-area-inset-top, 0px))",
                          }
                        : {
                            bottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
                          }),
                      width: "1.75rem",
                      height:
                        narrowViewport && cameraEnabled && localStream
                          ? "clamp(180px, min(56vw, 300px), 320px)"
                          : "clamp(62px, 11.25vw, 158px)",
                      background: "rgba(30,30,30,0.85)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}

                {/* Ausgeklappt: PiP mit transparentem > Tab (Mobil: oben rechts) */}
                <div
                  className={`absolute z-[30] overflow-hidden${pipCollapsed ? " pointer-events-none" : ""}`}
                  style={
                    narrowViewport
                      ? {
                          top: "calc(0.375rem + env(safe-area-inset-top, 0px))",
                          right: 0,
                        }
                      : {
                          bottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
                          right: 0,
                        }
                  }
                >
                  <motion.div
                    className={`relative flex flex-row gap-2 transition-transform duration-300 ease-in-out ${
                      narrowViewport ? "items-start" : "items-end"
                    }`}
                    style={{
                      paddingRight: "clamp(0.5rem, 2vw, 2rem)",
                      transform: pipAllowCollapse && pipCollapsed ? "translateX(100%)" : "translateX(0)",
                    }}
                  >
                    {pipAllowCollapse && (
                    <button
                      onClick={() => setPipCollapsed(true)}
                      aria-label="Vorschau ausblenden"
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10
                        flex items-center justify-center
                        text-white drop-shadow outline-none"
                      style={{
                        width: "1.75rem",
                        height:
                          narrowViewport && cameraEnabled && localStream
                            ? "clamp(180px, min(56vw, 300px), 320px)"
                            : "clamp(62px, 11.25vw, 158px)",
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                    )}

                    {/* Kamera-PiP */}
                    {cameraEnabled && localStream && (
                      <div
                        className={`relative rounded-2xl overflow-hidden shadow-2xl border border-white/15 flex-shrink-0 ${
                          pipAllowCollapse ? "cursor-pointer" : ""
                        }`}
                        style={
                          narrowViewport
                            ? {
                                width: screenSharingActive
                                  ? "min(30vw, 100px)"
                                  : "min(36vw, 118px)",
                                aspectRatio: "9 / 16",
                              }
                            : {
                                width: screenSharingActive
                                  ? "clamp(110px, 16vw, 200px)"
                                  : "clamp(110px, 20vw, 280px)",
                                aspectRatio: "16 / 9",
                              }
                        }
                        onClick={pipAllowCollapse ? () => setPipCollapsed(true) : undefined}
                      >
                        <LocalVideoPiP
                          stream={localStream}
                          user={currentUser ?? null}
                          micEnabled={micEnabled}
                          cameraEnabled={cameraEnabled}
                          mirrored={cameraFacingMode === "user"}
                          objectFit="cover"
                        />
                        <PipSwitchCameraOverlay
                          show={narrowViewport && cameraEnabled}
                          facingMode={cameraFacingMode}
                          onSwitch={switchCameraFacing}
                        />
                      </div>
                    )}

                  </motion.div>
                </div>
              </>
            )}
          </div>
        )}

        <AnimatePresence>
          {isGroup && showParticipants && !isEnding && (
            <>
              <motion.div
                key="call-participants-backdrop"
                className="absolute inset-0 z-[50] bg-black/45"
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                onClick={() => setShowParticipants(false)}
              />
              <motion.aside
                key="call-participants-sidebar"
                id="call-participants-sidebar"
                role="complementary"
                aria-labelledby="call-participants-sidebar-title"
                className="absolute left-0 top-0 bottom-0 z-[55] flex w-[min(88vw,300px)] max-w-full flex-col border-r border-white/10 shadow-2xl will-change-transform"
                style={{
                  background: "rgba(20,14,10,0.97)",
                  backdropFilter: "blur(14px)",
                  paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
                  paddingBottom: "env(safe-area-inset-bottom, 0px)",
                  paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0px))",
                  paddingRight: "0.75rem",
                }}
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <h2
                    id="call-participants-sidebar-title"
                    className="text-sm font-semibold tracking-wide text-white"
                  >
                    Im Anruf
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowParticipants(false)}
                    aria-label="Schließen"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <X size={18} strokeWidth={2} />
                  </button>
                </div>
                <p className="pt-3 text-xs font-semibold uppercase tracking-widest text-white/45">
                  Teilnehmer ({joinedParticipants.length})
                </p>
                <div className="mt-2 flex-1 min-h-0 overflow-y-auto">
                  {joinedParticipants.map((p) => (
                    <div key={p._id} className="flex items-center gap-2.5 py-2">
                      <div
                        className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full"
                        style={{ background: "linear-gradient(135deg, #D08945, #8C531E)" }}
                      >
                        {p.user?.image ? (
                          <img src={p.user.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                            {p.user?.name?.charAt(0).toUpperCase() ?? "?"}
                          </span>
                        )}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm text-white">
                        {p.user?.name ?? "Unbekannt"}
                      </span>
                      {!p.micEnabled && <span className="flex-shrink-0 text-xs text-red-400">Stumm</span>}
                    </div>
                  ))}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
