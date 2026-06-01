"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
  /** Eigenes Kamerabild spiegeln (nur Frontkamera). Rückkamera = nicht gespiegelt. */
  localMirrored?: boolean;
  screenSharingUserId?: string | null;
  /** Kein eigener „teilt Bildschirm"-Titel — Overlay zeigt ihn bereits (Instagram-Chrome) */
  embedMode?: boolean;
}

/**
 * Teams-Style: größtmögliche, gleich große Kacheln (16:9), die in den verfügbaren
 * Platz passen. Wählt die Spaltenzahl, die die Kachelfläche maximiert.
 */
function computeTileWidth(
  count: number,
  width: number,
  height: number,
  gap: number,
  aspect: number,
): number {
  if (count <= 0 || width <= 0 || height <= 0) return 0;
  let best = 0;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cellW = (width - (cols - 1) * gap) / cols;
    const cellH = (height - (rows - 1) * gap) / rows;
    if (cellW <= 0 || cellH <= 0) continue;
    const tileW = Math.min(cellW, cellH * aspect);
    if (tileW > best) best = tileW;
  }
  // Abrunden: verhindert, dass Sub-Pixel-Rundung eine Kachel umbrechen lässt.
  return Math.floor(best);
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
  localMirrored = true,
  screenSharingUserId,
  embedMode = false,
}: ParticipantGridProps) {
  const hasScreenShare = !!screenSharingUserId;

  const galleryRef = useRef<HTMLDivElement>(null);
  const [gallerySize, setGallerySize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    const measure = () =>
      setGallerySize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasScreenShare]);

  const joinedParticipants = participants.filter((p) => p.status === "joined");

  // ── Screen Sharing: prominente Ansicht (geteilter Inhalt groß + Streifen) ────
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
            mirrored={false}
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
            return (
              <div
                key={p._id}
                className="h-full aspect-video flex-shrink-0 snap-start rounded-lg sm:rounded-xl min-w-[96px] sm:min-w-[112px] overflow-hidden"
              >
                <VideoTile
                  stream={stream}
                  user={isLocal ? currentUser : (p.user ?? null)}
                  isLocal={isLocal}
                  mirrored={isLocal ? localMirrored : undefined}
                  micEnabled={isLocal ? localMicEnabled : p.micEnabled}
                  cameraEnabled={isLocal ? localCameraEnabled : p.cameraEnabled}
                  className="h-full w-full min-h-[72px]"
                  compact
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Galerie (Teams-Style): alle Teilnehmer als gleich große Kacheln ──────────
  // Seitenverhältnis nach Ausrichtung der Fläche: Hochformat (Mobil) = höhere
  // Kacheln (3:4), Querformat/Desktop = 16:9. Nutzt den Platz jeweils optimal.
  const GAP = 12;
  const portrait = gallerySize.h > gallerySize.w;
  const ASPECT = portrait ? 3 / 4 : 16 / 9;
  const aspectCss = portrait ? "3 / 4" : "16 / 9";
  const count = joinedParticipants.length;
  const tileWidth = computeTileWidth(count, gallerySize.w, gallerySize.h, GAP, ASPECT);

  return (
    <div ref={galleryRef} className="relative h-full w-full min-h-0">
      <div
        className="flex h-full w-full flex-wrap content-center items-center justify-center"
        style={{ gap: `${GAP}px` }}
      >
        {joinedParticipants.map((p) => {
          const isLocal = (p.userId as string) === (currentUser._id as string);
          const stream = isLocal
            ? localStream
            : (remoteStreams.get(p.userId as string) ?? null);
          return (
            <div
              key={p._id}
              className="overflow-hidden rounded-2xl"
              style={{
                width: tileWidth > 0 ? `${tileWidth}px` : "min(100%, 320px)",
                aspectRatio: aspectCss,
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            >
              <VideoTile
                stream={stream}
                user={isLocal ? currentUser : (p.user ?? null)}
                isLocal={isLocal}
                mirrored={isLocal ? localMirrored : undefined}
                micEnabled={isLocal ? localMicEnabled : p.micEnabled}
                cameraEnabled={isLocal ? localCameraEnabled : p.cameraEnabled}
                screenSharing={isLocal ? localScreenSharing : p.screenSharing}
                noRound
                className="h-full w-full"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
