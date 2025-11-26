"use client";

import { LogoMark } from "./logo";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#f6f7fb]">
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
          <LogoMark className="h-16 w-16 sm:h-20 sm:w-20 text-[#f97316]" />
        </div>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-200 sm:w-40">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-[#f97316] to-transparent animate-[loading_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
      <style jsx global>{`
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
      `}</style>
    </div>
  );
}

