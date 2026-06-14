"use client";

import { useCall } from "@/lib/hooks/useCall";
import { Phone, PhoneOff, Users, Video } from "lucide-react";

export function IncomingCallModal() {
  const { incomingCalls, acceptCall, rejectCall } = useCall();

  if (!incomingCalls || incomingCalls.length === 0) return null;

  // Immer nur den ersten eingehenden Call anzeigen
  const incoming = incomingCalls[0];
  const { call, caller } = incoming;
  const isVideo = call.type === "video";
  const isGroup = call.scope === "group";
  const callerName = caller?.name ?? "Jemand";
  const callerInitial = callerName.charAt(0).toUpperCase();

  const callKindLabel =
    isGroup && isVideo
      ? "Eingehender Gruppen-Videoanruf"
      : isGroup && !isVideo
        ? "Eingehender Gruppen-Sprachanruf"
        : isVideo
          ? "Eingehender Videoanruf"
          : "Eingehender Sprachanruf";

  const ariaCallSummary = isGroup
    ? `${callKindLabel} · Einladung von ${callerName}`
    : `Eingehender Anruf von ${callerName}`;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={ariaCallSummary}
        className="fixed z-[10001] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[340px] max-w-[calc(100vw-2rem)]
          rounded-3xl overflow-hidden
          bg-[#1a1209]"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}
      >
        {/* Gradient-Header */}
        <div
          className="h-1.5 w-full"
          style={{ background: "linear-gradient(90deg, #D08945, #F4CFAB, #8C531E)" }}
        />

        <div className="px-6 py-6 flex flex-col items-center gap-4">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-[#D08945]/50"
          >
            {caller?.image ? (
              <img
                src={caller.image}
                alt={callerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                style={{ background: "linear-gradient(135deg, #D08945, #8C531E)" }}
              >
                {callerInitial}
              </div>
            )}
          </div>

          {/* Gruppe: deutliche Kennzeichnung */}
          {isGroup && (
            <div
              className="flex items-center justify-center gap-1.5 rounded-full border border-[#D08945]/45 bg-[#D08945]/15 px-3 py-1"
              aria-hidden
            >
              <Users size={14} className="text-[#F4CFAB]" strokeWidth={2.25} />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4CFAB]">
                Gruppenanruf
              </span>
            </div>
          )}

          {/* Name + Call-Typ */}
          <div className="text-center">
            <p className="text-white font-semibold text-lg leading-tight">
              {callerName}
            </p>
            <p
              className={`mt-1 text-sm leading-snug ${
                isGroup ? "font-medium text-[#F4CFAB]/95" : "text-white/50"
              }`}
            >
              {callKindLabel}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-6 mt-2">
            {/* Ablehnen */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => rejectCall(call._id)}
                aria-label="Anruf ablehnen"
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600
                  active:scale-95 transition-all duration-150 shadow-lg
                  flex items-center justify-center
                  focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-[#1a1209]"
              >
                <PhoneOff size={26} className="text-white" />
              </button>
              <span className="text-white/50 text-xs">Ablehnen</span>
            </div>

            {/* Annehmen */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => acceptCall(call._id)}
                aria-label="Anruf annehmen"
                className="w-16 h-16 rounded-full
                  active:scale-95 transition-all duration-150 shadow-lg
                  flex items-center justify-center
                  focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:ring-offset-2 focus:ring-offset-[#1a1209]"
                style={{ background: "linear-gradient(135deg, #D08945, #8C531E)" }}
              >
                {isVideo
                  ? <Video size={26} className="text-white" />
                  : <Phone size={26} className="text-white" />
                }
              </button>
              <span className="text-white/50 text-xs">Annehmen</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
