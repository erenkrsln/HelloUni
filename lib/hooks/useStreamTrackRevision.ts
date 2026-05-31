import { useEffect, useState } from "react";

/** Re-Render auslösen, wenn sich Tracks im Stream ändern (z. B. Kamera aus). */
export function useStreamTrackRevision(stream: MediaStream | null): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!stream) return;

    const bump = () => setRevision((n) => n + 1);

    const attachTrack = (track: MediaStreamTrack) => {
      track.addEventListener("ended", bump);
      track.addEventListener("mute", bump);
      track.addEventListener("unmute", bump);
    };

    for (const track of stream.getTracks()) attachTrack(track);
    stream.addEventListener("addtrack", bump);
    stream.addEventListener("removetrack", bump);

    return () => {
      for (const track of stream.getTracks()) {
        track.removeEventListener("ended", bump);
        track.removeEventListener("mute", bump);
        track.removeEventListener("unmute", bump);
      }
      stream.removeEventListener("addtrack", bump);
      stream.removeEventListener("removetrack", bump);
    };
  }, [stream]);

  return revision;
}

export function hasActiveVideoTrack(
  stream: MediaStream | null,
  cameraEnabled = true,
): boolean {
  return (
    cameraEnabled &&
    !!stream &&
    stream
      .getVideoTracks()
      .some((t) => t.enabled && t.readyState !== "ended")
  );
}
