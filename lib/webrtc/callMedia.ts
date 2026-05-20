/** Standard-Audiokonfiguration – weniger dumpfer/leiser Start als mit `noiseSuppression: true`. */
export const CALL_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: false,
  autoGainControl: true,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTrackLive(
  track: MediaStreamTrack,
  timeoutMs: number,
): Promise<void> {
  if (track.readyState === "live") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const done = () => {
      clearInterval(interval);
      track.removeEventListener("start", onStart);
    };
    const onStart = () => {
      if (track.readyState === "live") {
        done();
        resolve();
      }
    };
    track.addEventListener("start", onStart);
    const interval = setInterval(() => {
      if (track.readyState === "live") {
        done();
        resolve();
      } else if (Date.now() > deadline) {
        done();
        reject(new Error("Audiotrack nicht bereit"));
      }
    }, 40);
  });
}

function waitForTrackUnmuted(
  track: MediaStreamTrack,
  timeoutMs: number,
): Promise<void> {
  if (!track.muted) return Promise.resolve();

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const finish = () => {
      clearInterval(interval);
      track.removeEventListener("unmute", onUnmute);
      resolve();
    };
    const onUnmute = () => {
      if (!track.muted) finish();
    };
    track.addEventListener("unmute", onUnmute);
    const interval = setInterval(() => {
      if (!track.muted || Date.now() > deadline) finish();
    }, 40);
  });
}

/**
 * Nach `getUserMedia`: Audiotrack live + kurze AGC-Warmup-Zeit,
 * bevor Tracks an RTCPeerConnection gehängt oder Offers gesendet werden.
 */
export async function waitForLocalStreamReady(
  stream: MediaStream,
  options?: { warmupMs?: number; timeoutMs?: number },
): Promise<void> {
  const audio = stream.getAudioTracks()[0];
  if (!audio) throw new Error("Kein Audiotrack im Stream");

  const timeoutMs = options?.timeoutMs ?? 8000;
  const warmupMs = options?.warmupMs ?? 180;

  audio.enabled = true;
  await waitForTrackLive(audio, timeoutMs);
  await waitForTrackUnmuted(audio, Math.min(timeoutMs, 2500));
  if (warmupMs > 0) await delay(warmupMs);
}

/** `getUserMedia` + Warten bis der lokale Audiostream sendebereit ist. */
export async function acquireCallMediaStream(
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  if (stream.getAudioTracks().length > 0) {
    await waitForLocalStreamReady(stream);
  }
  return stream;
}

/** Fehlende lokale Tracks an eine bestehende PeerConnection hängen (z. B. nach Gruppen-Beitritt). */
export function ensureLocalTracksInConnection(
  pc: RTCPeerConnection,
  localStream: MediaStream | null,
): boolean {
  if (!localStream) return false;

  let added = false;
  const tracks = [
    ...localStream.getAudioTracks(),
    ...localStream.getVideoTracks(),
  ];
  for (const track of tracks) {
    const hasSender = pc
      .getSenders()
      .some((s) => s.track?.id === track.id);
    if (!hasSender) {
      pc.addTrack(track, localStream);
      added = true;
    }
  }
  return added;
}

/** Video-Sender setzen/ersetzen (auch nach Kamera aus → null-Track). */
export async function replaceVideoTrackInConnection(
  pc: RTCPeerConnection,
  track: MediaStreamTrack | null,
  streamForAdd?: MediaStream,
): Promise<void> {
  let sender = findVideoSender(pc);
  if (sender) {
    await sender.replaceTrack(track);
    const transceiver = pc
      .getTransceivers()
      .find((t) => t.sender === sender);
    if (transceiver && track) {
      if (
        transceiver.direction === "inactive" ||
        transceiver.direction === "recvonly"
      ) {
        transceiver.direction = "sendonly";
      }
    }
    return;
  }
  if (track && streamForAdd) {
    pc.addTrack(track, streamForAdd);
  }
}

