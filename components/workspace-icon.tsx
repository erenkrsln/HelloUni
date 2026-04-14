"use client";

interface WorkspaceIconProps {
  isActive?: boolean;
  size?: number;
  color?: string;
}

export function WorkspaceIcon({ isActive = false, size = 32, color = "#000000" }: WorkspaceIconProps) {
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
      <rect 
        x="3" 
        y="3" 
        width="7" 
        height="7" 
        rx="1.5" 
        fill={isActive ? color : "none"} 
        stroke={color} 
        strokeWidth={isActive ? 0 : 2} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <rect 
        x="14" 
        y="3" 
        width="7" 
        height="7" 
        rx="1.5" 
        fill={isActive ? color : "none"} 
        stroke={color} 
        strokeWidth={isActive ? 0 : 2} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <rect 
        x="14" 
        y="14" 
        width="7" 
        height="7" 
        rx="1.5" 
        fill={isActive ? color : "none"} 
        stroke={color} 
        strokeWidth={isActive ? 0 : 2} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <rect 
        x="3" 
        y="14" 
        width="7" 
        height="7" 
        rx="1.5" 
        fill={isActive ? color : "none"} 
        stroke={color} 
        strokeWidth={isActive ? 0 : 2} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}
