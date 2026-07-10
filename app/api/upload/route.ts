import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

let r2Client: S3Client | null = null;
if (
  process.env.CLOUDFLARE_ACCOUNT_ID &&
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
) {
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  });
}

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    console.log(
      "/api/upload invoked - headers:",
      Object.fromEntries(Array.from(request.headers.entries()).slice(0, 5)),
    );
    let body: any;
    try {
      body = await request.json();
    } catch (err) {
      const txt = await request.text();
      console.warn(
        "Upload route received non-json body; falling back to defaults. Raw body:",
        txt?.slice?.(0, 200),
      );
      body = {
        filename: "unknown.bin",
        contentType: "application/octet-stream",
        fileSize: undefined,
      };
    }
    const { filename, contentType, fileSize } = body;

    if (!filename || !contentType)
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    if (!ALLOWED_TYPES.has(contentType))
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    if (fileSize && fileSize > MAX_FILE_SIZE)
      return NextResponse.json({ error: "File too large" }, { status: 400 });

    const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Use mock only when explicitly enabled via env var `USE_MOCK_UPLOAD=true`.
    const useMock = process.env.USE_MOCK_UPLOAD === "true";
    console.log(`/api/upload useMock=${useMock}`);
    if (useMock) {
      const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const uploadUrl = `/api/mock-storage?key=${encodeURIComponent(key)}`;
      const publicUrl = `/mock/${encodeURIComponent(key)}`;
      return NextResponse.json({
        uploadUrl,
        publicUrl,
        key,
        storageId: key,
        mock: true,
      });
    }

    if (!r2Client) {
      return NextResponse.json(
        { error: "Cloudflare R2 is not configured" },
        { status: 503 },
      );
    }

    const uploadUrl = await getSignedUrl(
      r2Client,
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
      }),
      { expiresIn: 900 },
    );

    return NextResponse.json({
      uploadUrl,
      publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
      key,
    });
  } catch (error) {
    console.error("Upload URL generation failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
