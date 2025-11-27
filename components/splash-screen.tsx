"use client";

import { LogoMark } from "./logo";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="h-16 w-16 animate-pulse" />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-full animate-[loading_1.5s_ease-in-out_infinite] bg-[var(--brand)]" style={{
            animation: "loading 1.5s ease-in-out infinite"
          }} />
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}} />
    </div>
  );
}

