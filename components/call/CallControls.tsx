"use client";

import {
  Mic, MicOff,
  Video, VideoOff,
  Monitor, MonitorOff,
  PhoneOff,
} from "lucide-react";

interface CallControlsProps {
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharingActive: boolean;
  isVoiceOnly?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onLeave: () => void;
}

type ButtonVariant = "normal" | "off" | "active" | "danger";

function ControlButton({
  onClick,
  variant = "normal",
  disabled = false,
  label,
  children,
}: {
  onClick: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const variantClass: Record<ButtonVariant, string> = {
    normal:  "bg-background/15 hover:bg-background/28 text-white",
    off:     "bg-background/90 hover:bg-background text-foreground",
    active:  "bg-[#D08945]/80 hover:bg-[#D08945] text-white",
    danger:  "bg-red-500 hover:bg-red-600 text-white",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`
        w-14 h-14 rounded-full flex items-center justify-center
        transition-all duration-150 shadow-lg select-none
        outline-none focus:outline-none focus-visible:outline-none
        active:scale-90
        ${variantClass[variant]}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {children}
    </button>
  );
}

export function CallControls({
  micEnabled,
  cameraEnabled,
  screenSharingActive,
  isVoiceOnly = false,
  onToggleMic,
  onToggleCamera,
  onStartScreenShare,
  onStopScreenShare,
  onLeave,
}: CallControlsProps) {
  return (
    <div
      role="toolbar"
      aria-label="Anruf-Steuerung"
      className="flex items-center justify-center gap-3 px-6 py-4"
    >
      {/* Screen Sharing */}
      <ControlButton
        onClick={screenSharingActive ? onStopScreenShare : onStartScreenShare}
        variant={screenSharingActive ? "active" : "normal"}
        label={screenSharingActive ? "Bildschirmfreigabe beenden" : "Bildschirm teilen"}
      >
        {screenSharingActive ? <MonitorOff size={22} /> : <Monitor size={22} />}
      </ControlButton>

      {/* Kamera */}
      <ControlButton
        onClick={onToggleCamera}
        variant={cameraEnabled ? "normal" : "off"}
        label={cameraEnabled ? "Kamera ausschalten" : "Kamera einschalten"}
      >
        {cameraEnabled ? <Video size={22} /> : <VideoOff size={22} />}
      </ControlButton>

      {/* Mikrofon */}
      <ControlButton
        onClick={onToggleMic}
        variant={micEnabled ? "normal" : "off"}
        label={micEnabled ? "Mikrofon stumm schalten" : "Mikrofon aktivieren"}
      >
        {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
      </ControlButton>

      {/* Auflegen */}
      <ControlButton onClick={onLeave} variant="danger" label="Anruf beenden">
        <PhoneOff size={22} />
      </ControlButton>
    </div>
  );
}
