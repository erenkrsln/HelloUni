import { EU_DEV_ICE_SERVERS, isEuDevPreset } from "./icePresets";

/** Öffentliche STUN-Server (Fallback, wenn NEXT_PUBLIC_STUN_URLS leer ist). */
const DEFAULT_STUN_URLS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
  "stun:stun2.l.google.com:19302",
];

function parseList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ensureStunUrl(url: string): string {
  if (/^stuns?:/i.test(url)) return url;
  return `stun:${url.replace(/^\/\//, "")}`;
}

function ensureTurnUrl(url: string): string {
  if (/^turns?:/i.test(url)) return url;
  return `turn:${url.replace(/^\/\//, "")}`;
}

/**
 * Ein TURN-Host (z. B. turn:example.com:3478) → UDP + TCP (+ optional TLS).
 * Wenn mehrere URLs in NEXT_PUBLIC_TURN_URL stehen, werden sie unverändert genutzt.
 */
function expandTurnUrls(urls: string[]): string | string[] {
  if (urls.length > 1) return urls.map(ensureTurnUrl);

  const single = ensureTurnUrl(urls[0]);
  const match = single.match(/^(turns?):([^:]+):(\d+)(\?.*)?$/i);
  if (!match) return single;

  const [, scheme, host, port, query = ""] = match;
  const base = `${scheme}:${host}:${port}`;
  const q = query || "";

  if (scheme.toLowerCase() === "turns") {
    return [`${base}${q || "?transport=tcp"}`];
  }

  return [
    `${base}${q || "?transport=udp"}`,
    `${base}?transport=tcp`,
    `turns:${host}:5349?transport=tcp`,
  ];
}

/** STUN-Liste aus NEXT_PUBLIC_STUN_URLS oder Default. */
export function getStunIceServers(): RTCIceServer[] {
  const fromEnv = parseList(process.env.NEXT_PUBLIC_STUN_URLS);
  const urls = fromEnv.length > 0 ? fromEnv : DEFAULT_STUN_URLS;
  return urls.map((u) => ({ urls: ensureStunUrl(u) }));
}

/** TURN aus NEXT_PUBLIC_TURN_URL + User/Passwort (optional). */
export function getTurnIceServer(): RTCIceServer | null {
  const urls = parseList(process.env.NEXT_PUBLIC_TURN_URL);
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME?.trim();
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL?.trim();

  if (!urls.length || !username || !credential) return null;

  return {
    urls: expandTurnUrls(urls),
    username,
    credential,
  };
}

export function isTurnConfigured(): boolean {
  return getTurnIceServer() !== null;
}

/** Explizite Env-Variablen haben Vorrang vor Presets. */
function hasExplicitIceEnv(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_TURN_URL?.trim()) ||
    Boolean(process.env.NEXT_PUBLIC_STUN_URLS?.trim())
  );
}

/** STUN + optional TURN für RTCPeerConnection. */
export function buildIceServers(): RTCIceServer[] {
  if (hasExplicitIceEnv()) {
    const servers = [...getStunIceServers()];
    const turn = getTurnIceServer();
    if (turn) servers.push(turn);
    return servers;
  }

  const preset = process.env.NEXT_PUBLIC_ICE_PRESET;
  if (isEuDevPreset(preset)) {
    return [...EU_DEV_ICE_SERVERS];
  }

  const servers = [...getStunIceServers()];
  const turn = getTurnIceServer();
  if (turn) servers.push(turn);
  return servers;
}

export function getActiveIcePresetLabel(): string | null {
  if (hasExplicitIceEnv()) return null;
  const preset = process.env.NEXT_PUBLIC_ICE_PRESET?.trim();
  if (isEuDevPreset(preset)) return "eu-dev";
  return null;
}
