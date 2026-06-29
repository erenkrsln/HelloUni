"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  acquireCallMediaStream,
  buildStreamFromReceivers,
  CALL_AUDIO_CONSTRAINTS,
  ensureLocalTracksInConnection,
  findVideoSender,
  mergeRemoteTracks,
  replaceVideoTrackInConnection,
  streamsHaveSameTrackIds,
} from "@/lib/webrtc/callMedia";
import { buildIceServers } from "@/lib/webrtc/iceServers";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallPhase =
  | "idle"
  | "outgoing"
  | "incoming"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended"
  | "rejected"
  | "failed";

export interface ParticipantWithUser {
  _id: Id<"callParticipants">;
  callId: Id<"calls">;
  userId: Id<"users">;
  status: "invited" | "ringing" | "joined" | "left" | "rejected";
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  joinedAt?: number;
  leftAt?: number;
  user: Doc<"users"> | null;
}

export interface IncomingCallInfo {
  call: Doc<"calls">;
  caller: Doc<"users"> | null;
  participantRecord: ParticipantWithUser;
}

export interface CallContextValue {
  // State
  activeCallId: Id<"calls"> | null;
  activeCall: Doc<"calls"> | null;
  callPhase: CallPhase;
  localStream: MediaStream | null;
  screenShareStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  participants: ParticipantWithUser[];
  incomingCalls: IncomingCallInfo[];
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharingActive: boolean;
  mediaError: string | null;

  // Actions
  startCall: (
    conversationId: Id<"conversations">,
    type: "voice" | "video",
  ) => Promise<void>;
  acceptCall: (callId: Id<"calls">) => Promise<void>;
  rejectCall: (callId: Id<"calls">) => Promise<void>;
  leaveCall: () => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void | Promise<void>;
  /** Nur sinnvoll auf Mobil: Selfie / Rückkamera wechseln */
  switchCameraFacing: () => Promise<void>;
  cameraFacingMode: "user" | "environment";
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
}

export const CallContext = createContext<CallContextValue | null>(null);

// STUN (Default: Google) + optional TURN aus .env.local — siehe docs/WEBRTC_TURN_SETUP.md
const ICE_SERVERS: RTCIceServer[] = buildIceServers();

