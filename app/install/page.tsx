"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Share, PlusSquare, MoreVertical, Monitor, Smartphone, ChevronDown, X, MoreHorizontal, Check, Menu, CirclePlus, MonitorDown, FileDown, Grid2x2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Platform = "desktop_chrome" | "desktop_safari" | "desktop_edge" | "desktop_other" | "mobile_chrome" | "mobile_safari" | "mobile_samsung" | "mobile_other" | "unknown";

const PLATFORM_LABELS: Record<string, string> = {
  mobile_safari: "Safari (iOS)",
  mobile_chrome: "Chrome (mobil)",
  mobile_samsung: "Samsung Internet (mobil)",
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

  if (!isMounted) return null;

  const activePlatform = selectedPlatform || platform;

  return (
    <div className="min-h-screen bg-white max-w-[428px] md:max-w-2xl mx-auto flex flex-col pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 h-16 flex items-center justify-between pt-safe-top">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
        <h1 className="text-lg font-bold">Installationsguide</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-6 py-8 overflow-y-auto">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-20 h-20   flex items-center justify-center mb-4">
            <img src="/logo2.svg" alt="HelloUni Logo" className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold mb-2">HelloUni als App</h2>
          <p className="text-gray-600 text-m">
            HelloUni ist eine Progressive Web App (PWA). Du kannst die Webseite direkt aus deinem Browser installieren, ohne einen App Store zu besuchen.

            Nach der Installation funktioniert HelloUni wie eine ganz normale App.
          </p>
          <p className="text-gray-600 text-m mt-3">
            Unten findest du eine Anleitung wie du HelloUni auf deinem Gerät installierst.
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
                  <Share className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tippe auf das Teilen-Symbol in der Menüleiste</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <PlusSquare className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Scrolle nach unten und wähle "Zum Home-Bildschirm"</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Check className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vergib einen Namen, stelle sicher, dass "Als Web-App öffnen" aktiviert ist und tippe dann auf "Hinzufügen"</p>
                </div>
              </div>
            </div>
          )}

          {activePlatform === "mobile_chrome" && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <MoreVertical className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tippe auf das Menü-Symbol (drei Punkte) in der Browserleiste</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <MonitorDown className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Wähle "Zum Startbildschirm hinzufügen" und tippe auf "Installieren"</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Check className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bestätige die Installation im Popup-Fenster mit Tippen auf "Installieren"</p>
                </div>
              </div>
            </div>
          )}

          {activePlatform === "mobile_samsung" && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Menu className="w-5 h-5 text-gray-700" />
                </div>
                <div>

                  <p className="text-sm text-gray-600">Tippe auf das Menü-Symbol (drei Striche) in der Browserleiste</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <CirclePlus className="w-5 h-5 text-gray-700" />
                </div>
                <div>

                  <p className="text-sm text-gray-600">Wähle "Hinzufügen zu" und tippe auf "Startbildschirm"</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Check className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bestätige im Pop-up-Fenster mit Tippen auf "Hinzufügen"</p>
                </div>
              </div>
            </div>
          )}

          {activePlatform === "desktop_chrome" && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <MoreVertical className="w-5 h-5 text-gray-700" />
                </div>
                <div>

                  <p className="text-sm text-gray-600">Klicke auf das Menü-Symbol (drei Punkte) ganz rechts neben der Adressleiste</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <FileDown className="w-5 h-5 text-gray-700" />
                </div>
                <div>

                  <p className="text-sm text-gray-600">Navigiere zum Punkt "Streamen, speichern und teilen" und wähle "Seite als App installieren"</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Check className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vergib einen Namen und bestätige mit "Installieren". Die App erscheint nun auf deinem Desktop</p>
                </div>
              </div>
            </div>
          )}

          {activePlatform === "desktop_edge" && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <MoreHorizontal className="w-5 h-5 text-gray-700" />
                </div>
                <div>

                  <p className="text-sm text-gray-600">Klicke auf das Menü-Symbol (drei Punkte) ganz rechts neben der Adressleiste</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Grid2x2 className="w-5 h-5 text-gray-700" />
                </div>
                <div>

                  <p className="text-sm text-gray-600">Navigiere zum Punkt "Weitere Tools", wähle "Apps" und klicke "Diese Site als eine App öffnen"</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Check className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vergib einen Namen und bestätige mit "Installieren". Die App erscheint nun auf deinem Desktop</p>
                </div>
              </div>
            </div>
          )}

          {activePlatform === "desktop_safari" && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Share className="w-5 h-5 text-gray-700" />
                </div>
                <div>

                  <p className="text-sm text-gray-600">Klicke oben rechts auf das Teilen-Symbol (Viereck mit Pfeil)</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Monitor className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Wähle "Zum Dock hinzufügen"</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Check className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vergib einen Namen und bestätige mit "Hinzufügen"</p>
                </div>
              </div>
            </div>
          )}

          {activePlatform === "mobile_other" && (
            <div className="text-center py-4">
              <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="font-medium mb-2">Browser nicht optimal</p>
              <p className="text-sm text-gray-600 mb-2">
                Für die beste Erfahrung mit HelloUni
                nutze bitte <strong>Google Chrome</strong> oder <strong>Safari</strong> (iOS). </p><p className="text-sm text-gray-600">
                Falls du bei deinem momentan genutzten Browser bleiben möchtest, suche nach <strong>"PWA Installation + deinem verwendeten Browser"</strong>, um zu prüfen, ob und wie dieser die Installation von Progressive Web Apps unterstützt.
              </p>
            </div>
          )}

          {activePlatform === "desktop_other" && (
            <div className="text-center py-4">
              <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="font-medium mb-2">Browser nicht optimal</p>
              <p className="text-sm text-gray-600 mb-2">
                Für die beste Erfahrung mit HelloUni
                nutze bitte <strong>Google Chrome</strong> oder <strong>Safari</strong>. </p><p className="text-sm text-gray-600">
                Falls du bei deinem momentan genutzten Browser bleiben möchtest, suche nach <strong>"PWA Installation + deinem verwendeten Browser"</strong>, um zu prüfen, ob und wie dieser die Installation von Progressive Web Apps unterstützt.
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
