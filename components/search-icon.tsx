"use client";

interface SearchIconProps {
  isActive?: boolean;
  size?: number;
  color?: string;
}

export function SearchIcon({ isActive = false, size = 32, color = "#000000" }: SearchIconProps) {
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
      {/* Circle outline - always visible */}
      <circle
        cx="11"
        cy="11"
        r="7"
        fill="none"
        stroke={color}
        strokeWidth={isActive ? 2.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Handle line */}
      <line
        x1="16"
        y1="16"
        x2="21"
        y2="21"
        stroke={color}
        strokeWidth={isActive ? 2.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

