"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Share, PlusSquare, MoreVertical, Download, Monitor, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";

type Platform = "ios_safari" | "ios_other" | "android_chrome" | "android_other" | "desktop_chrome" | "desktop_other" | "unknown";

export default function InstallInstructionsPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isChrome = /Chrome/.test(ua);
    
    let detected: Platform = "unknown";
    
    if (isIOS) {
      detected = isSafari ? "ios_safari" : "ios_other";
    } else if (isAndroid) {
      detected = isChrome ? "android_chrome" : "android_other";
    } else {
      // Desktop
      detected = isChrome ? "desktop_chrome" : "desktop_other";
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
          <div className="relative">
            <select
              value={activePlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as Platform)}
              className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-[#D08945]"
            >
              <option value="ios_safari">iPhone / iPad (Safari)</option>
              <option value="android_chrome">Android (Chrome)</option>
              <option value="desktop_chrome">Computer (Chrome / Edge)</option>
              <option value="ios_other">iPhone (Andere Browser)</option>
              <option value="android_other">Android (Andere Browser)</option>
              <option value="desktop_other">Computer (Andere Browser)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          {activePlatform === "ios_safari" && (
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

          {activePlatform === "android_chrome" && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <MoreVertical className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium">1. Menü öffnen</p>
                  <p className="text-sm text-gray-600">Tippe auf das Menü-Symbol (drei Punkte) in der oberen rechten Ecke.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Download className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium">2. App installieren</p>
                  <p className="text-sm text-gray-600">Wähle "App installieren" oder "Zum Startbildschirm hinzufügen" aus der Liste.</p>
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

          {activePlatform === "desktop_chrome" && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shadow-sm border border-gray-200 mt-1">
                  <Monitor className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium">1. Installieren-Symbol suchen</p>
                  <p className="text-sm text-gray-600">Klicke in der Adressleiste deines Browsers ganz rechts auf das Installieren-Symbol (Monitor mit Pfeil nach unten).</p>
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

          {(activePlatform === "ios_other" || activePlatform === "android_other") && (
            <div className="text-center py-4">
              <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="font-medium mb-2">Browser nicht optimal</p>
              <p className="text-sm text-gray-600">
                Für die beste Erfahrung und um die App auf deinem Startbildschirm zu installieren, 
                öffne HelloUni bitte in <strong>{activePlatform === "ios_other" ? "Safari" : "Google Chrome"}</strong>.
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
