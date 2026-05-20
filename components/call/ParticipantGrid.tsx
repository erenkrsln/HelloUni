"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MicOff } from "lucide-react";
import { VideoTile } from "./VideoTile";
import type { ParticipantWithUser } from "./CallProvider";
import type { Doc } from "@/convex/_generated/dataModel";
import { getStreamForScreenShare } from "@/lib/webrtc/callMedia";

interface ParticipantGridProps {
  localStream: MediaStream | null;
  screenShareStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  participants: ParticipantWithUser[];
  currentUser: Doc<"users">;
  localMicEnabled: boolean;
  localCameraEnabled: boolean;
  localScreenSharing: boolean;
  screenSharingUserId?: string | null;
  /** Kein eigener „teilt Bildschirm“-Titel — Overlay zeigt ihn bereits (Instagram-Chrome) */
  embedMode?: boolean;
  /** Gruppen-Video (Overlay): lokale Vorschau nur im Overlay-PiP — kein zweites PiP im 2er-Raster; Klick auf lokale Kachel klappt PiP ein. Muss gesetzt sein, sobald das Overlay aktiv ist (nicht erst wenn der Stream da ist), sonst kurz ein großes Selbstbild im Raster. */
  onLocalPreviewClick?: () => void;
}

// ─── PiP für Gruppen-2er-Layout ──────────────────────────────────────────────
function GroupPiP({
  stream, user, micEnabled, cameraEnabled, isLocal,
}: {
  stream: MediaStream | null;
  user: Doc<"users"> | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  isLocal: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  const name = user?.name ?? (isLocal ? "Du" : "Teilnehmer");
  const hasVideo = !!stream && cameraEnabled && stream.getVideoTracks().length > 0;

  return (
    <div className="w-full h-full bg-[#1a1209] relative overflow-hidden rounded-2xl">
      {stream && (
        <video
          ref={videoRef}
          autoPlay playsInline muted={isLocal}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            ...(isLocal ? { transform: "scaleX(-1)" } : {}),
          }}
          className={`transition-opacity duration-300 ${hasVideo ? "opacity-100" : "opacity-0 absolute inset-0"}`}
        />
      )}
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1209]">
          {user?.image ? (
            <img src={user.image} alt={name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #D08945, #8C531E)" }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
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

export function ParticipantGrid({
  localStream,
  screenShareStream,
  remoteStreams,
  participants,
  currentUser,
  localMicEnabled,
  localCameraEnabled,
  localScreenSharing,
  screenSharingUserId,
  embedMode = false,
  onLocalPreviewClick,
}: ParticipantGridProps) {
  const [narrowScreen, setNarrowScreen] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setNarrowScreen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const joinedParticipants = participants.filter((p) => p.status === "joined");
  const remoteParticipants = joinedParticipants.filter(
    (p) => (p.userId as string) !== (currentUser._id as string)
  );
  const hasScreenShare = !!screenSharingUserId;

  // ── Screen Sharing: prominente Ansicht ────────────────────────────────────
  if (hasScreenShare) {
    const sharer = participants.find((p) => (p.userId as string) === screenSharingUserId);
    const rawSharerStream =
      (screenSharingUserId as string) === (currentUser._id as string)
        ? screenShareStream
        : (remoteStreams.get(screenSharingUserId as string) ?? null);
    const sharerStream = getStreamForScreenShare(rawSharerStream);

    return (
      <div className={`flex flex-col ${embedMode ? "gap-2 md:gap-2.5" : "gap-2 md:gap-3"} h-full min-h-0`}>
        <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10">
          <VideoTile
            stream={sharerStream}
            user={sharer?.user ?? null}
            isLocal={(screenSharingUserId as string) === (currentUser._id as string)}
            micEnabled={sharer?.micEnabled ?? true}
            cameraEnabled={false}
            screenSharing
            objectFit="contain"
            className="h-full w-full"
            noRound
          />
        </div>
        <div
          className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 flex-shrink-0 snap-x snap-mandatory"
          style={{ height: "clamp(72px, 22vw, 108px)" }}
        >
          {joinedParticipants.map((p) => {
            const isLocal = (p.userId as string) === (currentUser._id as string);
            const stream = isLocal
              ? localStream
              : (remoteStreams.get(p.userId as string) ?? null);
            const tile = (
              <VideoTile
                stream={stream}
                user={isLocal ? currentUser : (p.user ?? null)}
                isLocal={isLocal}
                micEnabled={isLocal ? localMicEnabled : p.micEnabled}
                cameraEnabled={isLocal ? localCameraEnabled : p.cameraEnabled}
                className="h-full w-full min-h-[72px]"
                compact
              />
            );
            return (
              <div
                key={p._id}
                className={`h-full aspect-video flex-shrink-0 snap-start rounded-lg sm:rounded-xl min-w-[96px] sm:min-w-[112px] overflow-hidden ${
                  isLocal && onLocalPreviewClick ? "cursor-pointer" : ""
                }`}
                onClick={isLocal && onLocalPreviewClick ? () => onLocalPreviewClick() : undefined}
              >
                {tile}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Nur du im Raum (Gruppen-Video): kein lokales Video im Raster — das zeigt das Overlay-PiP unten rechts
  if (remoteParticipants.length === 0 && onLocalPreviewClick) {
    return (
      <div className="relative flex h-full w-full min-h-0 items-center justify-center bg-[#0e0906]">
        <p className="text-white/45 text-xs sm:text-sm font-medium text-center px-4 sm:px-6 max-w-sm leading-relaxed">
          Warte auf weitere Teilnehmer …
        </p>
      </div>
    );
  }

  // ── 2 Personen: Instagram-Style (eine groß, eigenes PiP) ─────────────────
  if (remoteParticipants.length === 1) {
    const remote = remoteParticipants[0];
    const remoteStream = remoteStreams.get(remote.userId as string) ?? null;

    return (
      <div className="relative h-full w-full">
        {/* Haupt-Remote-Video */}
        <VideoTile
          stream={remoteStream}
          user={remote.user ?? null}
          micEnabled={remote.micEnabled}
          cameraEnabled={remote.cameraEnabled}
          screenSharing={remote.screenSharing}
          objectFit="contain"
          noRound
          className="absolute inset-0 h-full w-full"
        />
        {/* Eigenes PiP unten rechts — bei Overlay-PiP weglassen (sonst Klicks am falschen Layer) */}
        {localStream && !onLocalPreviewClick && (
          <div
            className="absolute right-2 sm:right-3 rounded-2xl overflow-hidden shadow-2xl border border-white/15"
            style={{
              bottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
              width: narrowScreen ? "clamp(88px, 30vw, 132px)" : "clamp(100px, 24vw, 280px)",
              aspectRatio: narrowScreen ? "9 / 16" : "16 / 9",
            }}
          >
            <GroupPiP
              stream={localStream}
              user={currentUser}
              micEnabled={localMicEnabled}
              cameraEnabled={localCameraEnabled}
              isLocal
            />
          </div>
        )}
      </div>
    );
  }

  // ── Mehrteilnehmer-Raster ───────────────────────────────────────────────────
  // Gruppen-Video (Overlay): nur Remotes im Raster — eigene Kamera nur im Overlay-PiP.
  // Sonst (z. B. zukünftige andere Nutzung): alle Joined inkl. du.
  const gridParticipants = onLocalPreviewClick ? remoteParticipants : joinedParticipants;
  const count = gridParticipants.length;

  const tiles = gridParticipants.map((p) => {
    const isLocal = (p.userId as string) === (currentUser._id as string);
    const stream = isLocal
      ? localStream
      : (remoteStreams.get(p.userId as string) ?? null);

    const inner = (
      <VideoTile
        stream={stream}
        user={isLocal ? currentUser : (p.user ?? null)}
        isLocal={isLocal}
        micEnabled={isLocal ? localMicEnabled : p.micEnabled}
        cameraEnabled={isLocal ? localCameraEnabled : p.cameraEnabled}
        screenSharing={isLocal ? localScreenSharing : p.screenSharing}
        className="h-full w-full min-h-0 min-w-0"
      />
    );

    if (isLocal && onLocalPreviewClick) {
      return (
        <div
          key={p._id}
          className="h-full w-full min-h-0 min-w-0 cursor-pointer"
          onClick={() => onLocalPreviewClick()}
        >
          {inner}
        </div>
      );
    }

    return <div key={p._id} className="h-full w-full min-h-0 min-w-0">{inner}</div>;
  });

  const gap = "gap-2 sm:gap-3 md:gap-4";

  // 2 Remotes (bei Overlay: du + 2 andere): gleich groß nebeneinander
  if (count === 2) {
    return (
      <div
        className={`grid h-full min-h-0 ${gap}`}
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gridTemplateRows: "minmax(0, 1fr)",
        }}
      >
        {tiles}
      </div>
    );
  }

  // 3: oben 2 nebeneinander, unten 1 zentriert — Mobil: drei gleich hohe Zeilen (kein extrem schmales Raster)
  if (count === 3) {
    if (narrowScreen) {
      return (
        <div className={`flex flex-col ${gap} h-full min-h-0`}>
          <div className="flex-1 min-h-[104px] min-w-0">{tiles[0]}</div>
          <div className="flex-1 min-h-[104px] min-w-0">{tiles[1]}</div>
          <div className="flex-1 min-h-[104px] min-w-0">{tiles[2]}</div>
        </div>
      );
    }
    return (
      <div className={`flex flex-col ${gap} h-full min-h-0`}>
        <div
          className={`grid flex-1 min-h-0 ${gap}`}
          style={{
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gridTemplateRows: "minmax(0, 1fr)",
          }}
        >
          {tiles[0]}
          {tiles[1]}
        </div>
        <div className="flex flex-1 min-h-0 justify-center items-stretch">
          <div className="w-full max-w-[min(92%,420px)] sm:max-w-[min(50%,420px)] min-h-[96px] sm:min-h-[120px] h-full">
            {tiles[2]}
          </div>
        </div>
      </div>
    );
  }

  // 4: symmetrisches 2×2
  if (count === 4) {
    return (
      <div
        className={`grid h-full min-h-0 ${gap}`}
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gridTemplateRows: "repeat(2, minmax(0, 1fr))",
        }}
      >
        {tiles}
      </div>
    );
  }

  // 5: Desktop 3+2 — Mobil 2+2+1 (breitere Kacheln)
  if (count === 5) {
    if (narrowScreen) {
      return (
        <div className={`flex flex-col ${gap} h-full min-h-0`}>
          <div
            className={`grid flex-1 min-h-0 ${gap}`}
            style={{
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gridTemplateRows: "minmax(0, 1fr)",
            }}
          >
            {tiles.slice(0, 2)}
          </div>
          <div
            className={`grid flex-1 min-h-0 ${gap}`}
            style={{
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gridTemplateRows: "minmax(0, 1fr)",
            }}
          >
            {tiles.slice(2, 4)}
          </div>
          <div className="flex flex-1 min-h-[100px] justify-center items-stretch">
            <div className="h-full w-full max-w-[min(100%,320px)]">{tiles[4]}</div>
          </div>
        </div>
      );
    }
    return (
      <div className={`flex flex-col ${gap} h-full min-h-0`}>
        <div
          className={`grid flex-[2] min-h-0 ${gap}`}
          style={{
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gridTemplateRows: "minmax(0, 1fr)",
          }}
        >
          {tiles.slice(0, 3)}
        </div>
        <div className="flex flex-1 min-h-0 justify-center items-stretch pt-0">
          <div
            className={`grid h-full w-full max-w-[min(100%,520px)] min-h-0 ${gap}`}
            style={{
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gridTemplateRows: "minmax(0, 1fr)",
            }}
          >
            {tiles.slice(3, 5)}
          </div>
        </div>
      </div>
    );
  }

  // 6: Desktop 3×2 — Mobil 2×3 (höhere Kacheln)
  if (count === 6) {
    if (narrowScreen) {
      return (
        <div
          className={`grid h-full min-h-0 ${gap}`}
          style={{
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gridTemplateRows: "repeat(3, minmax(0, 1fr))",
          }}
        >
          {tiles}
        </div>
      );
    }
    return (
      <div
        className={`grid h-full min-h-0 ${gap}`}
        style={{
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gridTemplateRows: "repeat(2, minmax(0, 1fr))",
        }}
      >
        {tiles}
      </div>
    );
  }

  // 7+: Desktop 3/4 Spalten; schmales Display 2 Spalten → breitere Kacheln, weniger Quetschen
  const cols = narrowScreen ? 2 : count <= 9 ? 3 : 4;
  const rowCount = Math.ceil(count / cols);
  const minRowPx = narrowScreen
    ? count > 10
      ? 100
      : 112
    : count > 12
      ? 124
      : 142;

  return (
    <div
      className={`grid h-full min-h-0 overflow-y-auto overflow-x-hidden ${gap} content-stretch [scrollbar-gutter:stable]`}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rowCount}, minmax(${minRowPx}px, 1fr))`,
        minHeight: rowCount >= 3 ? `${rowCount * minRowPx}px` : undefined,
      }}
    >
      {tiles}
    </div>
  );
}