/** Video-Sender finden (auch wenn Track nach removeTrack/replaceTrack(null) fehlt). */
export function findVideoSender(
  pc: RTCPeerConnection,
): RTCRtpSender | undefined {
  const withTrack = pc.getSenders().find((s) => s.track?.kind === "video");
  if (withTrack) return withTrack;

  for (const tr of pc.getTransceivers()) {
    if (tr.stopped) continue;
    if (tr.sender.track?.kind === "video") return tr.sender;
    if (
      tr.receiver.track?.kind === "video" &&
      tr.direction !== "recvonly" &&
      tr.direction !== "inactive"
    ) {
      return tr.sender;
    }
  }

  return pc
    .getTransceivers()
    .find((t) => !t.stopped && t.receiver.track?.kind === "video")?.sender;
}

/** Remote-Stream aus aktiven Receivern (nach Renegotiation). */
export function buildStreamFromReceivers(
  pc: RTCPeerConnection,
): MediaStream {
  const audio: MediaStreamTrack[] = [];
  let video: MediaStreamTrack | null = null;

  for (const { track } of pc.getReceivers()) {
    if (!track || track.readyState === "ended") continue;
    if (track.kind === "audio") {
      if (!audio.some((t) => t.id === track.id)) audio.push(track);
    } else if (track.kind === "video") {
      if (
        !video ||
        isScreenShareTrack(track) ||
        (!isScreenShareTrack(video) && track.enabled)
      ) {
        video = track;
      }
    }
  }

  return new MediaStream([...audio, ...(video ? [video] : [])]);
}

export function isScreenShareTrack(track: MediaStreamTrack): boolean {
  const settings = track.getSettings?.() as MediaTrackSettings | undefined;
  return !!settings?.displaySurface;
}

/** Gleiche Tracks (nach ID) → kein neues MediaStream-Objekt (verhindert Video-Flackern). */
export function streamsHaveSameTrackIds(
  a: MediaStream | null | undefined,
  b: MediaStream | null | undefined,
): boolean {
  if (!a || !b) return a === b;
  const key = (s: MediaStream) =>
    s
      .getTracks()
      .map((t) => t.id)
      .sort()
      .join(",");
  return key(a) === key(b);
}

const screenShareViewCache = new WeakMap<
  MediaStream,
  { videoTrackId: string; view: MediaStream }
>();

/** Für die Bildschirm-Ansicht: Bildschirm-Track bevorzugen, sonst aktives Video. */
export function getStreamForScreenShare(
  stream: MediaStream | null,
): MediaStream | null {
  if (!stream) return null;

  const videos = stream
    .getVideoTracks()
    .filter((t) => t.readyState !== "ended");
  if (videos.length === 0) return stream;

  const screen =
    videos.find(isScreenShareTrack) ??
    videos.find((t) => t.enabled) ??
    videos[videos.length - 1];

  const cached = screenShareViewCache.get(stream);
  if (cached?.videoTrackId === screen.id) return cached.view;

  const audio = stream.getAudioTracks().filter((t) => t.readyState !== "ended");
  const view = new MediaStream([...audio, screen]);
  screenShareViewCache.set(stream, { videoTrackId: screen.id, view });
  return view;
}

/** Eingehenden Track in Remote-Stream mergen (pro Kind nur ein Track). */
export function mergeRemoteTracks(
  existing: MediaStream | undefined,
  incoming: MediaStreamTrack[],
): MediaStream {
  let tracks = (existing?.getTracks() ?? []).filter(
    (t) => t.readyState !== "ended",
  );

  for (const track of incoming) {
    if (track.readyState === "ended") continue;
    if (track.kind === "video") {
      const videos = [
        ...tracks.filter((t) => t.kind === "video"),
        track,
      ];
      const preferred =
        videos.find(isScreenShareTrack) ??
        videos.find((t) => t.enabled) ??
        videos[videos.length - 1];
      tracks = tracks.filter((t) => t.kind !== "video");
      tracks.push(preferred);
      continue;
    }
    tracks = tracks.filter((t) => t.kind !== track.kind);
    tracks.push(track);
  }

  return new MediaStream(tracks);
}
