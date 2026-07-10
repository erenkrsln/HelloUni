import { NextRequest, NextResponse } from "next/server";
import { getMockFile } from "@/lib/mock-file-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  try {
    // Await params as per Next.js 16+ requirements
    const { slug } = await params;

    // Reconstruct the storage ID from the URL path
    const storageId = decodeURIComponent(slug.join("/"));

    const file = getMockFile(storageId);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Return the file with appropriate headers
    return new NextResponse(file.buffer as any, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${file.fileName}"`,
        "Cache-Control": "public, max-age=31536000", // 1 year (files are immutable)
      },
    });
  } catch (err) {
    console.error("Mock file retrieval error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve file" },
      { status: 500 },
    );
  }
}
