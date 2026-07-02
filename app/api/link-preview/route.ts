import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    let parsedUrl = targetUrl;
    if (!/^https?:\/\//i.test(targetUrl)) {
      parsedUrl = "https://" + targetUrl;
    }

    const urlObj = new URL(parsedUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout

    const response = await fetch(urlObj.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ url: targetUrl, image: null, title: null });
    }

    const html = await response.text();

    const getMetaTag = (propertyOrName: string): string | null => {
      // property/name attribute first
      const propRegex = new RegExp(
        `<meta[^>]+(?:property|name)=["']${propertyOrName}["'][^>]*content=["']([^"']+)["']`,
        "i"
      );
      let match = html.match(propRegex);
      if (match) return match[1];

      // content attribute first
      const contentRegex = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${propertyOrName}["']`,
        "i"
      );
      match = html.match(contentRegex);
      if (match) return match[1];

      return null;
    };

    let image = getMetaTag("og:image") || getMetaTag("twitter:image");

    if (image && !image.startsWith("http")) {
      if (image.startsWith("//")) {
        image = `https:${image}`;
      } else if (image.startsWith("/")) {
        image = `${urlObj.origin}${image}`;
      } else {
        const basePath = urlObj.pathname.endsWith("/")
          ? urlObj.pathname
          : urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf("/") + 1);
        image = `${urlObj.origin}${basePath}${image}`;
      }
    }

    let title = getMetaTag("og:title") || getMetaTag("twitter:title");
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
    }

    if (title) {
      title = title
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&ndash;/g, "–")
        .replace(/&mdash;/g, "—")
        .replace(/\s+/g, " ");
    }

    return NextResponse.json(
      {
        url: targetUrl,
        image: image || null,
        title: title || null,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400", // Cache for 24 hours
        },
      }
    );
  } catch (err) {
    console.error("Error fetching link preview for:", targetUrl, err);
    return NextResponse.json({ url: targetUrl, image: null, title: null });
  }
}
