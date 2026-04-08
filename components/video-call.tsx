"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff } from "lucide-react";
import { motion } from "framer-motion";

const DISPLAY_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: { cursor: "always", displaySurface: "monitor" } as MediaTrackConstraints,
};

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

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function VideoCall({
  callId,
  currentUserId,
  callType,
  onEnd,
  participants,
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
  // Peers die über WebRTC als getrennt erkannt wurden – sofortige UI-Reaktion
  // ohne auf das Convex-Update warten zu müssen.
  const [leftPeers, setLeftPeers] = useState<Set<string>>(new Set());

  const sendSignal = useMutation(api.calls.sendSignal);
  const markProcessed = useMutation(api.calls.markSignalProcessed);
  const leaveCallMutation = useMutation(api.calls.leaveCall);

  const pendingSignals = useQuery(api.calls.getPendingSignals, { callId, userId: currentUserId });
  const callSession = useQuery(api.calls.getCallSession, { callId });

  const processedSignalIds = useRef<Set<string>>(new Set());
  const iceCandidateQueue = useRef<Record<string, RTCIceCandidateInit[]>>({});
  // Sobald wir einmal verbunden waren → nie wieder Klingelton abspielen
  const wasEverConnected = useRef(false);

  const isInitiator = callSession?.initiatorId === currentUserId;
  const isConnectedForRing = Object.keys(remoteStreams).length > 0;
  if (isConnectedForRing) wasEverConnected.current = true;
  useRingtone(isInitiator && !isConnectedForRing && !wasEverConnected.current);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
      : `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ── Stream öffnen ──────────────────────────────────────────────────────────
  const openLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
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

  // ── Peer Connection ─────────────────────────────────────────────────────────
  const createPeerConnection = useCallback((remoteUserId: string): RTCPeerConnection => {
    pcsRef.current[remoteUserId]?.pc.close();
    const pc = new RTCPeerConnection(ICE_SERVERS);
    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    pc.ontrack = (e) => {
      setRemoteStreams((prev) => ({ ...prev, [remoteUserId]: e.streams[0] }));
      // Wenn der Peer wieder verbunden ist, aus leftPeers entfernen
      setLeftPeers((prev) => { const s = new Set(prev); s.delete(remoteUserId); return s; });
    };
    // Sofortige Reaktion wenn WebRTC-Verbindung abbricht – ohne auf Convex zu warten
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setRemoteStreams((prev) => { const u = { ...prev }; delete u[remoteUserId]; return u; });
        setLeftPeers((prev) => new Set([...prev, remoteUserId]));
      }
    };
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

  // ── Signal-Verarbeitung ─────────────────────────────────────────────────────
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

  // ── Peer-Cleanup wenn jemand den Anruf verlässt ─────────────────────────────
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
    // leftPeers bereinigen: Wenn Convex bestätigt hat dass jemand nicht mehr aktiv ist,
    // kann er aus leftPeers entfernt werden (er ist schon aus activeOthers raus).
    setLeftPeers((prev) => {
      const cleaned = new Set(prev);
      cleaned.forEach((id) => { if (!active.has(id)) cleaned.delete(id); });
      return cleaned.size !== prev.size ? cleaned : prev;
    });
  }, [callSession]);

  // ── Auto-Ende: nur wenn Session beendet oder User entfernt wurde ────────────
  useEffect(() => {
    if (!callSession) return;
    const shouldEnd =
      callSession.status === "ended" ||
      !callSession.activeParticipants.includes(currentUserId);
    if (shouldEnd) {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      Object.values(pcsRef.current).forEach(({ pc }) => pc.close());
      onEnd();
    }
  }, [callSession, currentUserId, onEnd]);

  // ── Controls ────────────────────────────────────────────────────────────────
  const handleEndCall = async () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    Object.values(pcsRef.current).forEach(({ pc }) => pc.close());
    await leaveCallMutation({ callId, userId: currentUserId });
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
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      for (const [remoteUserId, { pc }] of Object.entries(pcsRef.current)) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (!sender) continue;
        if (camTrack) {
          await sender.replaceTrack(camTrack).catch(() => {});
        } else {
          pc.removeTrack(sender);
          const sdp = await pc.createOffer().catch(() => null);
          if (sdp) {
            await pc.setLocalDescription(sdp);
            await sendSignal({ callId, fromUserId: currentUserId, toUserId: remoteUserId as Id<"users">, type: "offer", data: JSON.stringify(sdp) });
          }
        }
      }
      if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia(DISPLAY_CONSTRAINTS);
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        for (const { pc } of Object.values(pcsRef.current)) {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(screenTrack).catch(() => {});
          } else {
            pc.addTrack(screenTrack, screenStream);
            const sdp = await pc.createOffer().catch(() => null);
            if (sdp) {
              await pc.setLocalDescription(sdp);
              await sendSignal({
                callId, fromUserId: currentUserId,
                toUserId: Object.keys(pcsRef.current).find((id) => pcsRef.current[id].pc === pc) as Id<"users">,
                type: "offer", data: JSON.stringify(sdp),
              });
            }
          }
        }
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current?.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
          const cam = localStreamRef.current?.getVideoTracks()[0];
          Object.entries(pcsRef.current).forEach(async ([uid, { pc }]) => {
            const s = pc.getSenders().find((x) => x.track?.kind === "video");
            if (!s) return;
            if (cam) { s.replaceTrack(cam).catch(() => {}); }
            else {
              pc.removeTrack(s);
              const o = await pc.createOffer().catch(() => null);
              if (o) { await pc.setLocalDescription(o); await sendSignal({ callId, fromUserId: currentUserId, toUserId: uid as Id<"users">, type: "offer", data: JSON.stringify(o) }); }
            }
          });
          if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        };
        setIsScreenSharing(true);
      } catch { /* abgebrochen */ }
    }
  };

  // ── Derived State ───────────────────────────────────────────────────────────
  // Teilnehmer anzeigen wenn:
  // • Convex sie in activeParticipants führt (reaktiv über callSession)
  // • UND WebRTC sie NICHT als getrennt markiert hat (leftPeers)
  // leftPeers reagiert sofort wenn die Verbindung abbricht – ohne auf Convex zu warten.
  const selfParticipant = participants.find((p) => p._id === currentUserId);
  const activeIds = new Set((callSession?.activeParticipants ?? []).map(String));
  const activeOthers = participants.filter(
    (p) => p._id !== currentUserId && activeIds.has(String(p._id)) && !leftPeers.has(String(p._id))
  );
  const remoteEntries = Object.entries(remoteStreams);
  const isConnected = remoteEntries.length > 0;
  const sharedScreen = remoteEntries.find(([, s]) =>
    s.getVideoTracks().some((t) => t.readyState === "live" && !t.muted)
  );
  const isGroup = participants.length > 2;
  const totalInCall = activeOthers.length + 1;
  const everyoneElseLeft = wasEverConnected.current && activeOthers.length === 0;

  // ══════════════════════════════════════════════════════════════════════════
  // VOICE CALL – Teams-Stil
  // ══════════════════════════════════════════════════════════════════════════
  if (callType === "voice") {
    const voiceParticipants = [
      ...(selfParticipant ? [{ ...selfParticipant, isSelf: true }] : []),
      ...activeOthers.map((p) => ({ ...p, isSelf: false })),
    ];

    return (
      <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#1f1f1f", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        {remoteEntries.map(([uid, stream]) => <RemoteAudio key={uid} stream={stream} />)}

        <TeamsHeader
          title={isGroup ? "Gruppenanruf" : (activeOthers[0]?.name ?? "Sprachanruf")}
          duration={fmt(callDuration)}
          isConnected={isConnected}
          participantCount={totalInCall}
        />

        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {sharedScreen ? (
            <div className="absolute inset-0">
              <RemoteScreenView stream={sharedScreen[1]} />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-md">
                <span className="text-white text-xs">Bildschirm wird geteilt</span>
              </div>
            </div>
          ) : everyoneElseLeft ? (
            <div className="flex flex-col items-center gap-3 text-white/40">
              {selfParticipant && <AvatarCircle name={selfParticipant.name} image={selfParticipant.image} size="lg" />}
              <span className="text-sm">Alle anderen haben den Anruf verlassen</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 p-6 md:p-10">
              {voiceParticipants.map((p) => (
                <VoiceAvatar
                  key={p._id}
                  name={p.name}
                  image={p.image}
                  isSelf={p.isSelf}
                  connected={p.isSelf || remoteStreams[String(p._id)] !== undefined}
                />
              ))}
            </div>
          )}
        </div>

        <TeamsControlBar
          isMuted={isMuted} toggleMute={toggleMute}
          isCameraOn={false} toggleCamera={() => {}}
          isScreenSharing={isScreenSharing} toggleScreenShare={toggleScreenShare}
          handleEndCall={handleEndCall}
          showCamera={false}
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIDEO CALL – Teams-Stil
  // ══════════════════════════════════════════════════════════════════════════
  const videoParticipants = [
    ...(selfParticipant ? [{ ...selfParticipant, isSelf: true as const }] : []),
    ...activeOthers.map((p) => ({ ...p, isSelf: false as const })),
  ];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#1f1f1f", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {remoteEntries.map(([uid, stream]) => <RemoteAudio key={uid} stream={stream} />)}

      <TeamsHeader
        title={isGroup ? "Gruppenanruf" : (activeOthers[0]?.name ?? "Videoanruf")}
        duration={fmt(callDuration)}
        isConnected={isConnected}
        participantCount={totalInCall}
      />

      <div className="flex-1 overflow-hidden p-2 md:p-3 relative">
        {everyoneElseLeft && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <span className="text-white/40 text-sm bg-black/40 px-4 py-2 rounded-lg">
              Alle anderen haben den Anruf verlassen
            </span>
          </div>
        )}
        <div className={`w-full h-full grid gap-2 ${getVideoGrid(videoParticipants.length)}`}>
          {videoParticipants.map((p) => {
            if (p.isSelf) {
              return (
                <div key={p._id} className="relative rounded-lg overflow-hidden bg-[#2d2d2d] hover:shadow-lg transition-shadow">
                  <video ref={localVideoRef} autoPlay muted playsInline
                    className={`w-full h-full object-cover ${isCameraOn ? "opacity-100" : "opacity-0"}`} />
                  {!isCameraOn && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <AvatarCircle name={p.name} image={p.image} size="lg" />
                    </div>
                  )}
                  <TileLabel name="Du" />
                  {isMuted && <MutedBadge />}
                </div>
              );
            }
            const stream = remoteStreams[String(p._id)];
            const hasVideo = stream?.getVideoTracks().some((t) => t.readyState === "live" && !t.muted);
            return (
              <div key={p._id} className="relative rounded-lg overflow-hidden bg-[#2d2d2d] hover:shadow-lg transition-shadow">
                {stream ? (
                  <>
                    <RemoteVideoEl stream={stream} />
                    {!hasVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#2d2d2d]">
                        <AvatarCircle name={p.name} image={p.image} size="lg" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <AvatarCircle name={p.name} image={p.image} size="lg" />
                    <span className="text-white/40 text-xs animate-pulse">Tritt bei...</span>
                  </div>
                )}
                <TileLabel name={p.name} />
              </div>
            );
          })}
        </div>
      </div>

      <TeamsControlBar
        isMuted={isMuted} toggleMute={toggleMute}
        isCameraOn={isCameraOn} toggleCamera={toggleCamera}
        isScreenSharing={isScreenSharing} toggleScreenShare={toggleScreenShare}
        handleEndCall={handleEndCall}
        showCamera
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEAMS HEADER
// ══════════════════════════════════════════════════════════════════════════════

function TeamsHeader({ title, duration, isConnected, participantCount }: {
  title: string; duration: string; isConnected: boolean; participantCount: number;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 md:px-6 py-2.5 bg-[#292929] border-b border-white/5 flex-shrink-0"
      style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
    >
      <span className="text-white/90 font-semibold text-sm truncate max-w-[40%]">{title}</span>
      <span className={`font-mono text-xs px-2 ${isConnected ? "text-white/60" : "text-white/30 animate-pulse"}`}>
        {isConnected ? duration : "Verbinde..."}
      </span>
      <div className="flex items-center gap-1.5">
        <div className="flex -space-x-1.5">
          {Array.from({ length: Math.min(participantCount, 4) }).map((_, i) => (
            <div key={i} className="w-5 h-5 rounded-full bg-white/10 border border-[#292929]" />
          ))}
        </div>
        <span className="text-white/40 text-xs">{participantCount}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEAMS CONTROL BAR (Glassmorphism)
// ══════════════════════════════════════════════════════════════════════════════

function TeamsControlBar({ isMuted, toggleMute, isCameraOn, toggleCamera, isScreenSharing, toggleScreenShare, handleEndCall, showCamera }: {
  isMuted: boolean; toggleMute: () => void;
  isCameraOn: boolean; toggleCamera: () => void;
  isScreenSharing: boolean; toggleScreenShare: () => void;
  handleEndCall: () => void;
  showCamera: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex justify-center py-3 px-4 flex-shrink-0"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-center gap-2 bg-[#2d2d2d]/80 backdrop-blur-xl border border-white/8 rounded-xl px-3 py-2 shadow-2xl">
        <CtrlBtn icon={isMuted ? <MicOff size={18} /> : <Mic size={18} />} active={isMuted} onClick={toggleMute} label={isMuted ? "Stummschalten aufheben" : "Stummschalten"} danger={isMuted} />
        {showCamera && (
          <CtrlBtn icon={isCameraOn ? <Video size={18} /> : <VideoOff size={18} />} active={!isCameraOn} onClick={toggleCamera} label={isCameraOn ? "Kamera aus" : "Kamera an"} danger={!isCameraOn} />
        )}
        <CtrlBtn icon={isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />} active={isScreenSharing} onClick={toggleScreenShare} label={isScreenSharing ? "Freigabe beenden" : "Bildschirm teilen"} accent={isScreenSharing} />
        <div className="w-px h-7 bg-white/10 mx-1" />
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
          onClick={handleEndCall}
          title="Verlassen"
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-[#c4314b] hover:bg-[#d4425b] text-white text-sm font-medium transition-colors"
        >
          <PhoneOff size={16} />
          <span className="hidden sm:inline">Verlassen</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

function CtrlBtn({ icon, active, onClick, label, danger, accent }: {
  icon: React.ReactNode; active: boolean; onClick: () => void; label: string;
  danger?: boolean; accent?: boolean;
}) {
  return (
    <button
      onClick={onClick} title={label}
      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:bg-white/10 active:scale-90 ${
        danger ? "bg-[#c4314b]/20 text-[#f87171]"
        : accent ? "bg-[#5b5fc7]/20 text-[#8b8cf7]"
        : active ? "bg-white/10 text-white" : "text-white/70"
      }`}
    >
      {icon}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TILE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function TileLabel({ name }: { name: string }) {
  return (
    <div className="absolute bottom-1.5 left-1.5 md:bottom-2 md:left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md z-10">
      <span className="text-white text-[10px] md:text-xs font-medium truncate">{name}</span>
    </div>
  );
}

function MutedBadge() {
  return (
    <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 bg-[#c4314b]/80 rounded-md p-1 z-10">
      <MicOff size={12} className="text-white" />
    </div>
  );
}

// Farben basieren deterministisch auf dem Namen → immer gleiche Farbe pro Person
const AVATAR_COLORS = ["#5b5fc7", "#0d9373", "#c4314b", "#e97548", "#4f6bed", "#a855f7", "#059669", "#d946ef"];

function AvatarCircle({ name, image, size = "md" }: { name: string; image?: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16 md:w-20 md:h-20" : size === "md" ? "w-12 h-12" : "w-9 h-9";
  const textSz = size === "lg" ? "text-2xl md:text-3xl" : size === "md" ? "text-lg" : "text-sm";
  const color = AVATAR_COLORS[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className={`${dim} rounded-full overflow-hidden flex items-center justify-center flex-shrink-0`}
      style={{ background: image ? undefined : color }}>
      {image
        ? <img src={image} alt={name} className="w-full h-full object-cover" />
        : <span className={`text-white font-semibold ${textSz}`}>{initials}</span>
      }
    </div>
  );
}

function VoiceAvatar({ name, image, isSelf, connected }: {
  name: string; image?: string; isSelf: boolean; connected: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative rounded-full transition-all ${connected ? "ring-2 ring-[#5b5fc7]/60" : "ring-1 ring-white/10"}`}>
        {connected && !isSelf && (
          <div className="absolute -inset-1 rounded-full bg-[#5b5fc7]/15 animate-pulse" />
        )}
        <AvatarCircle name={name} image={image} size="lg" />
      </div>
      <span className="text-white/70 text-xs md:text-sm font-medium truncate max-w-[80px] md:max-w-[100px] text-center">
        {isSelf ? "Du" : name}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MEDIA ELEMENTS
// ══════════════════════════════════════════════════════════════════════════════

function RemoteVideoEl({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover absolute inset-0" />;
}

function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline style={{ display: "none" }} />;
}

function RemoteScreenView({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-contain bg-black" />;
}

// ══════════════════════════════════════════════════════════════════════════════
// RINGTONE (Web Audio API)
// ══════════════════════════════════════════════════════════════════════════════

function useRingtone(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let ctx: AudioContext | null = null;
    let stopped = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const playTone = (freq: number, start: number, dur: number) => {
      if (!ctx || stopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + start + dur - 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
    };
    const ring = () => {
      if (stopped) return;
      try { ctx = new AudioContext(); playTone(440, 0, 0.4); playTone(480, 0, 0.4); playTone(440, 0.6, 0.4); playTone(480, 0.6, 0.4); } catch {}
      const t = setTimeout(() => { ctx?.close(); ctx = null; ring(); }, 3000);
      timeouts.push(t);
    };
    ring();
    return () => { stopped = true; timeouts.forEach(clearTimeout); ctx?.close(); };
  }, [active]);
}

// ══════════════════════════════════════════════════════════════════════════════
// GRID HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getVideoGrid(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 md:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 9) return "grid-cols-2 md:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
}