// ─── CallProvider ─────────────────────────────────────────────────────────────

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useCurrentUser();

  // ── Local state ──────────────────────────────────────────────────────────────
  const [activeCallId, setActiveCallId] = useState<Id<"calls"> | null>(null);
  const [callPhase, setCallPhase] = useState<CallPhase>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenShareStream, setScreenShareStream] =
    useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [screenSharingActive, setScreenSharingActive] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");

  // ── Refs (nicht re-render-relevant) ──────────────────────────────────────────
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);
  const processedSignals = useRef<Set<string>>(new Set());
  const seenJoinedParticipants = useRef<Set<string>>(new Set());
  const pendingIceCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // ── Convex Mutations ──────────────────────────────────────────────────────────
  const startCallMutation = useMutation(api.calls.startCall);
  const acceptCallMutation = useMutation(api.calls.acceptCall);
  const rejectCallMutation = useMutation(api.calls.rejectCall);
  const cancelCallMutation = useMutation(api.calls.cancelCall);
  const leaveCallMutation = useMutation(api.calls.leaveCall);
  const updateMediaStateMutation = useMutation(
    api.calls.updateParticipantMediaState,
  );
  const sendSignalMutation = useMutation(api.calls.sendSignal);
  const markSignalConsumedMutation = useMutation(api.calls.markSignalConsumed);

  // ── Convex Queries (reaktiv) ──────────────────────────────────────────────────
  const incomingCallsRaw = useQuery(
    api.calls.getIncomingCalls,
    currentUser ? { userId: currentUser._id } : "skip",
  );

  const activeCall = useQuery(
    api.calls.getCallById,
    activeCallId ? { callId: activeCallId } : "skip",
  );

  const participantsRaw = useQuery(
    api.calls.getCallParticipants,
    activeCallId ? { callId: activeCallId } : "skip",
  );

  const signals = useQuery(
    api.calls.getSignalsForUser,
    activeCallId && currentUser
      ? { callId: activeCallId, userId: currentUser._id }
      : "skip",
  );

  // ── Call-Status aus Convex verfolgen ──────────────────────────────────────────
  useEffect(() => {
    if (!activeCall) return;

    if (activeCall.status === "ended" || activeCall.status === "failed") {
      handleCallEnded();
    } else if (activeCall.status === "rejected") {
      setCallPhase("rejected");
      setTimeout(() => handleCallEnded(), 2500);
    } else if (activeCall.status === "active" && callPhase === "outgoing") {
      if (activeCall.scope === "group") {
        setCallPhase("connected");
      } else {
        setCallPhase("connecting");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall?.status, activeCall?.scope]);

  // ── Neue Teilnehmer erkennen und ggf. Offer senden ───────────────────────────
  useEffect(() => {
    if (!participantsRaw || !currentUser || !activeCallId) return;
    if (!localStreamRef.current?.getAudioTracks().length) return;

    const joinedOthers = participantsRaw.filter(
      (p) => p.status === "joined" && p.userId !== currentUser._id,
    );

    for (const participant of joinedOthers) {
      const uid = participant.userId as string;
      const alreadySeen = seenJoinedParticipants.current.has(uid);
      if (!alreadySeen) seenJoinedParticipants.current.add(uid);

      // Deterministische Regel: niedrigere User-ID sendet Offer
      if ((currentUser._id as string) < uid) {
        const pc = peerConnections.current.get(uid);
        const hasAudioSender = pc
          ?.getSenders()
          .some((s) => s.track?.kind === "audio");
        if (!alreadySeen || !hasAudioSender) {
          createOfferForPeer(uid);
        }
      }
    }

    // Verbindungen zu Teilnehmern die gegangen sind aufräumen
    const joinedIds = new Set(joinedOthers.map((p) => p.userId as string));
    for (const uid of seenJoinedParticipants.current) {
      if (!joinedIds.has(uid)) {
        seenJoinedParticipants.current.delete(uid);
        cleanupPeerConnection(uid);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantsRaw, localStream]);

  // ── WebRTC-Signale verarbeiten ────────────────────────────────────────────────
  useEffect(() => {
    if (!signals || !currentUser) return;

    for (const signal of signals) {
      const sid = signal._id as string;
      if (processedSignals.current.has(sid)) continue;
      processedSignals.current.add(sid);

      markSignalConsumedMutation({ signalId: signal._id }).catch(console.error);

      const fromId = signal.fromUserId as string;

      if (signal.type === "offer") {
        handleIncomingOffer(fromId, signal.payload);
      } else if (signal.type === "answer") {
        handleIncomingAnswer(fromId, signal.payload);
      } else if (signal.type === "ice-candidate") {
        handleIncomingIceCandidate(fromId, signal.payload);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals]);

  // ── Verbindungsstatus auf "connected" setzen ──────────────────────────────────
  useEffect(() => {
    if (callPhase === "connecting" && remoteStreams.size > 0) {
      setCallPhase("connected");
    }
  }, [remoteStreams, callPhase]);

  // ── Cleanup bei Browser-Tab-Schließen ────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeCallId && currentUser) {
        leaveCallMutation({ callId: activeCallId, userId: currentUser._id }).catch(
          () => {},
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeCallId, currentUser, leaveCallMutation]);

  // ─── Peer Connection ────────────────────────────────────────────────────────

  const getOrCreatePeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      if (peerConnections.current.has(peerId)) {
        const existing = peerConnections.current.get(peerId)!;
        ensureLocalTracksInConnection(existing, localStreamRef.current);
        return existing;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      ensureLocalTracksInConnection(pc, localStreamRef.current);

      const setPeerRemoteStream = (stream: MediaStream) => {
        setRemoteStreams((prev) => {
          const existing = prev.get(peerId);
          if (existing && streamsHaveSameTrackIds(existing, stream)) return prev;
          const next = new Map(prev);
          next.set(peerId, stream);
          return next;
        });
      };

      // Remote Tracks empfangen (pro Kind nur ein aktiver Track)
      pc.ontrack = (event) => {
        const incoming: MediaStreamTrack[] = [];
        if (event.streams[0]) {
          incoming.push(...event.streams[0].getTracks());
        } else if (event.track) {
          incoming.push(event.track);
        }

        setRemoteStreams((prev) => {
          const merged = mergeRemoteTracks(prev.get(peerId), incoming);
          const existing = prev.get(peerId);
          if (existing && streamsHaveSameTrackIds(existing, merged)) return prev;
          const next = new Map(prev);
          next.set(peerId, merged);
          return next;
        });

        for (const track of incoming) {
          if (track.readyState === "ended") continue;
          track.onended = () => setPeerRemoteStream(buildStreamFromReceivers(pc));
        }

        if (callPhase !== "connected") setCallPhase("connected");
      };

      // ICE Candidates an den Peer senden
      pc.onicecandidate = (event) => {
        if (!event.candidate || !activeCallId || !currentUser) return;
        sendSignalMutation({
          callId: activeCallId,
          fromUserId: currentUser._id,
          toUserId: peerId as Id<"users">,
          type: "ice-candidate",
          payload: JSON.stringify(event.candidate.toJSON()),
        }).catch(console.error);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallPhase("connected");
        } else if (pc.connectionState === "disconnected") {
          setCallPhase("reconnecting");
        } else if (pc.connectionState === "failed") {
          setCallPhase("failed");
        }
      };

      peerConnections.current.set(peerId, pc);
      return pc;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCallId, currentUser],
  );

  const createOfferForPeer = useCallback(
    async (peerId: string) => {
      if (!activeCallId || !currentUser) return;
      try {
        const pc = getOrCreatePeerConnection(peerId);
        ensureLocalTracksInConnection(pc, localStreamRef.current);
        if (pc.signalingState === "have-local-offer") return;
        if (pc.signalingState !== "stable") {
          try {
            await pc.setLocalDescription({ type: "rollback" });
          } catch {
            return;
          }
        }
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignalMutation({
          callId: activeCallId,
          fromUserId: currentUser._id,
          toUserId: peerId as Id<"users">,
          type: "offer",
          payload: JSON.stringify(offer),
        });
      } catch (e) {
        console.error("createOfferForPeer Fehler:", e);
      }
    },
    [activeCallId, currentUser, getOrCreatePeerConnection, sendSignalMutation],
  );

  const flushPendingIceCandidates = useCallback(async (peerId: string) => {
    const pc = peerConnections.current.get(peerId);
    const pending = pendingIceCandidates.current.get(peerId);
    if (!pc?.remoteDescription || !pending?.length) return;

    pendingIceCandidates.current.delete(peerId);
    for (const init of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(init));
      } catch (e) {
        console.error("flushPendingIceCandidates Fehler:", e);
      }
    }
  }, []);

  const queueOrAddIceCandidate = useCallback(
    async (fromId: string, init: RTCIceCandidateInit) => {
      const pc = peerConnections.current.get(fromId);
      if (!pc?.remoteDescription) {
        const queue = pendingIceCandidates.current.get(fromId) ?? [];
        queue.push(init);
        pendingIceCandidates.current.set(fromId, queue);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(init));
      } catch (e) {
        console.error("addIceCandidate Fehler:", e);
      }
    },
    [],
  );

  const handleIncomingOffer = useCallback(
    async (fromId: string, payload: string) => {
      if (!activeCallId || !currentUser) return;
      try {
        const pc = getOrCreatePeerConnection(fromId);
        ensureLocalTracksInConnection(pc, localStreamRef.current);

        const offer = JSON.parse(payload) as RTCSessionDescriptionInit;
        if (pc.signalingState === "have-local-offer") {
          try {
            await pc.setLocalDescription({ type: "rollback" });
          } catch {
            return;
          }
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingIceCandidates(fromId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(fromId, buildStreamFromReceivers(pc));
          return next;
        });
        await sendSignalMutation({
          callId: activeCallId,
          fromUserId: currentUser._id,
          toUserId: fromId as Id<"users">,
          type: "answer",
          payload: JSON.stringify(answer),
        });
      } catch (e) {
        console.error("handleIncomingOffer Fehler:", e);
      }
    },
    [
      activeCallId,
      currentUser,
      getOrCreatePeerConnection,
      sendSignalMutation,
      flushPendingIceCandidates,
    ],
  );

  const handleIncomingAnswer = useCallback(
    async (fromId: string, payload: string) => {
      const pc = peerConnections.current.get(fromId);
      if (!pc) return;
      try {
        const answer = JSON.parse(payload) as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIceCandidates(fromId);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(fromId, buildStreamFromReceivers(pc));
          return next;
        });
      } catch (e) {
        console.error("handleIncomingAnswer Fehler:", e);
      }
    },
    [flushPendingIceCandidates],
  );

  const handleIncomingIceCandidate = useCallback(
    async (fromId: string, payload: string) => {
      try {
        const candidate = JSON.parse(payload) as RTCIceCandidateInit;
        await queueOrAddIceCandidate(fromId, candidate);
      } catch (e) {
        console.error("handleIncomingIceCandidate Fehler:", e);
      }
    },
    [queueOrAddIceCandidate],
  );

  const cleanupPeerConnection = useCallback((peerId: string) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    pendingIceCandidates.current.delete(peerId);
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  /** Schmale Viewports: Kamera in Hochformat (9:16), Selfie/Rückkamera per `cameraFacingMode`. */
  const getLocalVideoConstraints = useCallback((): MediaTrackConstraints => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 639px)").matches
    ) {
      return {
        facingMode: cameraFacingMode,
        width: { ideal: 720, max: 1080 },
        height: { ideal: 1280, max: 1920 },
      };
    }
    return {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
  }, [cameraFacingMode]);

  const cleanupAllConnections = useCallback(() => {
    for (const [id, pc] of peerConnections.current) {
      pc.close();
      peerConnections.current.delete(id);
    }
    setRemoteStreams(new Map());
    seenJoinedParticipants.current.clear();
    processedSignals.current.clear();
    pendingIceCandidates.current.clear();
  }, []);

  // ─── Media-Helpers ───────────────────────────────────────────────────────────

  const getLocalStream = useCallback(
    async (callType: "voice" | "video"): Promise<MediaStream> => {
      setMediaError(null);
      const constraints: MediaStreamConstraints = {
        audio: CALL_AUDIO_CONSTRAINTS,
        video: callType === "video" ? getLocalVideoConstraints() : false,
      };

      try {
        return await acquireCallMediaStream(constraints);
      } catch (err: unknown) {
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError") {
            if (callType === "video") {
              // Kamera verweigert → nur Audio versuchen
              try {
                const audioOnly = await acquireCallMediaStream({
                  audio: CALL_AUDIO_CONSTRAINTS,
                  video: false,
                });
                setMediaError(
                  "Kamera nicht verfügbar – Voice-Call wird gestartet.",
                );
                return audioOnly;
              } catch {
                throw new Error(
                  "Mikrofon-Berechtigung verweigert. Bitte Zugriff in den Browser-Einstellungen erlauben.",
                );
              }
            }
            throw new Error(
              "Mikrofon-Berechtigung verweigert. Bitte Zugriff in den Browser-Einstellungen erlauben.",
            );
          }
          if (err.name === "NotFoundError") {
            if (callType === "video") {
              try {
                return await acquireCallMediaStream({
                  audio: CALL_AUDIO_CONSTRAINTS,
                  video: false,
                });
              } catch {
                throw new Error("Kein Mikrofon gefunden.");
              }
            }
          }
        }
        throw err;
      }
    },
    [getLocalVideoConstraints],
  );

  // ─── Call-Aktionen ───────────────────────────────────────────────────────────

  const startCall = useCallback(
    async (conversationId: Id<"conversations">, type: "voice" | "video") => {
      if (!currentUser) return;
      try {
        setCameraEnabled(type === "video");

        // Medien zuerst: sonst kann das Teilnehmer-Effect WebRTC-Offers bauen, bevor `localStreamRef` gesetzt ist.
        const stream = await getLocalStream(type).catch((err) => {
          setMediaError(err.message);
          return null;
        });

        if (!stream?.getAudioTracks().length) {
          setMediaError(
            "Mikrofon nicht verfügbar – Beitritt zum Anruf nicht möglich.",
          );
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setMicEnabled(true);
        setCameraEnabled(type === "video" && stream.getVideoTracks().length > 0);

        const callId = await startCallMutation({
          conversationId,
          callerId: currentUser._id,
          type,
        });

        seenJoinedParticipants.current.clear();
        setActiveCallId(callId);
        setCallPhase("outgoing");

        updateMediaStateMutation({
          callId,
          userId: currentUser._id,
          micEnabled: true,
          cameraEnabled: type === "video" && stream.getVideoTracks().length > 0,
        }).catch(console.error);
      } catch (e) {
        console.error("startCall Fehler:", e);
        setCallPhase("failed");
      }
    },
    [currentUser, startCallMutation, getLocalStream, updateMediaStateMutation],
  );

  const acceptCall = useCallback(
    async (callId: Id<"calls">) => {
      if (!currentUser) return;
      try {
        // Zuerst Mediazugriff holen (brauchen wir den Call-Typ)
        const callDoc = incomingCallsRaw?.find((c) => c.call._id === callId);
        const callType = callDoc?.call.type ?? "voice";

        const stream = await getLocalStream(callType).catch((err) => {
          setMediaError(err.message);
          return null;
        });

        if (!stream?.getAudioTracks().length) {
          setMediaError(
            "Mikrofon nicht verfügbar – Beitritt zum Anruf nicht möglich.",
          );
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setMicEnabled(true);
        setCameraEnabled(
          callType === "video" && stream.getVideoTracks().length > 0,
        );

        await acceptCallMutation({ callId, userId: currentUser._id });

        const cameraOn =
          callType === "video" && (stream?.getVideoTracks().length ?? 0) > 0;
        updateMediaStateMutation({
          callId,
          userId: currentUser._id,
          micEnabled: true,
          cameraEnabled: cameraOn,
        }).catch(console.error);

        setActiveCallId(callId);
        setCallPhase("connecting");
      } catch (e) {
        console.error("acceptCall Fehler:", e);
      }
    },
    [
      currentUser,
      acceptCallMutation,
      getLocalStream,
      incomingCallsRaw,
      updateMediaStateMutation,
    ],
  );

  const rejectCall = useCallback(
    async (callId: Id<"calls">) => {
      if (!currentUser) return;
      await rejectCallMutation({ callId, userId: currentUser._id }).catch(
        console.error,
      );
    },
    [currentUser, rejectCallMutation],
  );

  const leaveCall = useCallback(async () => {
    if (!activeCallId || !currentUser) return;
    try {
      await leaveCallMutation({ callId: activeCallId, userId: currentUser._id });
    } finally {
      handleCallEnded();
    }
  }, [activeCallId, currentUser, leaveCallMutation]);

  const handleCallEnded = useCallback(() => {
    cleanupAllConnections();

    // Alle Media-Tracks stoppen
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenShareStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenShareStreamRef.current = null;

    setLocalStream(null);
    setScreenShareStream(null);
    setScreenSharingActive(false);
    setMicEnabled(true);
    setCameraEnabled(false);
    setMediaError(null);
    setCameraFacingMode("user");

    if (callPhase !== "rejected") setCallPhase("ended");
    setTimeout(() => {
      setCallPhase("idle");
      setActiveCallId(null);
    }, 2000);
  }, [cleanupAllConnections, callPhase]);

  // ─── Media-Controls ──────────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newState = !micEnabled;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = newState;
    });
    setMicEnabled(newState);
    if (activeCallId && currentUser) {
      updateMediaStateMutation({
        callId: activeCallId,
        userId: currentUser._id,
        micEnabled: newState,
      }).catch(console.error);
    }
  }, [micEnabled, activeCallId, currentUser, updateMediaStateMutation]);

  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const existingVideoTracks = [...stream.getVideoTracks()];

    if (existingVideoTracks.length > 0 && cameraEnabled) {
      // Kamera aus: Track wirklich entfernen (nicht nur enabled=false — sonst Black Screen bei Screen-Share)
      try {
        setMediaError(null);
        for (const [, pc] of peerConnections.current.entries()) {
          await replaceVideoTrackInConnection(pc, null);
        }
        for (const track of existingVideoTracks) {
          stream.removeTrack(track);
          track.stop();
        }
        setLocalStream(new MediaStream(stream.getTracks()));
        setCameraEnabled(false);

        for (const peerId of peerConnections.current.keys()) {
          await createOfferForPeer(peerId);
        }

        if (activeCallId && currentUser) {
          await updateMediaStateMutation({
            callId: activeCallId,
            userId: currentUser._id,
            cameraEnabled: false,
          });
        }
      } catch (e) {
        console.error("Kamera deaktivieren:", e);
        setMediaError("Kamera konnte nicht deaktiviert werden.");
      }
      return;
    }

    if (existingVideoTracks.length > 0 && !cameraEnabled) {
      // Fallback: nur aktivieren (falls Track noch existiert)
      existingVideoTracks.forEach((t) => {
        t.enabled = true;
      });
      setCameraEnabled(true);
      if (activeCallId && currentUser) {
        updateMediaStateMutation({
          callId: activeCallId,
          userId: currentUser._id,
          cameraEnabled: true,
        }).catch(console.error);
      }
      return;
    }

    {
      // Voice-Call: noch kein Video-Track → Kamera anfordern
      try {
        setMediaError(null);
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: getLocalVideoConstraints(),
        });
        const videoTrack = camStream.getVideoTracks()[0];
        stream.addTrack(videoTrack);
        setCameraEnabled(true);
        setLocalStream(new MediaStream(stream.getTracks()));

        for (const [peerId, pc] of peerConnections.current.entries()) {
          await replaceVideoTrackInConnection(pc, videoTrack, stream);
          await createOfferForPeer(peerId);
        }

        if (activeCallId && currentUser) {
          updateMediaStateMutation({
            callId: activeCallId,
            userId: currentUser._id,
            cameraEnabled: true,
          }).catch(console.error);
        }
      } catch (e) {
        console.error("Kamera konnte nicht aktiviert werden:", e);
        setMediaError("Kamera konnte nicht aktiviert werden.");
      }
    }
  }, [cameraEnabled, activeCallId, currentUser, updateMediaStateMutation, createOfferForPeer, getLocalVideoConstraints]);

  const switchCameraFacing = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream?.getVideoTracks().length) return;
    if (
      typeof window === "undefined" ||
      !window.matchMedia("(max-width: 639px)").matches
    ) {
      return;
    }

    const newFacing: "user" | "environment" =
      cameraFacingMode === "user" ? "environment" : "user";

    try {
      setMediaError(null);
      const vStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: newFacing,
          width: { ideal: 720, max: 1080 },
          height: { ideal: 1280, max: 1920 },
        },
      });
      const newTrack = vStream.getVideoTracks()[0];
      const oldVideo = stream.getVideoTracks()[0];

      for (const [, pc] of peerConnections.current.entries()) {
        const sender = pc.getSenders().find(
          (s) => s.track?.kind === "video" && s.track === oldVideo,
        );
        if (sender) {
          await sender.replaceTrack(newTrack);
        }
      }

      if (oldVideo) {
        stream.removeTrack(oldVideo);
        oldVideo.stop();
      }
      stream.addTrack(newTrack);

      setCameraFacingMode(newFacing);
      setLocalStream(new MediaStream(stream.getTracks()));
    } catch (e) {
      console.error("Kamera wechseln:", e);
      setMediaError("Kamerawechsel nicht möglich.");
    }
  }, [cameraFacingMode]);

  const startScreenShare = useCallback(async () => {
    if (!activeCallId || !currentUser) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenShareStreamRef.current = screenStream;
      setScreenShareStream(screenStream);
      setScreenSharingActive(true);

      const screenTrack = screenStream.getVideoTracks()[0];

      // Alte Kamera-Tracks lokal stoppen (Sender wird per replace ersetzt)
      const local = localStreamRef.current;
      if (local) {
        for (const track of [...local.getVideoTracks()]) {
          local.removeTrack(track);
          track.stop();
        }
        setLocalStream(new MediaStream(local.getTracks()));
        setCameraEnabled(false);
      }

      for (const [peerId, pc] of peerConnections.current.entries()) {
        await replaceVideoTrackInConnection(pc, screenTrack, screenStream);
        await createOfferForPeer(peerId);
      }

      await updateMediaStateMutation({
        callId: activeCallId,
        userId: currentUser._id,
        screenSharing: true,
      });

      // Automatisch stoppen wenn Nutzer über Browser-UI aufhört
      screenTrack.onended = () => stopScreenShare();
    } catch (e) {
      console.error("startScreenShare Fehler:", e);
    }
  }, [activeCallId, currentUser, updateMediaStateMutation, createOfferForPeer]);

  const stopScreenShare = useCallback(() => {
    if (!activeCallId || !currentUser) return;
    screenShareStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenShareStreamRef.current = null;
    setScreenShareStream(null);
    setScreenSharingActive(false);

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];

    void (async () => {
      for (const [peerId, pc] of peerConnections.current.entries()) {
        if (cameraTrack) {
          await replaceVideoTrackInConnection(
            pc,
            cameraTrack,
            localStreamRef.current ?? undefined,
          );
        } else {
          await replaceVideoTrackInConnection(pc, null);
        }
        await createOfferForPeer(peerId);
      }
    })();

    updateMediaStateMutation({
      callId: activeCallId,
      userId: currentUser._id,
      screenSharing: false,
    }).catch(console.error);
  }, [activeCallId, currentUser, updateMediaStateMutation, createOfferForPeer]);

  // ─── Context-Wert ────────────────────────────────────────────────────────────

  const participants = (participantsRaw ?? []) as ParticipantWithUser[];
  const incomingCalls = (incomingCallsRaw ?? []) as unknown as IncomingCallInfo[];

  return (
    <CallContext.Provider
      value={{
        activeCallId,
        activeCall: activeCall ?? null,
        callPhase,
        localStream,
        screenShareStream,
        remoteStreams,
        participants,
        incomingCalls,
        micEnabled,
        cameraEnabled,
        screenSharingActive,
        mediaError,
        startCall,
        acceptCall,
        rejectCall,
        leaveCall,
        toggleMic,
        toggleCamera,
        switchCameraFacing,
        cameraFacingMode,
        startScreenShare,
        stopScreenShare,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
