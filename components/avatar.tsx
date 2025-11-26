"use client";

import { useState } from "react";

interface AvatarProps {
  src?: string;
  alt: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ src, alt, fallback, size = "md", className = "" }: AvatarProps) {
  const [isLoading, setIsLoading] = useState(!!src);
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  const sizeClass = sizeClasses[size];

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] overflow-hidden ${sizeClass} ${className}`}
      >
        <span className="font-semibold">{fallback}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] overflow-hidden ${sizeClass} ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover transition-opacity ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        loading="eager"
        decoding="async"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}

