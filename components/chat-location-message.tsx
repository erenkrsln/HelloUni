"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MapPin, Navigation } from "lucide-react";

interface ChatLocationMessageProps {
  messageId: Id<"messages">;
  senderName: string;
  isMe: boolean;
  currentUserId: Id<"users">;
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function ChatLocationMessage({ messageId, senderName, isMe, currentUserId }: ChatLocationMessageProps) {
  const message = useQuery(api.queries.getActiveLiveLocation, { messageId });
  const stopLiveLocation = useMutation(api.mutations.stopLiveLocation);

  const [timeLeftText, setTimeLeftText] = useState("");
  const [distanceText, setDistanceText] = useState<string | null>(null);

  // Countdown
  useEffect(() => {
    if (!message?.isLiveActive || !message.liveExpiresAt) return;
    const tick = () => {
      const rem = message.liveExpiresAt! - Date.now();
      if (rem <= 0) { setTimeLeftText("Beendet"); return; }
      const mins = Math.ceil(rem / 60000);
      setTimeLeftText(mins < 60 ? `Noch ${mins} Min.` : `Noch ${Math.floor(mins / 60)} Std. ${mins % 60} Min.`);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [message]);

  // Distance
  useEffect(() => {
    if (!message?.isLiveActive || !navigator.geolocation) return;
    const get = () =>
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (message.latitude === undefined || message.longitude === undefined) return;
          const d = calcDistance(p.coords.latitude, p.coords.longitude, message.latitude, message.longitude);
          setDistanceText(d < 0.1 ? "< 100 m entfernt" : d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 15000 }
      );
    get();
    const id = setInterval(get, 20000);
    return () => clearInterval(id);
  }, [message]);

  if (!message) return <div className="text-xs text-gray-400 italic py-1">Standort wird geladen…</div>;

  const { latitude, longitude, address, isLiveActive } = message;
  if (latitude === undefined || longitude === undefined) return null;

  const isLive = message.liveExpiresAt !== undefined;

  const openMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    const apple = /Mac|iPhone|iPad/.test(navigator.userAgent);
    window.open(
      apple ? `maps://?q=${latitude},${longitude}` : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      "_blank"
    );
  };

  const stopSharing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Live-Standort teilen beenden?")) return;
    await stopLiveLocation({ messageId, userId: currentUserId }).catch(console.error);
  };

  // Tight bounding box for the iframe
  const d = 0.001;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - d * 2}%2C${latitude - d}%2C${longitude + d * 2}%2C${latitude + d}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    /* WhatsApp-style: compact card, ~220px wide, map + small footer */
    <div
      className="overflow-hidden rounded-xl select-none cursor-pointer active:opacity-90 transition-opacity"
      style={{ width: 220 }}
      onClick={openMaps}
    >
      {/* Map thumbnail — iframe overflows container so OSM footer is always clipped */}
      <div className="relative w-full overflow-hidden" style={{ height: 120 }}>
        <iframe
          src={mapUrl}
          className="w-full border-0 absolute top-0 left-0"
          scrolling="no"
          style={{ height: 220, pointerEvents: "none" }}
        />
        {/* Solid overlay strip at bottom to mask any remaining attribution text */}
        <div className="absolute bottom-0 left-0 right-0 h-5 z-10" style={{ background: "inherit" }} />
        {/* click catcher */}
        <div className="absolute inset-0 z-20" />

        {/* Live badge */}
        {isLive && isLiveActive && (
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-[#D08945] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            Live
          </div>
        )}
      </div>

      {/* Footer row */}
      <div className={`flex items-center gap-2 px-2.5 py-2 ${isMe ? "bg-[#FFE4C8]" : "bg-white border border-gray-100"}`}>
        <MapPin size={14} className={`flex-shrink-0 ${isLive && isLiveActive ? "text-[#D08945]" : "text-gray-400"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-gray-900 leading-tight truncate">
            {isLive ? (isLiveActive ? `${senderName}s Standort` : "Live-Standort beendet") : "Standort"}
          </p>
          {(distanceText || timeLeftText) ? (
            <p className="text-[10px] text-gray-500 leading-tight truncate">
              {distanceText ?? timeLeftText}
            </p>
          ) : (
            <p className="text-[10px] text-gray-500 leading-tight truncate">
              {address || "Karte öffnen"}
            </p>
          )}
        </div>
        <Navigation size={13} className="flex-shrink-0 text-[#D08945]" />
      </div>

      {/* "Teilen beenden" — only sender sees it */}
      {isLive && isLiveActive && isMe && (
        <button
          onClick={stopSharing}
          className={`w-full text-center text-[11px] font-bold py-1.5 border-t ${
            isMe ? "bg-[#D08945]/10 text-[#D08945] border-[#D08945]/20" : "bg-gray-50 text-gray-500 border-gray-200"
          } hover:opacity-80 transition-opacity`}
        >
          Teilen beenden
        </button>
      )}
    </div>
  );
}
