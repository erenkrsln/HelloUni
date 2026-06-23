import type { RTCIceServer } from "./iceServersTypes";

/**
 * EU-orientiertes Dev-Preset (öffentliche Test-Dienste, kein Account).
 *
 * STUN: Nextcloud (DE) + adminForge (DE), Port 443 für Campus-Firewalls.
 * TURN: freeTURN.net (öffentlich „free“/„free“) — Relay-Standort laut Anbieter
 *       nicht in der EU; für striktes EU-Relay Uni-coturn oder fastTURN.eu.
 *
 * Aktivierung: NEXT_PUBLIC_ICE_PRESET=eu-dev in .env.local
 * Überschreibt das Preset: NEXT_PUBLIC_TURN_* oder NEXT_PUBLIC_STUN_URLS
 */
export const EU_DEV_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.nextcloud.com:443" },
  { urls: "stun:relay.adminforge.de:443" },
  { urls: "stun:relay2.adminforge.de:443" },
  {
    urls: [
      "turn:freeturn.net:3478",
      "turn:freeturn.net:3478?transport=tcp",
      "turns:freeturn.net:5349?transport=tcp",
    ],
    username: "free",
    credential: "free",
  },
];

export function isEuDevPreset(id: string | undefined): boolean {
  const n = id?.trim().toLowerCase();
  return n === "eu-dev" || n === "eu";
}
