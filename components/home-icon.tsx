"use client";

interface HomeIconProps {
  isActive?: boolean;
  size?: number;
  color?: string;
}

export function HomeIcon({ isActive = false, size = 32, color = "#000000" }: HomeIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        willChange: "transform",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden"
      }}
    >
      <defs>
        <mask id="doorMask">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <rect x="10" y="15" width="4" height="6" fill="black" />
        </mask>
      </defs>

      {/* Haus-Outline (immer sichtbar) */}
      <path
        d="M 12 2.0996094 L 1 12 L 4 12 L 4 21 L 10 21 L 10 14 L 14 14 L 14 21 L 20 21 L 20 12 L 23 12 L 12 2.0996094 z"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Gefülltes Haus mit Tür-Ausschnitt, wenn aktiv */}
      {isActive && (
        <path
          d="M 12 2.0996094 L 1 12 L 4 12 L 4 21 L 10 21 L 10 14 L 14 14 L 14 21 L 20 21 L 20 12 L 23 12 L 12 2.0996094 z"
          fill={color}
          mask="url(#doorMask)"
        />
      )}
    </svg>
  );
}










