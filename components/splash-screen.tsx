"use client";

import { LogoMark } from "./logo";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="h-16 w-16 animate-pulse" />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-full bg-[var(--brand)]" style={{
            animation: "splash-loading 1.5s ease-in-out infinite"
          }} />
        </div>
      </div>
    </div>
  );
}

