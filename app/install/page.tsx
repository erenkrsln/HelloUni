"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Share, PlusSquare, MoreVertical, Download, Monitor, Smartphone, ChevronDown, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Platform = "desktop_chrome" | "desktop_safari" | "desktop_edge" | "desktop_other" | "mobile_chrome" | "mobile_safari" | "mobile_samsung" | "mobile_other" | "unknown";

const PLATFORM_LABELS: Record<string, string> = {
  mobile_safari: "Safari (mobil)",
  mobile_chrome: "Chrome (mobil)",
  mobile_samsung: "Samsung Internet",
  mobile_other: "Andere Browser (mobil)",
  desktop_chrome: "Chrome (Desktop)",
  desktop_safari: "Safari (Desktop)",
  desktop_edge: "Edge (Desktop)",
  desktop_other: "Andere Browser (Desktop)",
};

export default function InstallInstructionsPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.platform-dropdown')) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    setIsMounted(true);
    const ua = window.navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
    const isEdge = /Edg/i.test(ua);
    const isSamsung = /SamsungBrowser/i.test(ua);
    const isChrome = (/Chrome/i.test(ua) || /CriOS/i.test(ua)) && !isEdge && !isSamsung;
    const isSafari = (/Safari/i.test(ua) || /^((?!chrome|android).)*safari/i.test(ua)) && !isChrome && !isEdge && !isSamsung;

    let detected: Platform = "unknown";

    if (isMobile) {
      if (isSafari) detected = "mobile_safari";
      else if (isChrome) detected = "mobile_chrome";
      else if (isSamsung) detected = "mobile_samsung";
      else detected = "mobile_other";
    } else {
      if (isChrome) detected = "desktop_chrome";
      else if (isEdge) detected = "desktop_edge";
      else if (isSafari) detected = "desktop_safari";
      else detected = "desktop_other";
    }

    setPlatform(detected);
    setSelectedPlatform(detected);
  }, []);

  if (!isMounted) return null; // Prevent hydration mismatch

  const activePlatform = selectedPlatform || platform;

  return (
    <div className="min-h-screen bg-white max-w-[428px] mx-auto flex flex-col pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 h-16 flex items-center justify-between pt-safe-top">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
        <h1 className="text-lg font-bold">App installieren</h1>
        <div className="w-10" /> {/* Placeholder for balance */}
      </header>

      <main className="flex-1 px-6 py-8 overflow-y-auto">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-gray-200">
            <img src="/logo2.svg" alt="HelloUni Logo" className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold mb-2">HelloUni als App</h2>
          <p className="text-gray-600 text-sm">
            Installiere HelloUni auf deinem Startbildschirm für das beste Erlebnis, schnellere Ladezeiten und einfachen Zugriff.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zeige Anleitung für:
          </label>
          <div className="w-full max-w-full platform-dropdown relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex h-12 w-full items-center justify-between rounded-full border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent"
            >
              <span className={activePlatform !== "unknown" ? "text-gray-900 truncate" : "text-gray-400 truncate"}>
                {PLATFORM_LABELS[activePlatform] || "Bitte wähle ein Gerät aus"}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute z-30 mt-2 w-full rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                <div className="py-1">
                  {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSelectedPlatform(value as Platform);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${activePlatform === value ? "bg-gray-50 text-[#D08945] font-medium" : "text-gray-700"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          {activePlatform === "mobile_safari" && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Share className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">1. Teilen tippen</p>
                  <p className="text-sm text-gray-600">Tippe auf das Teilen-Symbol in der unteren Menüleiste deines Browsers.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <PlusSquare className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium">2. Zum Home-Bildschirm</p>
                  <p className="text-sm text-gray-600">Scrolle nach unten und wähle "Zum Home-Bildschirm" (Add to Home Screen).</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <span className="font-bold text-blue-500 w-5 h-5 flex items-center justify-center text-sm">H</span>
                </div>
                <div>
                  <p className="font-medium">3. Hinzufügen</p>
                  <p className="text-sm text-gray-600">Tippe oben rechts auf "Hinzufügen", um die Installation abzuschließen.</p>
                </div>
              </div>
            </div>
          )}

          {(activePlatform === "mobile_chrome" || activePlatform === "mobile_samsung") && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <MoreVertical className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium">1. Menü öffnen</p>
                  <p className="text-sm text-gray-600">Tippe auf das Menü-Symbol (drei Punkte / Striche) in der Browserleiste.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Download className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium">2. App installieren</p>
                  <p className="text-sm text-gray-600">Wähle "App installieren", "Seite hinzufügen zu" oder "Zum Startbildschirm hinzufügen".</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Smartphone className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium">3. Bestätigen</p>
                  <p className="text-sm text-gray-600">Bestätige im Popup-Fenster mit "Installieren" oder "Hinzufügen".</p>
                </div>
              </div>
            </div>
          )}

          {(activePlatform === "desktop_chrome" || activePlatform === "desktop_edge") && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Monitor className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium">1. Installieren-Symbol suchen</p>
                  <p className="text-sm text-gray-600">Klicke in der Adressleiste deines Browsers ganz rechts auf das Installieren-Symbol (Monitor mit Pfeil nach unten oder App-Icon).</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Download className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium">2. App installieren</p>
                  <p className="text-sm text-gray-600">Klicke im Dialogfenster auf "Installieren", um HelloUni als Desktop-App hinzuzufügen.</p>
                </div>
              </div>
            </div>
          )}

          {activePlatform === "desktop_safari" && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Share className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">1. Teilen tippen</p>
                  <p className="text-sm text-gray-600">Klicke oben rechts auf das Teilen-Symbol (Viereck mit Pfeil) oder auf "Ablage" in der Menüleiste.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Monitor className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium">2. Zum Dock hinzufügen</p>
                  <p className="text-sm text-gray-600">Wähle "Zum Dock hinzufügen" um HelloUni als App auf deinem Mac zu installieren.</p>
                </div>
              </div>
            </div>
          )}

          {activePlatform === "mobile_other" && (
            <div className="text-center py-4">
              <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="font-medium mb-2">Browser nicht optimal</p>
              <p className="text-sm text-gray-600">
                Für die beste Erfahrung und um die App auf deinem Startbildschirm zu installieren,
                öffne HelloUni bitte in <strong>Safari</strong> (iOS) oder <strong>Google Chrome</strong> (Android).
              </p>
            </div>
          )}

          {activePlatform === "desktop_other" && (
            <div className="text-center py-4">
              <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="font-medium mb-2">Browser unterstützt keine Installation</p>
              <p className="text-sm text-gray-600">
                Dein aktueller Browser unterstützt die Installation von Web-Apps möglicherweise nicht direkt.
                Bitte nutze <strong>Google Chrome</strong> oder <strong>Microsoft Edge</strong> für die Desktop-Installation.
              </p>
            </div>
          )}

          {activePlatform === "unknown" && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">
                Bitte wähle oben dein Gerät aus, um die passende Installationsanleitung zu sehen.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
