"use client";

import { useState } from "react";

interface PostImageProps {
  src: string;
  alt: string;
  onClick?: () => void;
}

export function PostImage({ src, alt, onClick }: PostImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative mt-3 w-full overflow-hidden rounded-2xl border border-slate-200 p-2">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
        </div>
      )}
      {hasError ? (
        <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-500">
          <span className="text-sm">Bild konnte nicht geladen werden</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full rounded-xl cursor-pointer transition-opacity ${
            isLoading ? "opacity-0" : "opacity-100 hover:opacity-90"
          }`}
          onClick={onClick}
          loading="eager"
          decoding="async"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          style={{ minHeight: isLoading ? "200px" : "auto" }}
        />
      )}
    </div>
  );
}

