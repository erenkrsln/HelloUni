"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, X, Clock, AlertCircle, Check, Send } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface ChatLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
}

export function ChatLocationModal({
  isOpen,
  onClose,
  conversationId,
  senderId,
}: ChatLocationModalProps) {
  const [coordinates, setCoordinates] = useState({ lat: 52.52, lng: 13.405 });
  const [address, setAddress] = useState("Wird geladen...");
  const [isLocating, setIsLocating] = useState(false);
  const [hasGpsPermission, setHasGpsPermission] = useState<boolean | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [isManualSelection, setIsManualSelection] = useState(false);

  const [liveDuration, setLiveDuration] = useState<number>(3600000);
  const [liveComment, setLiveComment] = useState("");
  const [isSending, setIsSending] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const sendMessage = useMutation(api.mutations.sendMessage);

  // Load Leaflet dynamically
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    if ((window as any).L) { setLeafletLoaded(true); return; }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    document.body.appendChild(script);
  }, [isOpen]);

  // Auto-request location on open
  useEffect(() => {
    if (isOpen) requestLocation();
  }, [isOpen]);

  // Init map
  useEffect(() => {
    if (!isOpen || !leafletLoaded || !mapContainerRef.current || mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([coordinates.lat, coordinates.lng], 15);
    mapRef.current = map;

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    const icon = L.divIcon({
      className: "custom-leaflet-marker",
      html: `
        <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center">
          <div style="position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(208,137,69,0.2);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>
          <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center">
            <div style="width:14px;height:14px;border-radius:50%;background:#D08945;display:flex;align-items:center;justify-content:center">
              <svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='white' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z'/><circle cx='12' cy='10' r='3' fill='#D08945'/></svg>
            </div>
          </div>
        </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([coordinates.lat, coordinates.lng], { draggable: true, icon }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const p = marker.getLatLng();
      setCoordinates({ lat: p.lat, lng: p.lng });
      setIsManualSelection(true);
    });

    map.on("click", (e: any) => {
      marker.setLatLng([e.latlng.lat, e.latlng.lng]);
      setCoordinates({ lat: e.latlng.lat, lng: e.latlng.lng });
      setIsManualSelection(true);
    });

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [isOpen, leafletLoaded]);

  const requestLocation = () => {
    setGpsError(null);
    setIsLocating(true);
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError("GPS wird von diesem Browser nicht unterstützt.");
      setIsLocating(false);
      setHasGpsPermission(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoordinates({ lat, lng });
        setIsLocating(false);
        setHasGpsPermission(true);
        setIsManualSelection(false);
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Standortberechtigung verweigert. Bitte in den Browsereinstellungen aktivieren.");
          setHasGpsPermission(false);
        } else {
          setGpsError("Standort konnte nicht ermittelt werden.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Reverse geocoding
  useEffect(() => {
    if (!isOpen) return;
    const fetchAddress = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lng}&zoom=18&addressdetails=1`,
          { headers: { "Accept-Language": "de" } }
        );
        if (res.ok) {
          const data = await res.json();
          const road = data.address?.road || "";
          const house = data.address?.house_number || "";
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          const name = data.name || "";
          if (road) {
            setAddress(`${road}${house ? " " + house : ""}${city ? ", " + city : ""}`);
          } else if (name) {
            setAddress(name);
          } else {
            setAddress(data.display_name?.split(",").slice(0, 2).join(",") || "Ausgewählter Ort");
          }
        }
      } catch {
        setAddress(`${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`);
      }
    };
    const t = setTimeout(fetchAddress, 600);
    return () => clearTimeout(t);
  }, [coordinates, isOpen]);

  const handleSendStatic = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      await sendMessage({
        conversationId,
        senderId,
        content: `📍 ${address}`,
        type: "location",
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        address,
      });
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendLive = async () => {
    if (isSending) return;
    setIsSending(true);
    const now = Date.now();
    try {
      await sendMessage({
        conversationId,
        senderId,
        content: liveComment.trim() || "Teilt Live-Standort",
        type: "live_location",
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        address,
        liveDuration,
        liveExpiresAt: now + liveDuration,
        isLiveActive: true,
      });
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setLiveDuration(3600000);
    setLiveComment("");
    setIsManualSelection(false);
    setGpsError(null);
    onClose();
  };

  if (!isOpen) return null;

  const DURATIONS = [
    { label: "15 Minuten", value: 15 * 60 * 1000 },
    { label: "1 Stunde", value: 60 * 60 * 1000 },
    { label: "8 Stunden", value: 8 * 60 * 60 * 1000 },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      {/* Modal — WhatsApp style: bottom sheet on mobile, centered on desktop */}
      <div
        className="fixed bottom-0 md:bottom-auto md:top-1/2 left-1/2 -translate-x-1/2 md:-translate-y-1/2
                   z-[90] w-full md:w-[420px] bg-background
                   rounded-t-[28px] md:rounded-[24px]
                   shadow-2xl flex flex-col overflow-hidden
                   h-[90vh] md:h-[680px]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* ── Drag handle (mobile only) ── */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0 md:hidden">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>

        {/* ── Header ── */}
        <div className="flex items-center px-2 py-2 flex-shrink-0 bg-background">
          <button
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="flex-1 text-center font-semibold text-base text-foreground -ml-9">
            Standort senden
          </h2>
        </div>

        {/* ── GPS error banner ── */}
        {gpsError && (
          <div className="mx-3 mb-1 flex-shrink-0 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex gap-2 items-center text-amber-800 text-xs">
            <AlertCircle size={14} className="flex-shrink-0 text-amber-500" />
            <span className="flex-1">{gpsError}</span>
            <button onClick={requestLocation} className="font-bold underline whitespace-nowrap">
              Nochmal
            </button>
          </div>
        )}

        {/* ── Map (fills ~55% of height) ── */}
        <div className="relative flex-shrink-0 w-full h-[55%] md:h-[52%] bg-accent">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Recenter FAB */}
          <button
            onClick={requestLocation}
            disabled={isLocating}
            className="absolute bottom-3 right-3 z-20 w-10 h-10 rounded-full bg-background shadow-md border border-border flex items-center justify-center hover:bg-muted transition-all"
          >
            <Navigation size={18} className={isLocating ? "animate-spin text-[#D08945]" : "text-muted-foreground"} />
          </button>

          {/* Selected address chip on map */}
          <div className="absolute bottom-3 left-3 right-14 z-20 bg-background/95 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-md flex items-center gap-2 max-w-[75%]">
            <MapPin size={13} className="text-[#D08945] flex-shrink-0" />
            <p className="text-xs font-medium text-foreground truncate">{address}</p>
          </div>
        </div>

        {/* ── Scrollable options below map ── */}
        <div className="flex-1 overflow-y-auto bg-background">

          {/* — Static location row — */}
          <button
            onClick={handleSendStatic}
            disabled={isSending}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-muted active:bg-muted transition-colors text-left border-b border-border disabled:opacity-60"
          >
            <div className="w-11 h-11 rounded-full bg-[#D08945]/10 flex items-center justify-center flex-shrink-0">
              <MapPin size={22} className="text-[#D08945]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-foreground">Aktuellen Standort senden</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{address}</p>
            </div>
          </button>

          {/* — Live-Standort section — */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide mb-3">
              Live-Standort teilen
            </p>

            {/* Duration pills */}
            <div className="flex gap-2 mb-4">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setLiveDuration(d.value)}
                  className={`flex-1 py-2.5 rounded-full text-[13px] font-semibold transition-all border ${
                    liveDuration === d.value
                      ? "bg-[#D08945] text-white border-[#D08945] shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-[#D08945]/50"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Comment row — input + send button side by side */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={liveComment}
                onChange={(e) => setLiveComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !isSending) handleSendLive(); }}
                placeholder="Kommentar hinzufügen"
                className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm text-foreground placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#D08945]/30 transition-all"
              />
              <button
                onClick={handleSendLive}
                disabled={isSending}
                className="w-11 h-11 rounded-full bg-[#D08945] flex items-center justify-center flex-shrink-0 shadow-md hover:bg-[#B06F30] active:scale-95 transition-all disabled:opacity-50"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={16} className="text-white ml-0.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
