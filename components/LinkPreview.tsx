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
        <div className="flex items-center gap-3 p-2.5 border border-gray-100 rounded-xl bg-gray-50/50 animate-pulse w-full">
          <div className="w-20 bg-gray-200 rounded-lg flex-shrink-0" style={{ aspectRatio: "1.91 / 1" }} />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-200 rounded w-3/4" />
            <div className="h-2.5 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div className="h-2.5 bg-gray-200 rounded w-2/3 animate-pulse mt-1.5 ml-1" />
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
        className="flex items-center gap-3 p-2.5 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-100/70 transition-all w-full cursor-pointer select-none text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {hasImage ? (
          <div className="w-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 bg-white" style={{ aspectRatio: "1.91 / 1" }}>
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
          <div className="w-20 bg-gray-100 border border-gray-200 flex items-center justify-center rounded-lg text-gray-400 flex-shrink-0" style={{ aspectRatio: "1.91 / 1" }}>
            <ExternalLink size={16} />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">
            {data?.title || displayHost}
          </h4>
          <span className="text-[10px] text-gray-400 mt-1 truncate">
            {displayHost}
          </span>
        </div>
      </a>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className=" text-[#D08945] underline break-all px-1 mt-1 block w-fit"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    </div>
  );
}

export function ChatFilesModalLinkPreview({ url }: { url: string }) {
  const { data, loading } = useLinkPreview(url);

  if (loading) {
    return (
      <div className="w-16 h-auto rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 mr-3 flex-shrink-0 animate-pulse" style={{ aspectRatio: "1.91 / 1" }}>
        <ExternalLink size={16} />
      </div>
    );
  }

  const hasImage = !!data?.image;

  return (
    <div className="w-16 h-auto rounded-lg overflow-hidden mr-3 flex-shrink-0 border border-gray-200 bg-gray-50 flex items-center justify-center" style={{ aspectRatio: "1.91 / 1" }}>
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
        <ExternalLink size={16} className="text-gray-400" />
      )}
    </div>
  );
}
