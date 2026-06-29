"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, X, Navigation } from "lucide-react";

interface LocationDisplayProps {
  locationName: string;
  latitude?: number;
  longitude?: number;
}
function getShortAddress(fullName: string) {
  if (!fullName) return "";
  if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(fullName)) return fullName;

  const parts = fullName.split(",").map(p => p.trim());
  if (parts.length <= 2) return fullName;

  // Filter out zip codes and country names to get city/town/village and state/region
  const cleanParts = parts.filter(p => 
    !/^\d+$/.test(p) && 
    !/^(deutschland|germany|österreich|austria|schweiz|switzerland)$/i.test(p)
  );

  if (cleanParts.length >= 2) {
    const state = cleanParts[cleanParts.length - 1];
    let city = cleanParts[cleanParts.length - 2];
    
    // Strip leading postcode numbers from the city name if they exist (e.g. "80331 München" -> "München")
    city = city.replace(/^\d+\s+/, "");
    
    if (city.toLowerCase() === state.toLowerCase()) {
      return city;
    }
    
    return `${city}, ${state}`;
  }

  return fullName;
}

export function LocationDisplay({ locationName, latitude, longitude }: LocationDisplayProps) {
  const [showModal, setShowModal] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  const hasCoordinates = latitude !== undefined && longitude !== undefined;

  // Load Leaflet dynamically when coordinates are available
  useEffect(() => {
    if (typeof window === "undefined" || !hasCoordinates) return;
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
  }, [hasCoordinates]);

  // Initialize and display modal Leaflet map when modal is opened
  useEffect(() => {
    if (!showModal || !leafletLoaded || !mapContainer || latitude === undefined || longitude === undefined || mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapContainer, {
      zoomControl: false,
      attributionControl: false,
    }).setView([latitude, longitude], 15);
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
  }, [showModal, leafletLoaded, mapContainer, latitude, longitude]);

  const handleOpenMaps = () => {
    if (latitude === undefined || longitude === undefined) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let url: string;
    if (isIOS) {
      url = `maps://?q=${latitude},${longitude}`;
    } else if (isAndroid) {
      url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(locationName)})`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    }

    window.open(url, "_blank");
  };

  const shortAddress = getShortAddress(locationName);

  return (
    <>
      {/* Location text label */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (hasCoordinates) {
            setShowModal(true);
          }
        }}
        className="flex items-center gap-1.5 mb-3 text-sm text-gray-600 hover:text-[#D08945] transition-colors cursor-pointer group"
      >
        <MapPin className="w-4 h-4 text-[#D08945] flex-shrink-0" />
        <span className="truncate max-w-[280px] group-hover:underline">{shortAddress}</span>
      </button>

      {/* Location Modal */}
      {showModal && hasCoordinates && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Map Preview */}
            <div className="relative w-full h-48 bg-gray-100">
              <div ref={setMapContainer} className="w-full h-full" />
            </div>

            {/* Location Info */}
            <div className="p-4">
              <div className="flex items-start gap-2 mb-4">
                <MapPin className="w-5 h-5 text-[#D08945] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-800 leading-snug">{shortAddress}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleOpenMaps}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#D08945] via-[#DCA067] to-[#F4CFAB] text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all"
                >
                  <Navigation className="w-4 h-4" />
                  In Karten öffnen
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
