"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

interface PreviewData {
  url: string;
  image: string | null;
  title: string | null;
}

// Global Promise-level cache to deduplicate simultaneous/consecutive requests
const previewCache: Record<string, PreviewData | Promise<PreviewData>> = {};

export function useLinkPreview(url: string) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchPreview = async () => {
      // If we already have the resolved data in cache
      if (previewCache[url] && !(previewCache[url] instanceof Promise)) {
        if (isMounted) {
          setData(previewCache[url] as PreviewData);
          setLoading(false);
        }
        return;
      }

      // If there's an ongoing request
      if (previewCache[url] instanceof Promise) {
        try {
          const resolved = await previewCache[url];
          if (isMounted) {
            setData(resolved);
            setLoading(false);
          }
        } catch {
          if (isMounted) {
            setLoading(false);
          }
        }
        return;
      }

      // Create a new request
      const promise = (async () => {
        try {
          const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
          if (!res.ok) throw new Error("Failed to fetch");
          const json = await res.json();
          return {
            url,
            image: json.image || null,
            title: json.title || null,
          };
        } catch (e) {
          return { url, image: null, title: null };
        }
      })();

      previewCache[url] = promise;

      try {
        const resolved = await promise;
        previewCache[url] = resolved; // Update with resolved data
        if (isMounted) {
          setData(resolved);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [url]);

  return { data, loading };
}

export function MessageLinkPreview({ url }: { url: string }) {
  const { data, loading } = useLinkPreview(url);

  if (loading) {
    return (
      <div className="flex flex-col w-full max-w-sm mt-2">
        <div className="flex items-center gap-3 p-2.5 border border-border rounded-xl bg-muted/50 animate-pulse w-full">
          <div className="w-20 bg-muted rounded-lg flex-shrink-0" style={{ aspectRatio: "1.91 / 1" }} />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-muted rounded w-3/4" />
            <div className="h-2.5 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // Extract host name for cleaner link display
  let displayHost = url;
  try {
    displayHost = new URL(url).hostname;
  } catch (_) { }

  const hasImage = !!data?.image;

  return (
    <div className="flex flex-col w-full max-w-sm mt-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-2.5 border border-border rounded-xl bg-muted/50 hover:bg-accent/70 transition-all w-full cursor-pointer select-none text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {hasImage ? (
          <div className="w-20 rounded-lg overflow-hidden flex-shrink-0 border border-border bg-card" style={{ aspectRatio: "1.91 / 1" }}>
            <img
              src={data.image!}
              alt={data.title || "Preview"}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide failed image and allow fallback container to show if applicable
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="w-20 bg-muted border border-border flex items-center justify-center rounded-lg text-muted-foreground flex-shrink-0" style={{ aspectRatio: "1.91 / 1" }}>
            <ExternalLink size={16} />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
            {data?.title || displayHost}
          </h4>
          <span className="text-[10px] text-muted-foreground mt-1 truncate">
            {displayHost}
          </span>
        </div>
      </a>
    </div>
  );
}

export function ChatFilesModalLinkPreview({ url }: { url: string }) {
  const { data, loading } = useLinkPreview(url);

  if (loading) {
    return (
      <div className="w-16 h-auto rounded-lg bg-muted flex items-center justify-center text-muted-foreground mr-3 flex-shrink-0 animate-pulse" style={{ aspectRatio: "1.91 / 1" }}>
        <ExternalLink size={16} />
      </div>
    );
  }

  const hasImage = !!data?.image;

  return (
    <div className="w-16 h-auto rounded-lg overflow-hidden mr-3 flex-shrink-0 border border-border bg-muted flex items-center justify-center" style={{ aspectRatio: "1.91 / 1" }}>
      {hasImage ? (
        <img
          src={data.image!}
          alt="Preview"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      ) : (
        <ExternalLink size={16} className="text-muted-foreground" />
      )}
    </div>
  );
}
