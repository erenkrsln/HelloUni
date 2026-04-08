"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Bildschirmfreigabe-Einstellungen aus dem Professoren-Beispiel (video_multi.html)
// cursor: 'always' → Mauszeiger immer sichtbar
// displaySurface: 'monitor' → bevorzugt ganzen Monitor (application | browser | monitor | window)
const DISPLAY_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: {
    cursor: "always",
    displaySurface: "monitor",
  } as MediaTrackConstraints,
};

// Dieselben STUN-Server wie im Professoren-Beispiel
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.schlund.de" },
    { urls: "stun:stun.1und1.de" },
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

interface VideoCallProps {
  callId: Id<"callSessions">;
  currentUserId: Id<"users">;
  callType: "voice" | "video";
  onEnd: () => void;
  participants: Array<{ _id: Id<"users">; name: string; image?: string }>;
  mode?: "fullscreen" | "popup";
  onExpand?: () => void;
}

interface PeerState {
  pc: RTCPeerConnection;
  stream?: MediaStream;
}

export function VideoCall({
  callId,
  currentUserId,
  callType,
  onEnd,
  participants,
  mode = "fullscreen",
  onExpand,
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const pcsRef = useRef<Record<string, PeerState>>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(callType === "video");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendSignal = useMutation(api.calls.sendSignal);
  const markProcessed = useMutation(api.calls.markSignalProcessed);
  const leaveCall = useMutation(api.calls.leaveCall);

  const pendingSignals = useQuery(api.calls.getPendingSignals, { callId, userId: currentUserId });
  const callSession = useQuery(api.calls.getCallSession, { callId });

  const processedSignalIds = useRef<Set<string>>(new Set());
  const iceCandidateQueue = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const hadOtherParticipants = useRef(false);

  // ── Freizeichenton ─────────────────────────────────────────────────────────
  const isInitiator = callSession?.initiatorId === currentUserId;
  const isConnectedForRing = Object.keys(remoteStreams).length > 0;
  useRingtone(isInitiator && !isConnectedForRing);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m.toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  };

  // ── Controls auto-hide bei Inaktivität ─────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [resetHideTimer]);

  // ── Stream öffnen ──────────────────────────────────────────────────────────
  const openLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video"
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
          : false,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error("Kamera/Mikrofon konnte nicht geöffnet werden:", err);
      return null;
    }
  }, [callType]);

  // ── Peer Connection ────────────────────────────────────────────────────────
  const createPeerConnection = useCallback((remoteUserId: string): RTCPeerConnection => {
    pcsRef.current[remoteUserId]?.pc.close();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    pc.ontrack = (e) => setRemoteStreams((prev) => ({ ...prev, [remoteUserId]: e.streams[0] }));
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({
          callId, fromUserId: currentUserId,
          toUserId: remoteUserId as Id<"users">,
          type: "ice-candidate", data: JSON.stringify(e.candidate),
        });
      }
    };

    pcsRef.current[remoteUserId] = { pc };
    return pc;
  }, [callId, currentUserId, sendSignal]);

  const createAndSendOffer = useCallback(async (remoteUserId: string) => {
    const pc = createPeerConnection(remoteUserId);
    try {
      const sdp = await pc.createOffer();
      await pc.setLocalDescription(sdp);
      await sendSignal({ callId, fromUserId: currentUserId, toUserId: remoteUserId as Id<"users">, type: "offer", data: JSON.stringify(sdp) });
    } catch (err) { console.error("Fehler beim Erstellen des Angebots:", err); }
  }, [callId, createPeerConnection, currentUserId, sendSignal]);

  // ── Signal-Verarbeitung ────────────────────────────────────────────────────
  useEffect(() => {
    if (!pendingSignals?.length) return;
    const process = async () => {
      for (const signal of pendingSignals) {
        if (processedSignalIds.current.has(signal._id)) continue;
        processedSignalIds.current.add(signal._id);
        const fromId = signal.fromUserId;
        try {
          if (signal.type === "webrtc_start") {
            await openLocalStream();
            await createAndSendOffer(fromId);
          } else if (signal.type === "offer") {
            await openLocalStream();
            const existingPc = pcsRef.current[fromId]?.pc;
            const pc = (existingPc?.signalingState === "stable") ? existingPc : createPeerConnection(fromId);
            if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.data)));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await sendSignal({ callId, fromUserId: currentUserId, toUserId: fromId as Id<"users">, type: "answer", data: JSON.stringify(answer) });
              for (const c of iceCandidateQueue.current[fromId] || [])
                await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
              iceCandidateQueue.current[fromId] = [];
            }
          } else if (signal.type === "answer") {
            const { pc } = pcsRef.current[fromId] ?? {};
            if (pc?.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.data)));
              for (const c of iceCandidateQueue.current[fromId] || [])
                await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
              iceCandidateQueue.current[fromId] = [];
            }
          } else if (signal.type === "ice-candidate") {
            const { pc } = pcsRef.current[fromId] ?? {};
            const candidate = JSON.parse(signal.data) as RTCIceCandidateInit;
            if (pc?.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            } else {
              (iceCandidateQueue.current[fromId] ??= []).push(candidate);
            }
          }
        } catch (err) { console.error("Signal-Fehler:", signal.type, err); }
        await markProcessed({ signalId: signal._id });
      }
    };
    process();
  }, [pendingSignals, callId, currentUserId, createAndSendOffer, createPeerConnection, markProcessed, openLocalStream, sendSignal]);

  useEffect(() => {
    openLocalStream();
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      Object.values(pcsRef.current).forEach(({ pc }) => pc.close());
    };
  }, [openLocalStream]);

  // ── Peers aufräumen ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!callSession) return;
    const active = new Set(callSession.activeParticipants.map(String));
    Object.keys(pcsRef.current).forEach((id) => {
      if (!active.has(id)) {
        pcsRef.current[id].pc.close();
        delete pcsRef.current[id];
        setRemoteStreams((p) => { const u = { ...p }; delete u[id]; return u; });
      }
    });
  }, [callSession]);

  // ── Auto-Ende ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!callSession) return;
    const others = callSession.activeParticipants.filter((id) => id !== currentUserId);
    if (others.length > 0) hadOtherParticipants.current = true;
    const shouldEnd =
      callSession.status === "ended" ||
      !callSession.activeParticipants.includes(currentUserId) ||
      (hadOtherParticipants.current && others.length === 0 && callSession.activeParticipants.includes(currentUserId));
    if (shouldEnd) {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      Object.values(pcsRef.current).forEach(({ pc }) => pc.close());
      onEnd();
    }
  }, [callSession, currentUserId, onEnd]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const handleEndCall = async () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    Object.values(pcsRef.current).forEach(({ pc }) => pc.close());
    await leaveCall({ callId, userId: currentUserId });
    onEnd();
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !isCameraOn; });
    setIsCameraOn(!isCameraOn);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // ── Bildschirmfreigabe beenden ──────────────────────────────────────
      // Alle Screen-Tracks stoppen (wie professor's track.stop())
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;

      // Zurück zur Kamera: replaceTrack auf alle Peer Connections
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      for (const { pc } of Object.values(pcsRef.current)) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          // Wenn Kamera-Track vorhanden → ersetzen, sonst null (Kamera aus)
          await sender.replaceTrack(camTrack ?? null).catch(() => {});
        }
      }
      // Lokale Vorschau zurücksetzen
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      try {
        // ── Bildschirm erfassen mit Professoren-Constraints ────────────────
        // Exakt wie in video_multi.html:
        // stream = await navigator.mediaDevices.getDisplayMedia(displayConstraints)
        const screenStream = await navigator.mediaDevices.getDisplayMedia(DISPLAY_CONSTRAINTS);
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Lokale Vorschau auf Bildschirm umschalten
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Screen-Track an alle Peer Connections senden (replaceTrack ohne Renegotiation)
        for (const { pc } of Object.values(pcsRef.current)) {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(screenTrack).catch(() => {});
          } else {
            // Kein Video-Sender vorhanden (Sprachanruf) → neu hinzufügen + Renegotiation
            pc.addTrack(screenTrack, screenStream);
            const sdp = await pc.createOffer().catch(() => null);
            if (sdp) {
              await pc.setLocalDescription(sdp);
              await sendSignal({
                callId,
                fromUserId: currentUserId,
                toUserId: Object.keys(pcsRef.current).find(
                  (id) => pcsRef.current[id].pc === pc
                ) as Id<"users">,
                type: "offer",
                data: JSON.stringify(sdp),
              });
            }
          }
        }

        // Wenn der Nutzer den Browser-Dialog zum Stoppen nutzt → automatisch beenden
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current?.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          Object.values(pcsRef.current).forEach(({ pc }) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(camTrack ?? null).catch(() => {});
          });
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        };

        setIsScreenSharing(true);
      } catch (err) {
        // Nutzer hat den Dialog abgebrochen → kein Fehler anzeigen
        console.log("Bildschirmfreigabe abgebrochen oder fehlgeschlagen:", err);
      }
    }
  };

  const otherParticipants = participants.filter((p) => p._id !== currentUserId);
  const mainPerson = otherParticipants[0];
  const remoteStreamEntries = Object.entries(remoteStreams);
  const isConnected = remoteStreamEntries.length > 0;

  // ══════════════════════════════════════════════════════════════════════════
  // VOICE CALL – WhatsApp Web-Stil
  // ══════════════════════════════════════════════════════════════════════════
  if (callType === "voice") {
    return (
      <div
        className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col overflow-hidden select-none"
        onMouseMove={resetHideTimer}
        onTouchStart={resetHideTimer}
      >
        {/* Audio-Elemente */}
        {remoteStreamEntries.map(([uid, stream]) => (
          <RemoteAudio key={uid} stream={stream} />
        ))}

        {/* Hintergrund-Verlauf */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(39,80,39,0.18) 0%, transparent 70%)" }} />

        {/* Subtiles Punkt-Muster */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#fff 1px,transparent 1px)", backgroundSize: "22px 22px" }} />

        {/* ── Header ── */}
        <div className={`relative z-10 transition-opacity duration-500 ${controlsVisible ? "opacity-100" : "opacity-0"}`}>
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 via-black/20 to-transparent"
            style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top,0px))" }}>
            {/* Links: Avatar + Name */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
                {mainPerson?.image
                  ? <img src={mainPerson.image} alt="" className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold text-white/70">{mainPerson?.name?.charAt(0).toUpperCase()}</span>}
              </div>
              <div className="flex flex-col">
                <span className="text-white font-semibold text-sm leading-tight">{mainPerson?.name ?? "Anruf"}</span>
              </div>
            </div>
            {/* Rechts: Timer */}
            <span className={`font-mono text-sm ${isConnected ? "text-emerald-400" : "text-white/50 animate-pulse"}`}>
              {isConnected ? formatDuration(callDuration) : "Verbinde..."}
            </span>
          </div>
        </div>

        {/* ── Großer Avatar zentriert ── */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-5">
            <div className="relative flex items-center justify-center">
              {isConnected && (
                <>
                  <div className="absolute w-60 h-60 rounded-full bg-emerald-500/[0.06] animate-ping" style={{ animationDuration: "2.4s" }} />
                  <div className="absolute w-48 h-48 rounded-full bg-emerald-500/[0.08] animate-ping" style={{ animationDuration: "2.4s", animationDelay: "0.6s" }} />
                </>
              )}
              <div className="w-36 h-36 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shadow-2xl ring-4 ring-white/10 relative z-10">
                {mainPerson?.image
                  ? <img src={mainPerson.image} alt={mainPerson.name} className="w-full h-full object-cover" />
                  : <span className="text-5xl font-bold text-white/70">{mainPerson?.name?.charAt(0).toUpperCase() ?? "?"}</span>}
              </div>
            </div>
            <span className="text-white font-semibold text-xl">{mainPerson?.name ?? "Anruf"}</span>

            {/* Gruppe: weitere Teilnehmer */}
            {otherParticipants.length > 1 && (
              <div className="flex -space-x-3">
                {otherParticipants.slice(1).map((p) => (
                  <div key={p._id} className="w-9 h-9 rounded-full overflow-hidden bg-white/10 border-2 border-zinc-950 flex items-center justify-center">
                    {p.image
                      ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold text-white/70">{p.name.charAt(0).toUpperCase()}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Control Bar (Pill) mit framer-motion ── */}
        <AnimatePresence>
          {controlsVisible && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex justify-center pb-6"
              style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom,0px))" }}
            >
              <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-full px-5 py-3 shadow-2xl">
                <PillBtn icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />} active={isMuted} activeColor="bg-red-500/20 text-red-400 border-red-500/30" onClick={toggleMute} label={isMuted ? "Stummgeschaltet" : "Mikrofon"} />
                <PillBtn icon={isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />} active={isScreenSharing} activeColor="bg-emerald-500/20 text-emerald-400 border-emerald-500/30" onClick={toggleScreenShare} label={isScreenSharing ? "Freigabe beenden" : "Bildschirm teilen"} />
                <div className="w-px h-8 bg-white/10 mx-1" />
                <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} onClick={handleEndCall} title="Auflegen" className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <PhoneOff size={20} className="text-white" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIDEO CALL – WhatsApp Web-Stil
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col overflow-hidden"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {/* Audio (immer aktiv) */}
      {remoteStreamEntries.map(([uid, stream]) => (
        <RemoteAudio key={uid} stream={stream} />
      ))}

      {/* ── Remote Video (Hauptfläche) ── */}
      <div className="relative flex-1 flex items-center justify-center bg-zinc-900 rounded-2xl m-2 overflow-hidden">
        {remoteStreamEntries.length > 0 ? (
          <div className={`w-full h-full flex flex-wrap gap-1 p-1`}>
            {remoteStreamEntries.map(([uid, stream]) => {
              const person = participants.find((p) => p._id === uid);
              return (
                <RemoteVideo
                  key={uid}
                  stream={stream}
                  name={person?.name ?? "Teilnehmer"}
                  count={remoteStreamEntries.length}
                />
              );
            })}
          </div>
        ) : (
          /* Warten auf Verbindung */
          <div className="flex flex-col items-center gap-4 text-white/40">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
              {mainPerson?.image
                ? <img src={mainPerson.image} alt="" className="w-full h-full object-cover rounded-full" />
                : <span className="text-4xl font-bold">{mainPerson?.name?.charAt(0).toUpperCase()}</span>}
            </div>
            <span className="text-sm animate-pulse">Warte auf {mainPerson?.name ?? "Teilnehmer"}...</span>
          </div>
        )}

        {/* ── Header (oben, transparent) ── */}
        <div className={`absolute top-0 left-0 right-0 z-10 transition-opacity duration-500 ${controlsVisible ? "opacity-100" : "opacity-0"}`}>
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 via-black/30 to-transparent"
            style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top,0px))" }}>
            {/* Links: Avatar + Name */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
                {mainPerson?.image
                  ? <img src={mainPerson.image} alt="" className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold text-white/70">{mainPerson?.name?.charAt(0).toUpperCase()}</span>}
              </div>
              <div className="flex flex-col">
                <span className="text-white font-semibold text-sm leading-tight">{mainPerson?.name ?? "Videoanruf"}</span>
              </div>
            </div>

            {/* Rechts: Timer */}
            <span className={`font-mono text-sm ${isConnected ? "text-emerald-400" : "text-white/50 animate-pulse"}`}>
              {isConnected ? formatDuration(callDuration) : "Verbinde..."}
            </span>
          </div>
        </div>

        {/* ── Self-View PiP (oben rechts) ── */}
        <div className="absolute top-16 right-3 w-24 h-36 sm:w-32 sm:h-44 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/10 z-20 bg-zinc-800">
          <video ref={localVideoRef} autoPlay muted playsInline
            className={`w-full h-full object-cover transition-opacity ${isCameraOn ? "opacity-100" : "opacity-0"}`} />
          {!isCameraOn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <VideoOff size={20} className="text-white/40" />
            </div>
          )}
        </div>
      </div>

      {/* ── Control Bar (Pill) mit framer-motion ── */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex justify-center pb-6"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom,0px))" }}
          >
            <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-full px-5 py-3 shadow-2xl">
              <PillBtn icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />} active={isMuted} activeColor="bg-red-500/20 text-red-400 border-red-500/30" onClick={toggleMute} label={isMuted ? "Stummgeschaltet" : "Mikrofon"} />
              <PillBtn icon={isCameraOn ? <Video size={20} /> : <VideoOff size={20} />} active={!isCameraOn} activeColor="bg-red-500/20 text-red-400 border-red-500/30" onClick={toggleCamera} label={isCameraOn ? "Kamera" : "Kamera aus"} />
              <PillBtn icon={isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />} active={isScreenSharing} activeColor="bg-emerald-500/20 text-emerald-400 border-emerald-500/30" onClick={toggleScreenShare} label="Bildschirm" />
              <PillBtn icon={<Settings size={20} />} active={false} onClick={() => {}} label="Einstellungen" />
              <div className="w-px h-8 bg-white/10 mx-1" />
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} onClick={handleEndCall} title="Auflegen" className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <PhoneOff size={20} className="text-white" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Pill-Button für Videoanruf ─────────────────────────────────────────────
function PillBtn({
  icon, active, activeColor, onClick, label,
}: {
  icon: React.ReactNode;
  active: boolean;
  activeColor?: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all active:scale-90 ${
        active
          ? activeColor ?? "bg-white/20 text-white border-white/20"
          : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
    </button>
  );
}

// ── Runder Control-Button für Sprachanruf ─────────────────────────────────
function ControlBtn({
  icon, activeIcon, label, active, onClick,
}: {
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 active:scale-90 transition-all">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-colors ${
        active ? "bg-white/25 text-white" : "bg-white/10 text-white/80"
      }`}>
        {active ? activeIcon : icon}
      </div>
      <span className="text-white/50 text-[11px]">{label}</span>
    </button>
  );
}

// ── Audio-Element für Remote-Streams ──────────────────────────────────────
function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline style={{ display: "none" }} />;
}

// ── Freizeichenton (Web Audio API) ────────────────────────────────────────
// Spielt ein realistisches Doppelklingeln: zwei kurze Töne, dann Pause – in Schleife.
function useRingtone(active: boolean) {
  useEffect(() => {
    if (!active) return;

    let ctx: AudioContext | null = null;
    let stopped = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const playTone = (frequency: number, start: number, duration: number) => {
      if (!ctx || stopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + start + duration - 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    const ring = () => {
      if (stopped) return;
      try {
        ctx = new AudioContext();
        // Doppelklingeln: 400ms Ton, 200ms Pause, 400ms Ton, dann 2s Stille
        playTone(440, 0.0, 0.4);
        playTone(480, 0.0, 0.4);   // leichte Harmonie
        playTone(440, 0.6, 0.4);
        playTone(480, 0.6, 0.4);
      } catch {}
      // Nach 3 Sekunden wiederholen
      const t = setTimeout(() => {
        ctx?.close();
        ctx = null;
        ring();
      }, 3000);
      timeouts.push(t);
    };

    ring();

    return () => {
      stopped = true;
      timeouts.forEach(clearTimeout);
      ctx?.close();
    };
  }, [active]);
}

// ── Remote-Video-Kachel ───────────────────────────────────────────────────
function RemoteVideo({ stream, name, count }: { stream: MediaStream; name: string; count: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});
  }, [stream]);
  return (
    <div className={`relative rounded-2xl overflow-hidden bg-zinc-800 ${count === 1 ? "w-full h-full" : "flex-1 min-h-[40%]"}`}>
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
        <span className="text-white text-xs font-medium">{name}</span>
      </div>
    </div>
  );
}
