import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key") || `mock_${Date.now()}`;

    // Consume the incoming body (file bytes). We won't write them to disk for the mock.
    // This keeps the same client behavior: client POSTs file binary and expects a storageId.
    await request.arrayBuffer();

    const storageId = `mock_storage_${key}_${Date.now()}`;

    return NextResponse.json({ storageId });
  } catch (err) {
    console.error("Mock storage error:", err);
    return NextResponse.json({ error: "Mock storage failure" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Simple informational response for debugging
  return NextResponse.json({ ok: true, info: "Mock storage endpoint. POST file binary to get a storageId." });
}
