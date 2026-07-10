import { NextRequest, NextResponse } from "next/server";
import { storeMockFile } from "@/lib/mock-file-store";

export async function POST(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key") || `mock_${Date.now()}`;
    const contentType =
      request.headers.get("Content-Type") || "application/octet-stream";

    // Get file name from key (key format: uploads/{timestamp}-{filename})
    const fileName =
      key.split("/").pop()?.split("-").slice(1).join("-") || "file";

    // Read file bytes
    const buffer = Buffer.from(await request.arrayBuffer());

    const storageId = `mock_storage_${key}_${Date.now()}`;

    // Store the file in memory
    storeMockFile(storageId, buffer, contentType, fileName);

    return NextResponse.json({ storageId });
  } catch (err) {
    console.error("Mock storage error:", err);
    return NextResponse.json(
      { error: "Mock storage failure" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  // Simple informational response for debugging
  return NextResponse.json({
    ok: true,
    info: "Mock storage endpoint. POST file binary to get a storageId.",
  });
}
