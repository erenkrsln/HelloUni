"use client";

import { useState, useEffect, useRef } from "react";
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

  const latitude = message?.latitude;
  const longitude = message?.longitude;
  const address = message?.address;
  const isLiveActive = message?.isLiveActive;

  const [timeLeftText, setTimeLeftText] = useState("");
  const [distanceText, setDistanceText] = useState<string | null>(null);

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window === "undefined" || latitude === undefined || longitude === undefined) return;
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    document.body.appendChild(script);
  }, [latitude, longitude]);

  // Init map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || latitude === undefined || longitude === undefined || mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false
    }).setView([latitude, longitude], 15);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    const icon = L.divIcon({
      className: "custom-leaflet-marker",
      html: `
        <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center">
          <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(208,137,69,0.2);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>
          <div style="position:absolute;width:18px;height:18px;border-radius:50%;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center">
            <div style="width:10px;height:10px;border-radius:50%;background:#D08945;display:flex;align-items:center;justify-content:center">
              <svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='white' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z'/><circle cx='12' cy='10' r='3' fill='#D08945'/></svg>
            </div>
          </div>
        </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([latitude, longitude], { icon }).addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded, latitude, longitude]);

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

  return (
    /* WhatsApp-style: compact card, ~220px wide, map + small footer */
    <div
      className="overflow-hidden rounded-xl select-none cursor-pointer active:opacity-90 transition-opacity"
      style={{ width: 220 }}
      onClick={openMaps}
    >
      {/* Map thumbnail */}
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: 120 }}>
        <div ref={mapContainerRef} className="w-full h-full pointer-events-none" />
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
